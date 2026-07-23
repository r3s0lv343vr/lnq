import { describe, expect, it } from 'vitest';
import {
  dmThreadId,
  emailsMatch,
  extractMentions,
  FORTH_PRODUCTION_URL,
  isForthUrl,
  isValidTopic,
  normalizeEmail,
  parseForthDeepLink,
} from './identity';

describe('normalizeEmail', () => {
  it('lowercases and trims email', () => {
    expect(normalizeEmail('  Alice@Example.COM  ')).toBe('alice@example.com');
  });
});

describe('emailsMatch', () => {
  it('matches case-insensitively', () => {
    expect(emailsMatch('Alice@Example.com', 'alice@example.com')).toBe(true);
    expect(emailsMatch('alice@example.com', 'bob@example.com')).toBe(false);
  });
});

describe('dmThreadId', () => {
  it('returns a deterministic sorted pair key', () => {
    expect(dmThreadId('bob@example.com', 'alice@example.com')).toBe(
      'alice@example.com__bob@example.com',
    );
    expect(dmThreadId('alice@example.com', 'bob@example.com')).toBe(
      'alice@example.com__bob@example.com',
    );
  });
});

describe('isValidTopic', () => {
  it('accepts trimmed topics between 1 and 60 characters', () => {
    expect(isValidTopic('welcome')).toBe(true);
    expect(isValidTopic('  program  ')).toBe(true);
    expect(isValidTopic('a'.repeat(60))).toBe(true);
  });

  it('rejects empty or overly long topics', () => {
    expect(isValidTopic('')).toBe(false);
    expect(isValidTopic('   ')).toBe(false);
    expect(isValidTopic('a'.repeat(61))).toBe(false);
  });
});

describe('extractMentions', () => {
  it('extracts email, quoted display name, and handle mentions', () => {
    const body =
      'Hey @alice@example.com and @"Alice Smith" plus @alice — ping @bob@example.com';
    expect(extractMentions(body).sort()).toEqual(
      ['Alice Smith', 'alice', 'alice@example.com', 'bob@example.com'].sort(),
    );
  });

  it('deduplicates repeated mentions', () => {
    expect(extractMentions('@alice @alice')).toEqual(['alice']);
  });
});

describe('Forth URL helpers', () => {
  it('detects production Forth URLs', () => {
    expect(isForthUrl(`${FORTH_PRODUCTION_URL}/workspace/abc`)).toBe(true);
    expect(isForthUrl('https://example.com/task/1')).toBe(false);
  });

  it('parses deep links by kind', () => {
    expect(parseForthDeepLink(`${FORTH_PRODUCTION_URL}/`)).toEqual({
      kind: 'home',
      path: '/',
    });
    expect(parseForthDeepLink(`${FORTH_PRODUCTION_URL}/workspace/cohort-1`)).toEqual({
      kind: 'workspace',
      path: '/workspace/cohort-1',
    });
    expect(parseForthDeepLink(`${FORTH_PRODUCTION_URL}/task/task-42`)).toEqual({
      kind: 'task',
      path: '/task/task-42',
    });
    expect(parseForthDeepLink('https://example.com/task/1')).toBeNull();
  });
});
