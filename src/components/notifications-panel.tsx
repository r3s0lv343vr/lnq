'use client';

import { format } from 'date-fns';
import { useSession } from '@/lib/session';

interface NotificationsPanelProps {
  onNavigate: (href?: string) => void;
  onClose: () => void;
}

export function NotificationsPanel({ onNavigate, onClose }: NotificationsPanelProps) {
  const { notifications, markNotificationRead } = useSession();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="absolute right-0 top-full mt-1 w-80 max-h-96 bg-surface-elevated border border-border rounded-lg shadow-xl z-30 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-display text-base text-ink">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 font-mono-meta text-teal text-xs">{unreadCount}</span>
          )}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-charcoal"
          aria-label="Close notifications"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="px-4 py-6 text-sm text-muted">No notifications yet.</p>
        )}
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-ink/5 ${
              !notification.read ? 'bg-teal/5' : ''
            }`}
            onClick={() => {
              markNotificationRead(notification.id);
              onNavigate(notification.href);
              onClose();
            }}
          >
            <div className="font-medium text-sm text-ink">{notification.title}</div>
            <p className="text-sm text-muted line-clamp-2 mt-0.5">{notification.body}</p>
            <time className="font-mono-meta text-muted text-xs mt-1 block">
              {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
            </time>
          </button>
        ))}
      </div>
    </div>
  );
}
