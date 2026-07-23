import { NextResponse } from 'next/server';
import { FORTH_PRODUCTION_URL } from '@/lib/identity';
import { LNQ_FORTH_APIS } from '@/lib/forth/contract';

export async function GET() {
  return NextResponse.json({
    forth: FORTH_PRODUCTION_URL,
    identity: 'email',
    apis: LNQ_FORTH_APIS,
  });
}
