'use client';

import { useSession } from '@/lib/session';
import type { Stream } from '@/lib/types';

interface StreamRailProps {
  streams: Stream[];
  selectedStreamId: string | null;
  onSelectStream: (streamId: string) => void;
  onCreateStream?: () => void;
  collapsed?: boolean;
}

export function StreamRail({
  streams,
  selectedStreamId,
  onSelectStream,
  onCreateStream,
  collapsed,
}: StreamRailProps) {
  const { user } = useSession();
  const isAdmin = user?.role === 'admin' || user?.role === 'operator';

  if (collapsed) return null;

  return (
    <aside className="lnq-rail flex flex-col">
      <div className="px-3 py-3 border-b border-white/10">
        <span className="font-mono-meta text-teal text-xs uppercase tracking-widest">
          Streams
        </span>
      </div>

      <nav className="flex-1 py-2">
        {streams.map((stream) => {
          const selected = stream.id === selectedStreamId;
          return (
            <button
              key={stream.id}
              type="button"
              onClick={() => onSelectStream(stream.id)}
              className={`lnq-stream-selected w-full text-left px-3 py-2 flex items-center gap-2 ${
                selected
                  ? 'bg-teal/20 text-paper'
                  : 'text-paper/75 hover:bg-white/5 hover:text-paper'
              }`}
            >
              <span className="text-teal font-mono-meta">#</span>
              <span className="truncate text-sm">{stream.name}</span>
              {stream.announcementsOnly && (
                <span className="ml-auto text-[10px] font-mono-meta text-teal/70 uppercase">
                  ann
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {isAdmin && onCreateStream && (
        <div className="p-2 border-t border-white/10">
          <button
            type="button"
            onClick={onCreateStream}
            className="w-full lnq-btn lnq-btn-ghost text-xs py-2"
          >
            + New stream
          </button>
        </div>
      )}
    </aside>
  );
}
