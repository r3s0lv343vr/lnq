import type { Message, Stream } from './types';

export const SEED_SYSTEM_USER = {
  uid: 'system',
  email: 'system@lnq.local',
  displayName: 'Lnq',
} as const;

export interface SeedStream extends Stream {
  seedTopic: string;
  seedMessage: Omit<Message, 'id' | 'streamId' | 'dmId' | 'createdAt'>;
}

export const DEFAULT_STREAMS: SeedStream[] = [
  {
    id: 'general',
    name: 'general',
    description: 'General cohort discussion',
    archived: false,
    announcementsOnly: false,
    createdBy: SEED_SYSTEM_USER.uid,
    createdAt: '2026-01-01T00:00:00.000Z',
    topicCount: 1,
    seedTopic: 'welcome',
    seedMessage: {
      topic: 'welcome',
      body: 'Welcome to Lnq! This is your async-first home for cohort conversations. Pick a topic in each stream to keep discussions organized.',
      authorId: SEED_SYSTEM_USER.uid,
      authorEmail: SEED_SYSTEM_USER.email,
      authorName: SEED_SYSTEM_USER.displayName,
      reactions: {},
    },
  },
  {
    id: 'announcements',
    name: 'announcements',
    description: 'Official program announcements (admins and operators only)',
    archived: false,
    announcementsOnly: true,
    createdBy: SEED_SYSTEM_USER.uid,
    createdAt: '2026-01-01T00:00:00.000Z',
    topicCount: 1,
    seedTopic: 'program',
    seedMessage: {
      topic: 'program',
      body: 'Program updates and important announcements will be posted here. Only admins and operators can send messages in this stream.',
      authorId: SEED_SYSTEM_USER.uid,
      authorEmail: SEED_SYSTEM_USER.email,
      authorName: SEED_SYSTEM_USER.displayName,
      reactions: {},
    },
  },
  {
    id: 'reviews',
    name: 'reviews',
    description: 'Share feedback, reviews, and retrospectives',
    archived: false,
    announcementsOnly: false,
    createdBy: SEED_SYSTEM_USER.uid,
    createdAt: '2026-01-01T00:00:00.000Z',
    seedTopic: 'welcome',
    seedMessage: {
      topic: 'welcome',
      body: 'Use this stream for reviews, demos, and constructive feedback.',
      authorId: SEED_SYSTEM_USER.uid,
      authorEmail: SEED_SYSTEM_USER.email,
      authorName: SEED_SYSTEM_USER.displayName,
      reactions: {},
    },
  },
  {
    id: 'setup',
    name: 'setup',
    description: 'Onboarding, tooling, and environment setup',
    archived: false,
    announcementsOnly: false,
    createdBy: SEED_SYSTEM_USER.uid,
    createdAt: '2026-01-01T00:00:00.000Z',
    seedTopic: 'welcome',
    seedMessage: {
      topic: 'welcome',
      body: 'Ask setup questions here — accounts, repos, local dev, and cohort tooling.',
      authorId: SEED_SYSTEM_USER.uid,
      authorEmail: SEED_SYSTEM_USER.email,
      authorName: SEED_SYSTEM_USER.displayName,
      reactions: {},
    },
  },
];

export function getDefaultStreams(): Stream[] {
  return DEFAULT_STREAMS.map((stream) => ({
    id: stream.id,
    name: stream.name,
    description: stream.description,
    archived: stream.archived,
    announcementsOnly: stream.announcementsOnly,
    createdBy: stream.createdBy,
    createdAt: stream.createdAt,
  }));
}

export function getSeedMessagesForStream(streamId: string, createdAt = new Date().toISOString()): Message[] {
  const seed = DEFAULT_STREAMS.find((stream) => stream.id === streamId);
  if (!seed) return [];

  return [
    {
      id: `${streamId}-${seed.seedTopic}-welcome`,
      streamId,
      dmId: null,
      createdAt,
      ...seed.seedMessage,
    },
  ];
}

export function getAllSeedMessages(createdAt = new Date().toISOString()): Message[] {
  return DEFAULT_STREAMS.flatMap((stream) => getSeedMessagesForStream(stream.id, createdAt));
}
