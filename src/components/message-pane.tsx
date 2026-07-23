'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useSession } from '@/lib/session';
import { unfurlForthUrl } from '@/lib/forth/client';
import { isForthUrl } from '@/lib/identity';
import type { ForthUnfurl, Message } from '@/lib/types';

interface MessagePaneProps {
  streamId: string | null;
  topic: string | null;
  dmId?: string | null;
  dmMessages?: Message[];
}

function ForthEmbed({ url }: { url: string }) {
  const [unfurl, setUnfurl] = useState<ForthUnfurl | null>(null);

  useEffect(() => {
    let cancelled = false;
    unfurlForthUrl(url).then((data) => {
      if (!cancelled) setUnfurl(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!unfurl) return null;

  return (
    <div className="lnq-unfurl">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <strong>{unfurl.title}</strong>
      </a>
      {unfurl.subtitle && <span className="text-muted"> — {unfurl.subtitle}</span>}
      {unfurl.status && (
        <span className="font-mono-meta text-muted ml-2">[{unfurl.status}]</span>
      )}
    </div>
  );
}

function MessageBody({ body }: { body: string }) {
  const forthUrls = body.match(/https?:\/\/[^\s]+/g)?.filter(isForthUrl) ?? [];
  const uniqueUrls = [...new Set(forthUrls)];

  return (
    <div>
      <p className="whitespace-pre-wrap break-words">{body}</p>
      {uniqueUrls.map((url) => (
        <ForthEmbed key={url} url={url} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: Message }) {
  return (
    <article className="lnq-message-item px-4 py-3 border-b border-border/60 hover:bg-ink/[0.02]">
      <header className="flex items-baseline gap-2 mb-1">
        <span className="font-medium text-ink">{message.authorName}</span>
        <time className="font-mono-meta text-muted text-xs">
          {format(new Date(message.createdAt), 'MMM d, h:mm a')}
        </time>
      </header>
      <MessageBody body={message.body} />
    </article>
  );
}

export function MessagePane({ streamId, topic, dmId, dmMessages }: MessagePaneProps) {
  const { subscribeMessages, subscribeDmMessages } = useSession();
  const [messages, setMessages] = useState<Message[]>(dmMessages ?? []);

  useEffect(() => {
    if (dmId) {
      if (dmMessages) {
        setMessages(dmMessages);
        return;
      }
      return subscribeDmMessages(dmId, setMessages);
    }

    if (!streamId || !topic) {
      setMessages([]);
      return;
    }

    return subscribeMessages(streamId, topic, setMessages);
  }, [streamId, topic, dmId, dmMessages, subscribeMessages, subscribeDmMessages]);

  if (dmId) {
    return (
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <p className="px-4 py-8 text-muted text-sm">No messages yet. Say hello!</p>
        )}
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    );
  }

  if (!streamId || !topic) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted text-sm">
        Select a stream and topic to view messages
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 border-b border-border bg-surface/50">
        <h2 className="font-display text-lg text-ink">
          <span className="text-teal font-mono-meta">#</span>
          {topic}
        </h2>
      </div>
      {messages.length === 0 && (
        <p className="px-4 py-8 text-muted text-sm">No messages in this topic yet.</p>
      )}
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
