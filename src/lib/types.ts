export type UserRole = 'member' | 'admin' | 'operator';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL: string | null;
  createdAt: string;
}

export interface Stream {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  announcementsOnly: boolean;
  createdBy: string;
  createdAt: string;
  topicCount?: number;
}

export interface TopicRef {
  streamId: string;
  topic: string;
  lastMessageAt?: string;
  messageCount?: number;
}

export interface Message {
  id: string;
  streamId: string | null;
  dmId: string | null;
  topic: string;
  body: string;
  authorId: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  editedAt?: string;
  reactions: Record<string, string[]>;
  replyTo?: string;
}

export interface DirectMessageThread {
  id: string;
  /** Sorted normalized email pair used as the deterministic thread key. */
  memberEmails: [string, string];
  memberIds: [string, string];
  lastMessageAt: string;
}

export type NotificationType = 'mention' | 'dm' | 'forth' | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

export interface ForthUnfurl {
  url: string;
  title: string;
  subtitle?: string;
  status?: string;
}
