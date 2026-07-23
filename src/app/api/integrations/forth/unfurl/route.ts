import { NextRequest, NextResponse } from 'next/server';
import {
  FORTH_PRODUCTION_URL,
  isForthUrl,
  parseForthDeepLink,
} from '@/lib/identity';
import type { ForthUnfurl } from '@/lib/types';

function fallbackUnfurl(url: string): ForthUnfurl {
  const deepLink = parseForthDeepLink(url);
  const path = deepLink?.path ?? new URL(url).pathname;

  let subtitle: string | undefined;
  if (deepLink?.kind === 'workspace') {
    subtitle = 'Forth workspace';
  } else if (deepLink?.kind === 'task') {
    subtitle = 'Forth task';
  }

  return {
    url,
    title: 'Forth',
    subtitle: subtitle ?? path,
  };
}

async function fetchForthOg(url: string): Promise<ForthUnfurl | null> {
  try {
    const response = await fetch(
      `${FORTH_PRODUCTION_URL}/api/og?url=${encodeURIComponent(url)}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 300 } },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as Partial<ForthUnfurl>;
    return {
      url,
      title: data.title ?? 'Forth',
      subtitle: data.subtitle,
      status: data.status,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  if (!isForthUrl(url)) {
    return NextResponse.json({ url, title: url });
  }

  const og = await fetchForthOg(url);
  if (og) {
    return NextResponse.json(og);
  }

  return NextResponse.json(fallbackUnfurl(url));
}
