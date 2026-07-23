'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/session';
import type { Message } from '@/lib/types';

interface TopicListProps {
  streamId: string | null;
  selectedTopic: string | null;
  onSelectTopic: (topic: string) => void;
  collapsed?: boolean;
}

function deriveTopics(messages: Message[]): string[] {
  const topics = new Set(messages.map((m) => m.topic).filter(Boolean));
  return [...topics].sort();
}

export function TopicList({
  streamId,
  selectedTopic,
  onSelectTopic,
  collapsed,
}: TopicListProps) {
  const { subscribeMessages, listTopics, mode } = useSession();
  const [topics, setTopics] = useState<string[]>([]);

  useEffect(() => {
    if (!streamId) {
      setTopics([]);
      return;
    }

    if (mode === 'demo') {
      setTopics(listTopics(streamId));
      const unsub = subscribeMessages(streamId, undefined, (messages) => {
        setTopics(deriveTopics(messages));
      });
      return unsub;
    }

    const unsub = subscribeMessages(streamId, undefined, (messages) => {
      setTopics(deriveTopics(messages));
    });
    return unsub;
  }, [streamId, subscribeMessages, listTopics, mode]);

  if (collapsed || !streamId) return null;

  return (
    <aside className="lnq-topic-col flex flex-col">
      <div className="px-3 py-3 border-b border-border">
        <span className="font-mono-meta text-muted text-xs uppercase tracking-widest">
          Topics
        </span>
      </div>

      <nav className="flex-1 py-1">
        {topics.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted">No topics yet</p>
        )}
        {topics.map((topic) => {
          const selected = topic === selectedTopic;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => onSelectTopic(topic)}
              className={`lnq-stream-selected w-full text-left px-3 py-2 text-sm ${
                selected
                  ? 'bg-teal/10 text-ink font-medium'
                  : 'text-charcoal hover:bg-ink/5'
              }`}
            >
              {topic}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
