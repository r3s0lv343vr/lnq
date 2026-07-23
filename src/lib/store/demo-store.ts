import {
  dmThreadId,
  emailsMatch,
  extractMentions,
  isValidTopic,
  normalizeEmail,
} from '../identity';
import {
  DEFAULT_STREAMS,
  getAllSeedMessages,
  getDefaultStreams,
} from '../seed';
import type {
  DirectMessageThread,
  Message,
  Notification,
  Stream,
  UserProfile,
  UserRole,
} from '../types';

const STORAGE_KEY = 'lnq-demo-v1';
const POLL_INTERVAL_MS = 500;

type Listener = () => void;

interface DemoUserRecord extends UserProfile {
  /** Demo-only: base64-encoded password. Never use in production. */
  passwordHash: string;
}

interface DemoStoreSnapshot {
  users: Record<string, DemoUserRecord>;
  streams: Record<string, Stream>;
  streamMessages: Record<string, Record<string, Message>>;
  dmThreads: Record<string, DirectMessageThread>;
  dmMessages: Record<string, Record<string, Message>>;
  notifications: Record<string, Record<string, Notification>>;
  sessionUid: string | null;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptySnapshot(): DemoStoreSnapshot {
  return {
    users: {},
    streams: {},
    streamMessages: {},
    dmThreads: {},
    dmMessages: {},
    notifications: {},
    sessionUid: null,
  };
}

/** Demo-only password hashing via btoa. Not secure — for local demo mode only. */
function hashPasswordDemo(password: string): string {
  return btoa(password);
}

function verifyPasswordDemo(password: string, hash: string): boolean {
  return hashPasswordDemo(password) === hash;
}

function canPostToStream(user: UserProfile | null, stream: Stream): boolean {
  if (!user) return false;
  if (!stream.announcementsOnly) return true;
  return user.role === 'admin' || user.role === 'operator';
}

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export class DemoStore {
  private state: DemoStoreSnapshot;
  private listeners = new Set<Listener>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private hydrated = false;

  constructor() {
    this.state = emptySnapshot();
    this.hydrate();
  }

  private hydrate(): void {
    if (typeof window === 'undefined') {
      this.hydrated = true;
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.state = { ...emptySnapshot(), ...(JSON.parse(raw) as DemoStoreSnapshot) };
      }
    } catch {
      this.state = emptySnapshot();
    }

    this.hydrated = true;
  }

  private persist(): void {
    if (typeof window === 'undefined' || !this.hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.pollTimer && typeof window !== 'undefined') {
      this.pollTimer = setInterval(() => this.notify(), POLL_INTERVAL_MS);
    }
    listener();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    };
  }

  private toProfile(user: DemoUserRecord): UserProfile {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      photoURL: user.photoURL,
      createdAt: user.createdAt,
    };
  }

  getCurrentUser(): UserProfile | null {
    if (!this.state.sessionUid) return null;
    const user = this.state.users[this.state.sessionUid];
    if (!user) return null;
    return this.toProfile(user);
  }

  listUsers(): UserProfile[] {
    return Object.values(this.state.users).map((user) => this.toProfile(user));
  }

  getUserByEmail(email: string): UserProfile | null {
    const normalized = normalizeEmail(email);
    const user = Object.values(this.state.users).find((candidate) =>
      emailsMatch(candidate.email, normalized),
    );
    if (!user) return null;
    return this.toProfile(user);
  }

  signUp(input: {
    email: string;
    password: string;
    displayName: string;
    role?: UserRole;
  }): UserProfile {
    const email = normalizeEmail(input.email);
    if (!email || !input.password) {
      throw new Error('Email and password are required.');
    }

    const existing = Object.values(this.state.users).find((user) => emailsMatch(user.email, email));
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const uid = createId('user');
    const user: DemoUserRecord = {
      uid,
      email,
      displayName: input.displayName.trim() || email.split('@')[0],
      role: input.role ?? 'member',
      photoURL: null,
      createdAt: new Date().toISOString(),
      passwordHash: hashPasswordDemo(input.password),
    };

    this.state.users[uid] = user;
    this.state.sessionUid = uid;
    this.persist();

    return this.toProfile(user);
  }

  signIn(email: string, password: string): UserProfile {
    const normalized = normalizeEmail(email);
    const user = Object.values(this.state.users).find((candidate) =>
      emailsMatch(candidate.email, normalized),
    );

    if (!user || !verifyPasswordDemo(password, user.passwordHash)) {
      throw new Error('Invalid email or password.');
    }

    this.state.sessionUid = user.uid;
    this.persist();

    return this.toProfile(user);
  }

  signOut(): void {
    this.state.sessionUid = null;
    this.persist();
  }

  ensureSeedData(): void {
    if (Object.keys(this.state.streams).length > 0) return;

    const createdAt = new Date().toISOString();
    for (const stream of getDefaultStreams()) {
      this.state.streams[stream.id] = { ...stream, createdAt };
    }

    for (const message of getAllSeedMessages(createdAt)) {
      if (!message.streamId) continue;
      if (!this.state.streamMessages[message.streamId]) {
        this.state.streamMessages[message.streamId] = {};
      }
      this.state.streamMessages[message.streamId][message.id] = message;
    }

    this.persist();
  }

  listStreams(includeArchived = false): Stream[] {
    return Object.values(this.state.streams)
      .filter((stream) => includeArchived || !stream.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getStream(streamId: string): Stream | null {
    return this.state.streams[streamId] ?? null;
  }

  createStream(input: {
    name: string;
    description?: string;
    createdBy: string;
    announcementsOnly?: boolean;
  }): Stream {
    const name = input.name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) throw new Error('Stream name is required.');

    const duplicate = Object.values(this.state.streams).find(
      (stream) => stream.name === name && !stream.archived,
    );
    if (duplicate) throw new Error('A stream with this name already exists.');

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

    this.state.streams[stream.id] = stream;
    this.state.streamMessages[stream.id] = {};
    this.persist();
    return stream;
  }

  renameStream(streamId: string, name: string): Stream {
    const stream = this.state.streams[streamId];
    if (!stream) throw new Error('Stream not found.');

    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalizedName) throw new Error('Stream name is required.');

    stream.name = normalizedName;
    this.persist();
    return stream;
  }

  archiveStream(streamId: string): Stream {
    const stream = this.state.streams[streamId];
    if (!stream) throw new Error('Stream not found.');
    stream.archived = true;
    this.persist();
    return stream;
  }

  listStreamMessages(streamId: string, topic?: string): Message[] {
    const messages = Object.values(this.state.streamMessages[streamId] ?? {});
    const filtered = topic
      ? messages.filter((message) => message.topic === topic.trim())
      : messages;
    return sortMessages(filtered);
  }

  subscribeStreamMessages(
    streamId: string,
    callback: (messages: Message[]) => void,
    topic?: string,
  ): () => void {
    return this.subscribe(() => {
      callback(this.listStreamMessages(streamId, topic));
    });
  }

  sendStreamMessage(input: {
    streamId: string;
    topic: string;
    body: string;
    author: UserProfile;
    replyTo?: string;
  }): Message {
    const stream = this.state.streams[input.streamId];
    if (!stream) throw new Error('Stream not found.');
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

    if (!this.state.streamMessages[input.streamId]) {
      this.state.streamMessages[input.streamId] = {};
    }
    this.state.streamMessages[input.streamId][message.id] = message;

    const topics = new Set(
      Object.values(this.state.streamMessages[input.streamId]).map((item) => item.topic),
    );
    stream.topicCount = topics.size;

    this.writeMentionNotifications(message, input.streamId, topic);
    this.persist();
    return message;
  }

  listDmThreadsForUser(userEmail: string): DirectMessageThread[] {
    const normalized = normalizeEmail(userEmail);
    return Object.values(this.state.dmThreads)
      .filter((thread) => thread.memberEmails.includes(normalized))
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );
  }

  subscribeDms(userEmail: string, callback: (threads: DirectMessageThread[]) => void): () => void {
    return this.subscribe(() => {
      callback(this.listDmThreadsForUser(userEmail));
    });
  }

  ensureDm(emailA: string, emailB: string): DirectMessageThread {
    const id = dmThreadId(emailA, emailB);
    const existing = this.state.dmThreads[id];
    if (existing) return existing;

    const userA = this.getUserByEmail(emailA);
    const userB = this.getUserByEmail(emailB);
    if (!userA || !userB) {
      throw new Error('Both users must exist to start a direct message.');
    }

    const sortedEmails = [normalizeEmail(emailA), normalizeEmail(emailB)].sort() as [
      string,
      string,
    ];
    const sortedIds = sortedEmails[0] === normalizeEmail(userA.email)
      ? ([userA.uid, userB.uid] as [string, string])
      : ([userB.uid, userA.uid] as [string, string]);

    const thread: DirectMessageThread = {
      id,
      memberEmails: sortedEmails,
      memberIds: sortedIds,
      lastMessageAt: new Date().toISOString(),
    };

    this.state.dmThreads[id] = thread;
    this.state.dmMessages[id] = this.state.dmMessages[id] ?? {};
    this.persist();
    return thread;
  }

  listDmMessages(dmId: string): Message[] {
    return sortMessages(Object.values(this.state.dmMessages[dmId] ?? {}));
  }

  subscribeDmMessages(dmId: string, callback: (messages: Message[]) => void): () => void {
    return this.subscribe(() => {
      callback(this.listDmMessages(dmId));
    });
  }

  sendDm(input: { dmId: string; body: string; author: UserProfile }): Message {
    const thread = this.state.dmThreads[input.dmId];
    if (!thread) throw new Error('Direct message thread not found.');
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

    if (!this.state.dmMessages[input.dmId]) {
      this.state.dmMessages[input.dmId] = {};
    }
    this.state.dmMessages[input.dmId][message.id] = message;
    thread.lastMessageAt = message.createdAt;

    const recipientUid = thread.memberIds.find((uid) => uid !== input.author.uid);
    if (recipientUid) {
      this.addNotification({
        userId: recipientUid,
        type: 'dm',
        title: `Message from ${input.author.displayName}`,
        body: message.body.slice(0, 140),
        href: `/dm/${input.dmId}`,
      });
    }

    this.writeMentionNotifications(message, null, '', input.dmId);
    this.persist();
    return message;
  }

  listNotifications(userId: string): Notification[] {
    return Object.values(this.state.notifications[userId] ?? {}).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  subscribeNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
  ): () => void {
    return this.subscribe(() => {
      callback(this.listNotifications(userId));
    });
  }

  markNotificationRead(userId: string, notificationId: string): void {
    const notification = this.state.notifications[userId]?.[notificationId];
    if (!notification) return;
    notification.read = true;
    this.persist();
  }

  searchMessages(query: string, userEmail: string): Message[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const user = this.getUserByEmail(userEmail);
    if (!user) return [];

    const accessibleStreamIds = new Set(
      this.listStreams(true).map((stream) => stream.id),
    );
    const accessibleDmIds = new Set(
      this.listDmThreadsForUser(userEmail).map((thread) => thread.id),
    );

    const streamHits = Object.entries(this.state.streamMessages).flatMap(
      ([streamId, messages]) =>
        accessibleStreamIds.has(streamId)
          ? Object.values(messages).filter((message) =>
              message.body.toLowerCase().includes(normalizedQuery),
            )
          : [],
    );

    const dmHits = Object.entries(this.state.dmMessages).flatMap(([dmId, messages]) =>
      accessibleDmIds.has(dmId)
        ? Object.values(messages).filter((message) =>
            message.body.toLowerCase().includes(normalizedQuery),
          )
        : [],
    );

    return sortMessages([...streamHits, ...dmHits]);
  }

  private addNotification(input: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const notification: Notification = {
      id: createId('notif'),
      read: false,
      createdAt: new Date().toISOString(),
      ...input,
    };

    if (!this.state.notifications[input.userId]) {
      this.state.notifications[input.userId] = {};
    }
    this.state.notifications[input.userId][notification.id] = notification;
    return notification;
  }

  private writeMentionNotifications(
    message: Message,
    streamId: string | null,
    topic: string,
    dmId?: string,
  ): void {
    const mentions = extractMentions(message.body);
    if (mentions.length === 0) return;

    for (const mention of mentions) {
      const mentionedUser = this.listUsers().find(
        (user) =>
          emailsMatch(user.email, mention) ||
          user.displayName.toLowerCase() === mention.toLowerCase(),
      );

      if (!mentionedUser || mentionedUser.uid === message.authorId) continue;

      const href = dmId
        ? `/dm/${dmId}`
        : streamId
          ? `/stream/${streamId}?topic=${encodeURIComponent(topic)}`
          : undefined;

      this.addNotification({
        userId: mentionedUser.uid,
        type: 'mention',
        title: `${message.authorName} mentioned you`,
        body: message.body.slice(0, 140),
        href,
      });
    }
  }

  resetForTests(): void {
    this.state = emptySnapshot();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    this.persist();
  }
}

export const demoStore = new DemoStore();

export { DEFAULT_STREAMS };
