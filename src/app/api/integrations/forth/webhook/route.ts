import { NextRequest, NextResponse } from 'next/server';
import type { ForthWebhookEvent } from '@/lib/forth/contract';

function channelHintForEvent(event: ForthWebhookEvent): '#reviews' | '#general' {
  if (event.type === 'task.landed' || event.type === 'task.assigned') {
    return '#reviews';
  }
  return '#general';
}

function messagePreviewForEvent(event: ForthWebhookEvent): string {
  switch (event.type) {
    case 'task.assigned':
      return `Forth: ${event.email} was assigned${event.taskTitle ? ` to "${event.taskTitle}"` : ''}`;
    case 'task.landed':
      return `Forth: ${event.email} landed${event.taskTitle ? ` "${event.taskTitle}"` : ' a task'}`;
    case 'task.paused':
      return `Forth: ${event.email} paused${event.taskTitle ? ` "${event.taskTitle}"` : ' a task'}`;
    case 'member.invited':
      return `Forth: ${event.email} was invited${event.workspaceName ? ` to ${event.workspaceName}` : ''}`;
    default:
      return `Forth event for ${event.email}`;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.LNQ_WEBHOOK_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let event: ForthWebhookEvent;
  try {
    event = (await request.json()) as ForthWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!event.type || !event.email || !event.occurredAt) {
    return NextResponse.json(
      { error: 'type, email, and occurredAt are required' },
      { status: 400 },
    );
  }

  const channelHint = channelHintForEvent(event);
  const messagePreview = messagePreviewForEvent(event);

  return NextResponse.json({
    accepted: true,
    channelHint,
    messagePreview,
    note: 'Persistence is best-effort — wire to Firestore admin SDK in production.',
  });
}
