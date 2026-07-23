import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STREAMS,
  getAllSeedMessages,
  getDefaultStreams,
  getSeedMessagesForStream,
  SEED_SYSTEM_USER,
} from './seed';

describe('DEFAULT_STREAMS', () => {
  it('includes cohort migration streams', () => {
    const names = DEFAULT_STREAMS.map((stream) => stream.name);
    expect(names).toEqual(['general', 'announcements', 'reviews', 'setup']);
  });

  it('marks announcements as announcementsOnly', () => {
    const announcements = DEFAULT_STREAMS.find((stream) => stream.id === 'announcements');
    expect(announcements?.announcementsOnly).toBe(true);
    expect(announcements?.seedTopic).toBe('program');
  });

  it('seeds welcome topic for general', () => {
    const general = DEFAULT_STREAMS.find((stream) => stream.id === 'general');
    expect(general?.seedTopic).toBe('welcome');
    expect(general?.seedMessage.body).toMatch(/Welcome to Lnq/i);
  });
});

describe('getDefaultStreams', () => {
  it('strips seed-only fields', () => {
    const streams = getDefaultStreams();
    for (const stream of streams) {
      expect(stream).not.toHaveProperty('seedTopic');
      expect(stream).not.toHaveProperty('seedMessage');
    }
    expect(streams).toHaveLength(4);
  });
});

describe('seed messages', () => {
  it('creates welcome messages for general and announcements', () => {
    const generalMessages = getSeedMessagesForStream('general');
    const announcementMessages = getSeedMessagesForStream('announcements');

    expect(generalMessages).toHaveLength(1);
    expect(generalMessages[0].topic).toBe('welcome');
    expect(generalMessages[0].streamId).toBe('general');

    expect(announcementMessages).toHaveLength(1);
    expect(announcementMessages[0].topic).toBe('program');
    expect(announcementMessages[0].streamId).toBe('announcements');
  });

  it('attributes seed messages to the system user', () => {
    const messages = getAllSeedMessages();
    expect(messages.length).toBeGreaterThanOrEqual(2);
    for (const message of messages) {
      expect(message.authorId).toBe(SEED_SYSTEM_USER.uid);
      expect(message.authorEmail).toBe(SEED_SYSTEM_USER.email);
    }
  });
});
