'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useSession } from '@/lib/session';
import type { Message } from '@/lib/types';

interface SearchPanelProps {
  onSelectResult: (result: { streamId?: string; topic?: string; dmId?: string }) => void;
  onClose: () => void;
}

export function SearchPanel({ onSelectResult, onClose }: SearchPanelProps) {
  const { searchMessages } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const hits = await searchMessages(query);
      setResults(hits);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-paper border-l border-border flex flex-col shadow-lg">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-display text-lg text-ink">Search</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-charcoal text-xl"
          aria-label="Close search"
        >
          ×
        </button>
      </header>

      <form onSubmit={handleSearch} className="p-3 border-b border-border flex gap-2">
        <input
          className="lnq-input flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages…"
          autoFocus
        />
        <button type="submit" className="lnq-btn lnq-btn-primary" disabled={searching}>
          {searching ? '…' : 'Search'}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && query && !searching && (
          <p className="px-4 py-6 text-sm text-muted">No results found.</p>
        )}
        {results.map((message) => (
          <button
            key={message.id}
            type="button"
            className="w-full text-left px-4 py-3 border-b border-border/50 hover:bg-ink/5"
            onClick={() => {
              if (message.dmId) {
                onSelectResult({ dmId: message.dmId });
              } else if (message.streamId) {
                onSelectResult({ streamId: message.streamId, topic: message.topic });
              }
              onClose();
            }}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-medium text-sm">{message.authorName}</span>
              <span className="font-mono-meta text-muted text-xs">
                {format(new Date(message.createdAt), 'MMM d, h:mm a')}
              </span>
            </div>
            <p className="text-sm text-charcoal line-clamp-2">{message.body}</p>
            {message.streamId && (
              <span className="font-mono-meta text-teal text-xs mt-1 inline-block">
                #{message.topic}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
