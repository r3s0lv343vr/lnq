import type { ForthUnfurl } from '../types';
import {
  FORTH_PRODUCTION_URL,
  isForthUrl,
  parseForthDeepLink,
} from '../identity';
import { LNQ_FORTH_APIS } from './contract';

/**
 * Forth integration client for Lnq.
 *
 * Designed contract (production):
 * - Identity: `GET /api/integrations/forth/identity?email=` resolves a normalized
 *   email to a linked Forth user profile.
 * - Unfurl: `POST /api/integrations/forth/unfurl` with `{ url }` returns title,
 *   subtitle, and optional task/workspace status for link previews in messages.
 * - Webhook: `POST /api/integrations/forth/webhook` receives Forth lifecycle events
 *   (task assigned, landed, paused, member invited) and fans out Lnq notifications.
 * - Link: `GET /api/integrations/forth/link` returns a deep link for the current user.
 *
 * This client calls Forth production URLs directly for unfurl metadata when no Lnq
 * proxy is configured, with graceful fallback to path-based titles.
 */

export function forthHomeUrl(): string {
  return FORTH_PRODUCTION_URL;
}

export function forthDeepLink(path = ''): string {
  const normalized = path.startsWith('/') ? path : path ? `/${path}` : '';
  return `${FORTH_PRODUCTION_URL}${normalized}`;
}

function fallbackUnfurl(url: string): ForthUnfurl {
  const deepLink = parseForthDeepLink(url);

  let subtitle: string | undefined;
  if (deepLink?.kind === 'workspace') {
    subtitle = 'Forth workspace';
  } else if (deepLink?.kind === 'task') {
    subtitle = 'Forth task';
  }

  return {
    url,
    title: 'Forth',
    subtitle,
  };
}

/**
 * Fetch unfurl metadata for a Forth URL.
 * Attempts the designed Lnq unfurl proxy first, then Forth production metadata,
 * then falls back to a minimal title derived from the deep link path.
 */
export async function unfurlForthUrl(url: string): Promise<ForthUnfurl> {
  if (!isForthUrl(url)) {
    return {
      url,
      title: url,
    };
  }

  const proxyBase =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_LNQ_URL ?? '';

  if (proxyBase) {
    try {
      const response = await fetch(`${proxyBase}${LNQ_FORTH_APIS.unfurl.replace('POST ', '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = (await response.json()) as ForthUnfurl;
        if (data.title) return data;
      }
    } catch {
      // Fall through to production / fallback handling.
    }
  }

  try {
    const response = await fetch(`${FORTH_PRODUCTION_URL}/api/og?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const data = (await response.json()) as Partial<ForthUnfurl>;
      return {
        url,
        title: data.title ?? 'Forth',
        subtitle: data.subtitle,
        status: data.status,
      };
    }
  } catch {
    // Fall through to local fallback.
  }

  return fallbackUnfurl(url);
}
