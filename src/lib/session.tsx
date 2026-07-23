'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { DEMO_ACCOUNT, demoStore } from '@/lib/store/demo-store';
import { getFirebaseServices, hasFirebaseConfig } from '@/lib/firebase/config';
import {
  archiveStream as firebaseArchiveStream,
  createStream as firebaseCreateStream,
  ensureDm as firebaseEnsureDm,
  ensureProfile,
  listStreams as firebaseListStreams,
  markNotificationRead as firebaseMarkNotificationRead,
  renameStream as firebaseRenameStream,
  searchMessages as firebaseSearchMessages,
  seedDefaultsIfEmpty,
  sendDm as firebaseSendDm,
  sendStreamMessage as firebaseSendStreamMessage,
  subscribeDmMessages,
  subscribeDms,
  subscribeNotifications,
  subscribeStreamMessages,
} from '@/lib/store/firebase-store';
import type {
  DirectMessageThread,
  Message,
  Notification,
  Stream,
  UserProfile,
} from '@/lib/types';

export type AuthMode = 'demo' | 'firebase';

interface SessionContextValue {
  user: UserProfile | null;
  loading: boolean;
  mode: AuthMode | null;
  hasFirebase: boolean;
  showAuth: boolean;
  setShowAuth: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  exploreDemo: () => Promise<void>;
  // Store operations
  streams: Stream[];
  listTopics: (streamId: string) => string[];
  subscribeMessages: (
    streamId: string,
    topic: string | undefined,
    callback: (messages: Message[]) => void,
  ) => () => void;
  sendStreamMessage: (input: {
    streamId: string;
    topic: string;
    body: string;
    replyTo?: string;
  }) => Promise<void>;
  createStream: (input: { name: string; description?: string; announcementsOnly?: boolean }) => Promise<void>;
  renameStream: (streamId: string, name: string) => Promise<void>;
  archiveStream: (streamId: string) => Promise<void>;
  dmThreads: DirectMessageThread[];
  subscribeDmMessages: (dmId: string, callback: (messages: Message[]) => void) => () => void;
  ensureDm: (email: string) => Promise<DirectMessageThread>;
  sendDm: (dmId: string, body: string) => Promise<void>;
  notifications: Notification[];
  markNotificationRead: (notificationId: string) => Promise<void>;
  searchMessages: (query: string) => Promise<Message[]>;
  listUsers: () => UserProfile[];
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [dmThreads, setDmThreads] = useState<DirectMessageThread[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshDemoUser = useCallback(() => {
    setUser(demoStore.getCurrentUser());
  }, []);

  useEffect(() => {
    if (hasFirebaseConfig) {
      const services = getFirebaseServices();
      if (!services) {
        setLoading(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(services.auth, async (firebaseUser) => {
        if (firebaseUser?.email) {
          try {
            const profile = await ensureProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName ?? undefined,
              photoURL: firebaseUser.photoURL,
            });
            await seedDefaultsIfEmpty();
            setUser(profile);
            setMode('firebase');
          } catch {
            setUser(null);
            setMode(null);
          }
        } else {
          setUser(null);
          setMode(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    }

    refreshDemoUser();
    const storedMode = typeof window !== 'undefined' ? localStorage.getItem('lnq-auth-mode') : null;
    if (storedMode === 'demo' && demoStore.getCurrentUser()) {
      setMode('demo');
      demoStore.ensureSeedData();
    }
    setLoading(false);

    const unsub = demoStore.subscribe(() => {
      refreshDemoUser();
    });

    return unsub;
  }, [refreshDemoUser]);

  useEffect(() => {
    if (!user) {
      setStreams([]);
      setDmThreads([]);
      setNotifications([]);
      return;
    }

    if (mode === 'demo') {
      const refresh = () => {
        setStreams(demoStore.listStreams());
        setDmThreads(demoStore.listDmThreadsForUser(user.email));
        setNotifications(demoStore.listNotifications(user.uid));
      };
      refresh();
      return demoStore.subscribe(refresh);
    }

    if (mode === 'firebase') {
      let cancelled = false;

      firebaseListStreams().then((result) => {
        if (!cancelled) setStreams(result);
      });

      const unsubDms = subscribeDms(user.email, (threads) => {
        if (!cancelled) setDmThreads(threads);
      });

      const unsubNotifs = subscribeNotifications(user.uid, (items) => {
        if (!cancelled) setNotifications(items);
      });

      const interval = setInterval(() => {
        firebaseListStreams().then((result) => {
          if (!cancelled) setStreams(result);
        });
      }, 5000);

      return () => {
        cancelled = true;
        unsubDms();
        unsubNotifs();
        clearInterval(interval);
      };
    }
  }, [user, mode]);

  const signIn = async (email: string, password: string) => {
    if (hasFirebaseConfig) {
      const services = getFirebaseServices();
      if (!services) throw new Error('Firebase is not configured.');
      await signInWithEmailAndPassword(services.auth, email, password);
      setMode('firebase');
      return;
    }

    demoStore.signIn(email, password);
    demoStore.ensureSeedData();
    setMode('demo');
    localStorage.setItem('lnq-auth-mode', 'demo');
    refreshDemoUser();
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (hasFirebaseConfig) {
      const services = getFirebaseServices();
      if (!services) throw new Error('Firebase is not configured.');
      const cred = await createUserWithEmailAndPassword(services.auth, email, password);
      await ensureProfile({
        uid: cred.user.uid,
        email: cred.user.email ?? email,
        displayName,
      });
      await seedDefaultsIfEmpty();
      setMode('firebase');
      return;
    }

    demoStore.signUp({ email, password, displayName });
    demoStore.ensureSeedData();
    setMode('demo');
    localStorage.setItem('lnq-auth-mode', 'demo');
    refreshDemoUser();
  };

  const signInGoogle = async () => {
    const services = getFirebaseServices();
    if (!services) throw new Error('Google sign-in requires Firebase configuration.');
    await signInWithPopup(services.auth, new GoogleAuthProvider());
    setMode('firebase');
  };

  const signInGithub = async () => {
    const services = getFirebaseServices();
    if (!services) throw new Error('GitHub sign-in requires Firebase configuration.');
    await signInWithPopup(services.auth, new GithubAuthProvider());
    setMode('firebase');
  };

  const signOut = async () => {
    if (mode === 'firebase') {
      const services = getFirebaseServices();
      if (services) await firebaseSignOut(services.auth);
    } else {
      demoStore.signOut();
      localStorage.removeItem('lnq-auth-mode');
    }
    setUser(null);
    setMode(null);
    setShowAuth(false);
  };

  const exploreDemo = async () => {
    demoStore.ensureSeedData();
    demoStore.ensureDemoAccount();
    setMode('demo');
    localStorage.setItem('lnq-auth-mode', 'demo');
    refreshDemoUser();
    setShowAuth(false);
  };

  const listTopics = (streamId: string): string[] => {
    if (mode === 'demo') {
      const messages = demoStore.listStreamMessages(streamId);
      const topics = new Set(messages.map((m) => m.topic));
      return [...topics].sort();
    }
    return [];
  };

  const subscribeMessages = (
    streamId: string,
    topic: string | undefined,
    callback: (messages: Message[]) => void,
  ) => {
    if (mode === 'demo') {
      return demoStore.subscribeStreamMessages(streamId, callback, topic);
    }
    if (mode === 'firebase') {
      return subscribeStreamMessages(streamId, callback, topic);
    }
    return () => {};
  };

  const sendStreamMessage = async (input: {
    streamId: string;
    topic: string;
    body: string;
    replyTo?: string;
  }) => {
    if (!user) throw new Error('Not signed in.');
    if (mode === 'demo') {
      demoStore.sendStreamMessage({ ...input, author: user });
      return;
    }
    if (mode === 'firebase') {
      await firebaseSendStreamMessage({ ...input, author: user });
    }
  };

  const createStream = async (input: {
    name: string;
    description?: string;
    announcementsOnly?: boolean;
  }) => {
    if (!user) throw new Error('Not signed in.');
    if (mode === 'demo') {
      demoStore.createStream({ ...input, createdBy: user.uid });
      return;
    }
    if (mode === 'firebase') {
      await firebaseCreateStream({ ...input, createdBy: user.uid });
      const updated = await firebaseListStreams();
      setStreams(updated);
    }
  };

  const renameStream = async (streamId: string, name: string) => {
    if (mode === 'demo') {
      demoStore.renameStream(streamId, name);
      return;
    }
    if (mode === 'firebase') {
      await firebaseRenameStream(streamId, name);
      const updated = await firebaseListStreams();
      setStreams(updated);
    }
  };

  const archiveStream = async (streamId: string) => {
    if (mode === 'demo') {
      demoStore.archiveStream(streamId);
      return;
    }
    if (mode === 'firebase') {
      await firebaseArchiveStream(streamId);
      const updated = await firebaseListStreams();
      setStreams(updated);
    }
  };

  const subscribeDmMessagesFn = (dmId: string, callback: (messages: Message[]) => void) => {
    if (mode === 'demo') {
      return demoStore.subscribeDmMessages(dmId, callback);
    }
    if (mode === 'firebase') {
      return subscribeDmMessages(dmId, callback);
    }
    return () => {};
  };

  const ensureDm = async (email: string): Promise<DirectMessageThread> => {
    if (!user) throw new Error('Not signed in.');
    if (mode === 'demo') {
      return demoStore.ensureDm(user.email, email);
    }
    if (mode === 'firebase') {
      return firebaseEnsureDm(user.email, email);
    }
    throw new Error('No store mode active.');
  };

  const sendDm = async (dmId: string, body: string) => {
    if (!user) throw new Error('Not signed in.');
    if (mode === 'demo') {
      demoStore.sendDm({ dmId, body, author: user });
      return;
    }
    if (mode === 'firebase') {
      await firebaseSendDm({ dmId, body, author: user });
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!user) return;
    if (mode === 'demo') {
      demoStore.markNotificationRead(user.uid, notificationId);
      return;
    }
    if (mode === 'firebase') {
      await firebaseMarkNotificationRead(user.uid, notificationId);
    }
  };

  const searchMessages = async (query: string): Promise<Message[]> => {
    if (!user) return [];
    if (mode === 'demo') {
      return demoStore.searchMessages(query, user.email);
    }
    if (mode === 'firebase') {
      return firebaseSearchMessages(query, user.email);
    }
    return [];
  };

  const listUsers = (): UserProfile[] => {
    if (mode === 'demo') {
      return demoStore.listUsers();
    }
    return [];
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        loading,
        mode,
        hasFirebase: hasFirebaseConfig,
        showAuth,
        setShowAuth,
        signIn,
        signUp,
        signInGoogle,
        signInGithub,
        signOut,
        exploreDemo,
        streams,
        listTopics,
        subscribeMessages,
        sendStreamMessage,
        createStream,
        renameStream,
        archiveStream,
        dmThreads,
        subscribeDmMessages: subscribeDmMessagesFn,
        ensureDm,
        sendDm,
        notifications,
        markNotificationRead,
        searchMessages,
        listUsers,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
