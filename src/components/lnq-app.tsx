'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/session';
import { FORTH_PRODUCTION_URL } from '@/lib/identity';
import { StreamRail } from '@/components/stream-rail';
import { TopicList } from '@/components/topic-list';
import { MessagePane } from '@/components/message-pane';
import { Composer } from '@/components/composer';
import { DmPanel } from '@/components/dm-panel';
import { SearchPanel } from '@/components/search-panel';
import { NotificationsPanel } from '@/components/notifications-panel';

type SidePanel = 'none' | 'dm' | 'search';

export function LnqApp() {
  const {
    user,
    streams,
    signOut,
    createStream,
    renameStream,
    archiveStream,
    notifications,
    mode,
  } = useSession();

  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>('none');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showStreamAdmin, setShowStreamAdmin] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [topicOpen, setTopicOpen] = useState(true);
  const [newStreamName, setNewStreamName] = useState('');
  const [adminError, setAdminError] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'operator';
  const unreadCount = notifications.filter((n) => !n.read).length;
  const selectedStream = streams.find((s) => s.id === selectedStreamId) ?? null;
  const inDmMode = selectedDmId !== null;

  useEffect(() => {
    if (streams.length > 0 && !selectedStreamId && !selectedDmId) {
      setSelectedStreamId(streams[0].id);
      setSelectedTopic('welcome');
    }
  }, [streams, selectedStreamId, selectedDmId]);

  const handleSelectStream = (streamId: string) => {
    setSelectedStreamId(streamId);
    setSelectedDmId(null);
    setSidePanel('none');
    const stream = streams.find((s) => s.id === streamId);
    if (stream?.id === 'announcements') {
      setSelectedTopic('program');
    } else {
      setSelectedTopic('welcome');
    }
    if (window.innerWidth < 768) {
      setRailOpen(false);
      setTopicOpen(true);
    }
  };

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    if (window.innerWidth < 768) {
      setTopicOpen(false);
    }
  };

  const handleSelectDm = (dmId: string) => {
    setSelectedDmId(dmId);
    setSelectedStreamId(null);
    setSelectedTopic(null);
    setSidePanel('none');
  };

  const handleNavigate = (href?: string) => {
    if (!href) return;
    if (href.startsWith('/dm/')) {
      const dmId = href.replace('/dm/', '');
      handleSelectDm(dmId);
      return;
    }
    const match = href.match(/\/stream\/([^?]+)\?topic=(.+)/);
    if (match) {
      setSelectedStreamId(match[1]);
      setSelectedTopic(decodeURIComponent(match[2]));
      setSelectedDmId(null);
    }
  };

  const handleCreateStream = async () => {
    const name = newStreamName.trim();
    if (!name) return;
    setAdminError('');
    try {
      await createStream({ name });
      setNewStreamName('');
      setShowStreamAdmin(false);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to create stream.');
    }
  };

  const handleRenameStream = async () => {
    if (!selectedStreamId) return;
    const name = prompt('New stream name:');
    if (!name) return;
    setAdminError('');
    try {
      await renameStream(selectedStreamId, name);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to rename stream.');
    }
  };

  const handleArchiveStream = async () => {
    if (!selectedStreamId) return;
    if (!confirm('Archive this stream?')) return;
    setAdminError('');
    try {
      await archiveStream(selectedStreamId);
      setSelectedStreamId(streams[0]?.id ?? null);
      setSelectedTopic('welcome');
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to archive stream.');
    }
  };

  const shellClass = [
    'lnq-shell',
    inDmMode ? 'lnq-shell--dm' : '',
    !railOpen ? 'lnq-shell--mobile-rail-hidden' : '',
    !topicOpen && !inDmMode ? 'lnq-shell--mobile-topic-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass}>
      <header className="lnq-header">
        <button
          type="button"
          className="md:hidden lnq-btn lnq-btn-outline text-xs py-1 px-2"
          onClick={() => setRailOpen(!railOpen)}
          aria-label="Toggle streams"
        >
          ☰
        </button>

        <span className="font-display text-xl text-ink">Lnq</span>

        {selectedStream && !inDmMode && (
          <span className="font-mono-meta text-muted hidden sm:inline">
            # {selectedStream.name}
            {selectedTopic && ` / ${selectedTopic}`}
          </span>
        )}

        {inDmMode && (
          <span className="font-mono-meta text-muted">Direct message</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <a
            href={FORTH_PRODUCTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono-meta text-teal-dim text-xs hover:underline hidden sm:inline"
          >
            Forth ↗
          </a>

          <button
            type="button"
            className="lnq-btn lnq-btn-outline text-xs py-1 px-2"
            onClick={() => {
              setSidePanel(sidePanel === 'search' ? 'none' : 'search');
              setShowNotifications(false);
            }}
          >
            Search
          </button>

          <button
            type="button"
            className="lnq-btn lnq-btn-outline text-xs py-1 px-2"
            onClick={() => {
              setSidePanel(sidePanel === 'dm' ? 'none' : 'dm');
              setShowNotifications(false);
            }}
          >
            DMs
          </button>

          <div className="relative">
            <button
              type="button"
              className="lnq-btn lnq-btn-outline text-xs py-1 px-2 relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              Alerts
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal text-ink text-[10px] rounded-full flex items-center justify-center font-mono-meta">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <NotificationsPanel
                onNavigate={handleNavigate}
                onClose={() => setShowNotifications(false)}
              />
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              className="lnq-btn lnq-btn-outline text-xs py-1 px-2 hidden sm:inline-flex"
              onClick={() => setShowStreamAdmin(!showStreamAdmin)}
            >
              Streams
            </button>
          )}

          <span className="font-mono-meta text-muted text-xs hidden lg:inline">
            {user?.displayName}
            {mode === 'demo' && ' (demo)'}
          </span>

          <button
            type="button"
            className="lnq-btn lnq-btn-outline text-xs py-1 px-2"
            onClick={() => signOut()}
          >
            Out
          </button>
        </div>
      </header>

      {!inDmMode && (
        <>
          <StreamRail
            streams={streams}
            selectedStreamId={selectedStreamId}
            onSelectStream={handleSelectStream}
            onCreateStream={() => setShowStreamAdmin(true)}
            collapsed={!railOpen}
          />
          <TopicList
            streamId={selectedStreamId}
            selectedTopic={selectedTopic}
            onSelectTopic={handleSelectTopic}
            collapsed={!topicOpen}
          />
        </>
      )}

      {inDmMode && (
        <StreamRail
          streams={streams}
          selectedStreamId={null}
          onSelectStream={handleSelectStream}
          collapsed={!railOpen}
        />
      )}

      <main className="lnq-main relative">
        {!inDmMode && selectedStreamId && !selectedTopic && (
          <button
            type="button"
            className="md:hidden absolute top-2 left-2 z-10 lnq-btn lnq-btn-outline text-xs"
            onClick={() => setTopicOpen(true)}
          >
            Topics
          </button>
        )}

        <MessagePane
          streamId={inDmMode ? null : selectedStreamId}
          topic={inDmMode ? null : selectedTopic}
          dmId={inDmMode ? selectedDmId : null}
        />

        <Composer
          stream={inDmMode ? null : selectedStream}
          topic={inDmMode ? null : selectedTopic}
          dmId={inDmMode ? selectedDmId : null}
        />

        {sidePanel === 'dm' && (
          <DmPanel
            selectedDmId={selectedDmId}
            onSelectDm={handleSelectDm}
            onClose={() => setSidePanel('none')}
          />
        )}

        {sidePanel === 'search' && (
          <SearchPanel
            onSelectResult={(result) => {
              if (result.dmId) handleSelectDm(result.dmId);
              else if (result.streamId) {
                setSelectedStreamId(result.streamId);
                setSelectedTopic(result.topic ?? 'welcome');
                setSelectedDmId(null);
              }
            }}
            onClose={() => setSidePanel('none')}
          />
        )}

        {showStreamAdmin && isAdmin && (
          <div className="absolute inset-0 z-20 bg-paper/95 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-surface-elevated border border-border rounded-lg p-5">
              <h3 className="font-display text-lg mb-4">Manage streams</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    className="lnq-input flex-1"
                    placeholder="new-stream-name"
                    value={newStreamName}
                    onChange={(e) => setNewStreamName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="lnq-btn lnq-btn-primary"
                    onClick={handleCreateStream}
                  >
                    Create
                  </button>
                </div>
                {selectedStream && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="lnq-btn lnq-btn-outline flex-1 text-xs"
                      onClick={handleRenameStream}
                    >
                      Rename #{selectedStream.name}
                    </button>
                    <button
                      type="button"
                      className="lnq-btn lnq-btn-outline flex-1 text-xs"
                      onClick={handleArchiveStream}
                    >
                      Archive
                    </button>
                  </div>
                )}
                {adminError && <p className="text-sm text-red-700">{adminError}</p>}
              </div>
              <button
                type="button"
                className="mt-4 text-sm text-muted hover:text-charcoal"
                onClick={() => setShowStreamAdmin(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
