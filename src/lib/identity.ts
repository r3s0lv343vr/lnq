export const FORTH_PRODUCTION_URL = 'https://forth-bice.vercel.app';

/** Lowercase and trim; identity key for Lnq and Forth PM platform alignment. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}

/** Deterministic DM thread id from a sorted normalized email pair. */
export function dmThreadId(emailA: string, emailB: string): string {
  const sorted = [normalizeEmail(emailA), normalizeEmail(emailB)].sort();
  return `${sorted[0]}__${sorted[1]}`;
}

export function isValidTopic(topic: string): boolean {
  const trimmed = topic.trim();
  return trimmed.length >= 1 && trimmed.length <= 60;
}

const QUOTED_MENTION = /@"([^"]+)"/g;
const EMAIL_MENTION = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const HANDLE_MENTION = /@([a-zA-Z][\w.-]*)/g;

/**
 * Extract @mentions from message body.
 * Supports @email, @"Display Name", and bare @handle patterns.
 */
export function extractMentions(body: string): string[] {
  const mentions = new Set<string>();

  for (const match of body.matchAll(QUOTED_MENTION)) {
    const value = match[1]?.trim();
    if (value) mentions.add(value);
  }

  let withoutQuoted = body.replace(QUOTED_MENTION, ' ');

  for (const match of withoutQuoted.matchAll(EMAIL_MENTION)) {
    const value = match[1]?.trim();
    if (value) mentions.add(value);
  }

  withoutQuoted = withoutQuoted.replace(EMAIL_MENTION, ' ');

  for (const match of withoutQuoted.matchAll(HANDLE_MENTION)) {
    const value = match[1]?.trim();
    if (value) mentions.add(value);
  }

  return [...mentions];
}

export function isForthUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const forth = new URL(FORTH_PRODUCTION_URL);
    return (
      parsed.protocol === forth.protocol &&
      parsed.hostname === forth.hostname
    );
  } catch {
    return false;
  }
}

export function parseForthDeepLink(
  url: string,
): { kind: 'home' | 'workspace' | 'task'; path: string } | null {
  if (!isForthUrl(url)) return null;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';

    if (path === '/' || path === '/home') {
      return { kind: 'home', path };
    }

    if (path.startsWith('/workspace')) {
      return { kind: 'workspace', path };
    }

    if (path.startsWith('/task')) {
      return { kind: 'task', path };
    }

    return null;
  } catch {
    return null;
  }
}
