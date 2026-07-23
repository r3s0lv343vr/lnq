'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';
import { canPostToStream } from '@/lib/store/firebase-store';
import type { Stream } from '@/lib/types';

interface ComposerProps {
  stream: Stream | null;
  topic: string | null;
  dmId?: string | null;
  onSent?: () => void;
}

export function Composer({ stream, topic, dmId, onSent }: ComposerProps) {
  const { user, sendStreamMessage, sendDm } = useSession();
  const [topicInput, setTopicInput] = useState(topic ?? '');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const canPost =
    dmId || (stream && user && canPostToStream(user, stream));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setError('');
    setSending(true);
    try {
      if (dmId) {
        await sendDm(dmId, body);
      } else if (stream) {
        const targetTopic = (topic ?? topicInput).trim();
        if (!targetTopic) {
          setError('Topic is required.');
          setSending(false);
          return;
        }
        await sendStreamMessage({
          streamId: stream.id,
          topic: targetTopic,
          body,
        });
      }
      setBody('');
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  if (!dmId && !stream) {
    return null;
  }

  const disabled = !canPost || sending;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-surface-elevated p-3 space-y-2"
    >
      {!dmId && !topic && (
        <div>
          <label className="font-mono-meta text-muted text-xs block mb-1">Topic</label>
          <input
            className="lnq-input"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="e.g. welcome"
          />
        </div>
      )}

      {stream?.announcementsOnly && !canPost && (
        <p className="text-sm text-muted">
          Only admins and operators can post in #announcements.
        </p>
      )}

      <textarea
        className="lnq-input min-h-[80px] resize-y"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={dmId ? 'Message…' : `Message #${(topic ?? topicInput) || 'topic'}…`}
        disabled={!canPost}
      />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" className="lnq-btn lnq-btn-primary" disabled={disabled}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </form>
  );
}
