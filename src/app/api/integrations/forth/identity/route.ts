import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail } from '@/lib/identity';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') ?? '';

  if (!email.trim()) {
    return NextResponse.json({ error: 'email query parameter is required' }, { status: 400 });
  }

  const normalized = normalizeEmail(email);

  return NextResponse.json({
    email,
    normalized,
    matchedHint:
      'Use the same Google/GitHub email as Forth (forth-bice.vercel.app)',
  });
}
