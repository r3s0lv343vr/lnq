'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';

interface DmPanelProps {
  selectedDmId: string | null;
  onSelectDm: (dmId: string) => void;
  onClose: () => void;
}

export function DmPanel({ selectedDmId, onSelectDm, onClose }: DmPanelProps) {
  const { dmThreads, ensureDm, listUsers, user } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const users = listUsers().filter((u) => u.uid !== user?.uid);

  const handleStartDm = async (targetEmail: string) => {
    setError('');
    setStarting(true);
    try {
      const thread = await ensureDm(targetEmail);
      onSelectDm(thread.id);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start DM.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-paper border-l border-border flex flex-col shadow-lg">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-display text-lg text-ink">Direct messages</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-charcoal text-xl"
          aria-label="Close DMs"
        >
          ×
        </button>
      </header>

      <div className="p-3 border-b border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) handleStartDm(email.trim());
          }}
          className="flex gap-2"
        >
          <input
            className="lnq-input flex-1"
            type="email"
            placeholder="Start DM by email…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="lnq-btn lnq-btn-primary"
            disabled={starting || !email.trim()}
          >
            Go
          </button>
        </form>
        {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      </div>

      {users.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <p className="font-mono-meta text-muted text-xs mb-2">People</p>
          <div className="flex flex-wrap gap-1">
            {users.map((u) => (
              <button
                key={u.uid}
                type="button"
                onClick={() => handleStartDm(u.email)}
                className="text-xs px-2 py-1 rounded bg-ink/5 hover:bg-teal/10"
              >
                {u.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto">
        {dmThreads.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">No direct messages yet.</p>
        )}
        {dmThreads.map((thread) => {
          const otherEmail = thread.memberEmails.find(
            (e) => e !== user?.email.toLowerCase(),
          );
          const selected = thread.id === selectedDmId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelectDm(thread.id)}
              className={`w-full text-left px-4 py-3 border-b border-border/50 text-sm ${
                selected ? 'bg-teal/10' : 'hover:bg-ink/5'
              }`}
            >
              <span className="font-medium">{otherEmail ?? thread.id}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
