import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices } from '../firebase/config';
import {
  dmThreadId,
  emailsMatch,
  extractMentions,
  isValidTopic,
  normalizeEmail,
} from '../identity';
import { getAllSeedMessages, getDefaultStreams } from '../seed';
import type {
  DirectMessageThread,
  Message,
  Notification,
  Stream,
  UserProfile,
  UserRole,
} from '../types';

function requireDb() {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase is not configured.');
  }
  return services.db;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function canPostToStream(user: Pick<UserProfile, 'role'> | null, stream: Stream): boolean {
  if (!user) return false;
  if (!stream.announcementsOnly) return true;
  return user.role === 'admin' || user.role === 'operator';
}

export async function ensureProfile(input: {
  uid: string;
  email: string;
  displayName?: string;
  role?: UserRole;
  photoURL?: string | null;
}): Promise<UserProfile> {
  const db = requireDb();
  const email = normalizeEmail(input.email);
  const ref = doc(db, 'profiles', input.uid);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as UserProfile;
    return data;
  }

  const profile: UserProfile = {
    uid: input.uid,
    email,
    displayName: input.displayName?.trim() || email.split('@')[0],
    role: input.role ?? 'member',
    photoURL: input.photoURL ?? null,
    createdAt: new Date().toISOString(),
  };

  await setDoc(ref, profile);
  return profile;
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const db = requireDb();
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function getProfileByEmail(email: string): Promise<UserProfile | null> {
  const db = requireDb();
  const normalized = normalizeEmail(email);
  const snap = await getDocs(
    query(collection(db, 'profiles'), where('email', '==', normalized)),
  );
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

export async function listStreams(includeArchived = false): Promise<Stream[]> {
  const db = requireDb();
  const snap = await getDocs(collection(db, 'streams'));
  return snap.docs
    .map((document) => document.data() as Stream)
    .filter((stream) => includeArchived || !stream.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createStream(input: {
  name: string;
  description?: string;
  createdBy: string;
  announcementsOnly?: boolean;
}): Promise<Stream> {
  const db = requireDb();
  const name = input.name.trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) throw new Error('Stream name is required.');

  const stream: Stream = {
    id: createId('stream'),
    name,
    description: input.description?.trim() ?? '',
    archived: false,
    announcementsOnly: input.announcementsOnly ?? false,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    topicCount: 0,
  };

  await setDoc(doc(db, 'streams', stream.id), stream);
  return stream;
}

export async function renameStream(streamId: string, name: string): Promise<Stream> {
  const db = requireDb();
  const ref = doc(db, 'streams', streamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Stream not found.');

  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');
  if (!normalizedName) throw new Error('Stream name is required.');

  await updateDoc(ref, { name: normalizedName });
  return { ...(snap.data() as Stream), name: normalizedName };
}

export async function archiveStream(streamId: string): Promise<Stream> {
  const db = requireDb();
  const ref = doc(db, 'streams', streamId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Stream not found.');

  await updateDoc(ref, { archived: true });
  return { ...(snap.data() as Stream), archived: true };
}

export function subscribeStreamMessages(
  streamId: string,
  callback: (messages: Message[]) => void,
  topic?: string,
): Unsubscribe {
  const db = requireDb();
  const messagesRef = collection(db, 'streams', streamId, 'messages');
  const q = topic
    ? query(messagesRef, where('topic', '==', topic.trim()), orderBy('createdAt', 'asc'))
    : query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((document) => document.data() as Message);
    callback(messages);
  });
}

async function writeMentionNotifications(
  message: Message,
  context: { streamId?: string; topic?: string; dmId?: string },
): Promise<void> {
  const db = requireDb();
  const mentions = extractMentions(message.body);
  if (mentions.length === 0) return;

  const profilesSnap = await getDocs(collection(db, 'profiles'));
  const profiles = profilesSnap.docs.map((document) => document.data() as UserProfile);

  for (const mention of mentions) {
    const mentionedUser = profiles.find(
      (user) =>
        emailsMatch(user.email, mention) ||
        user.displayName.toLowerCase() === mention.toLowerCase(),
    );

    if (!mentionedUser || mentionedUser.uid === message.authorId) continue;

    const href = context.dmId
      ? `/dm/${context.dmId}`
      : context.streamId
        ? `/stream/${context.streamId}?topic=${encodeURIComponent(context.topic ?? '')}`
        : undefined;

    const notification: Notification = {
      id: createId('notif'),
      userId: mentionedUser.uid,
      type: 'mention',
      title: `${message.authorName} mentioned you`,
      body: message.body.slice(0, 140),
      href,
      read: false,
      createdAt: new Date().toISOString(),
    };

    await setDoc(
      doc(db, 'notifications', mentionedUser.uid, 'items', notification.id),
      notification,
    );
  }
}

async function writeDmNotification(
  recipientUid: string,
  author: UserProfile,
  message: Message,
  dmId: string,
): Promise<void> {
  const db = requireDb();
  const notification: Notification = {
    id: createId('notif'),
    userId: recipientUid,
    type: 'dm',
    title: `Message from ${author.displayName}`,
    body: message.body.slice(0, 140),
    href: `/dm/${dmId}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'notifications', recipientUid, 'items', notification.id), notification);
}

export async function sendStreamMessage(input: {
  streamId: string;
  topic: string;
  body: string;
  author: UserProfile;
  replyTo?: string;
}): Promise<Message> {
  const db = requireDb();
  const streamSnap = await getDoc(doc(db, 'streams', input.streamId));
  if (!streamSnap.exists()) throw new Error('Stream not found.');

  const stream = streamSnap.data() as Stream;
  if (!canPostToStream(input.author, stream)) {
    throw new Error('You do not have permission to post in this stream.');
  }

  const topic = input.topic.trim();
  if (!isValidTopic(topic)) {
    throw new Error('Topic must be 1-60 characters.');
  }

  const message: Message = {
    id: createId('msg'),
    streamId: input.streamId,
    dmId: null,
    topic,
    body: input.body.trim(),
    authorId: input.author.uid,
    authorEmail: normalizeEmail(input.author.email),
    authorName: input.author.displayName,
    createdAt: new Date().toISOString(),
    reactions: {},
    replyTo: input.replyTo,
  };

  await setDoc(doc(db, 'streams', input.streamId, 'messages', message.id), message);

  const messagesSnap = await getDocs(collection(db, 'streams', input.streamId, 'messages'));
  const topics = new Set(messagesSnap.docs.map((document) => (document.data() as Message).topic));
  await updateDoc(doc(db, 'streams', input.streamId), { topicCount: topics.size });

  await writeMentionNotifications(message, { streamId: input.streamId, topic });
  return message;
}

export function subscribeDms(
  userEmail: string,
  callback: (threads: DirectMessageThread[]) => void,
): Unsubscribe {
  const db = requireDb();
  const normalized = normalizeEmail(userEmail);
  const q = query(
    collection(db, 'dms'),
    where('memberEmails', 'array-contains', normalized),
    orderBy('lastMessageAt', 'desc'),
  );

  return onSnapshot(q, (snapshot) => {
    const threads = snapshot.docs.map((document) => document.data() as DirectMessageThread);
    callback(threads);
  });
}

export function subscribeDmMessages(
  dmId: string,
  callback: (messages: Message[]) => void,
): Unsubscribe {
  const db = requireDb();
  const q = query(
    collection(db, 'dms', dmId, 'messages'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((document) => document.data() as Message);
    callback(messages);
  });
}

export async function ensureDm(emailA: string, emailB: string): Promise<DirectMessageThread> {
  const db = requireDb();
  const id = dmThreadId(emailA, emailB);
  const ref = doc(db, 'dms', id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return existing.data() as DirectMessageThread;
  }

  const userA = await getProfileByEmail(emailA);
  const userB = await getProfileByEmail(emailB);
  if (!userA || !userB) {
    throw new Error('Both users must exist to start a direct message.');
  }

  const sortedEmails = [normalizeEmail(emailA), normalizeEmail(emailB)].sort() as [string, string];
  const sortedIds = sortedEmails[0] === normalizeEmail(userA.email)
    ? ([userA.uid, userB.uid] as [string, string])
    : ([userB.uid, userA.uid] as [string, string]);

  const thread: DirectMessageThread = {
    id,
    memberEmails: sortedEmails,
    memberIds: sortedIds,
    lastMessageAt: new Date().toISOString(),
  };

  await setDoc(ref, thread);
  return thread;
}

export async function sendDm(input: {
  dmId: string;
  body: string;
  author: UserProfile;
}): Promise<Message> {
  const db = requireDb();
  const threadRef = doc(db, 'dms', input.dmId);
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) throw new Error('Direct message thread not found.');

  const thread = threadSnap.data() as DirectMessageThread;
  if (!thread.memberIds.includes(input.author.uid)) {
    throw new Error('You are not a member of this direct message thread.');
  }

  const message: Message = {
    id: createId('msg'),
    streamId: null,
    dmId: input.dmId,
    topic: '',
    body: input.body.trim(),
    authorId: input.author.uid,
    authorEmail: normalizeEmail(input.author.email),
    authorName: input.author.displayName,
    createdAt: new Date().toISOString(),
    reactions: {},
  };

  await setDoc(doc(db, 'dms', input.dmId, 'messages', message.id), message);
  await updateDoc(threadRef, { lastMessageAt: message.createdAt });

  const recipientUid = thread.memberIds.find((uid) => uid !== input.author.uid);
  if (recipientUid) {
    await writeDmNotification(recipientUid, input.author, message, input.dmId);
  }

  await writeMentionNotifications(message, { dmId: input.dmId });
  return message;
}

export function subscribeNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
): Unsubscribe {
  const db = requireDb();
  const q = query(
    collection(db, 'notifications', userId, 'items'),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((document) => document.data() as Notification);
    callback(notifications);
  });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'notifications', userId, 'items', notificationId);
  await updateDoc(ref, { read: true });
}

export async function searchMessages(queryText: string, userEmail: string): Promise<Message[]> {
  const db = requireDb();
  const normalizedQuery = queryText.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const user = await getProfileByEmail(userEmail);
  if (!user) return [];

  const streams = await listStreams(true);
  const streamHits: Message[] = [];

  for (const stream of streams) {
    const snap = await getDocs(collection(db, 'streams', stream.id, 'messages'));
    for (const document of snap.docs) {
      const message = document.data() as Message;
      if (message.body.toLowerCase().includes(normalizedQuery)) {
        streamHits.push(message);
      }
    }
  }

  const normalized = normalizeEmail(userEmail);
  const dmSnap = await getDocs(
    query(collection(db, 'dms'), where('memberEmails', 'array-contains', normalized)),
  );

  const dmHits: Message[] = [];
  for (const dmDoc of dmSnap.docs) {
    const messagesSnap = await getDocs(collection(db, 'dms', dmDoc.id, 'messages'));
    for (const document of messagesSnap.docs) {
      const message = document.data() as Message;
      if (message.body.toLowerCase().includes(normalizedQuery)) {
        dmHits.push(message);
      }
    }
  }

  return [...streamHits, ...dmHits].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function seedDefaultsIfEmpty(): Promise<void> {
  const db = requireDb();
  const streamsSnap = await getDocs(collection(db, 'streams'));
  if (!streamsSnap.empty) return;

  const createdAt = new Date().toISOString();

  for (const stream of getDefaultStreams()) {
    await setDoc(doc(db, 'streams', stream.id), { ...stream, createdAt });
  }

  for (const message of getAllSeedMessages(createdAt)) {
    if (!message.streamId) continue;
    await setDoc(doc(db, 'streams', message.streamId, 'messages', message.id), message);
  }
}
