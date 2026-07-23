'use client';

import { Landing } from '@/components/landing';
import { AuthPanel } from '@/components/auth-panel';
import { LnqApp } from '@/components/lnq-app';
import { useSession } from '@/lib/session';

export default function Home() {
  const { user, loading, showAuth } = useSession();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-paper">
        <p className="font-mono-meta text-muted">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Landing />
        {showAuth && <AuthPanel />}
      </>
    );
  }

  return <LnqApp />;
}
