'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';
import { DEMO_ACCOUNT } from '@/lib/store/demo-store';

export function Landing() {
  const { setShowAuth, exploreDemo } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExplore = async () => {
    setError('');
    setBusy(true);
    try {
      await exploreDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start demo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lnq-atmosphere relative min-h-dvh flex flex-col items-center justify-center px-6 py-16">
      <div className="relative z-10 max-w-2xl text-center lnq-animate-landing">
        <p className="font-mono-meta text-teal tracking-[0.2em] uppercase mb-6">
          Async cohort comms
        </p>

        <h1 className="font-display text-[clamp(4rem,14vw,7.5rem)] font-semibold leading-none tracking-tight text-paper mb-6">
          Lnq
        </h1>

        <p className="text-paper/85 text-lg sm:text-xl leading-relaxed max-w-md mx-auto mb-10 font-[family-name:var(--font-source-serif)]">
          Streams, topics, and DMs for cohort teams — organized like Zulip, built for async-first programs.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            className="lnq-btn lnq-btn-primary min-w-[160px]"
            onClick={() => setShowAuth(true)}
          >
            Sign in
          </button>
          <button
            type="button"
            className="lnq-btn lnq-btn-ghost min-w-[160px]"
            disabled={busy}
            onClick={() => void handleExplore()}
          >
            Explore demo
          </button>
        </div>

        <p className="mt-6 font-mono-meta text-paper/70 text-xs">
          Demo: {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>
        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </div>
    </div>
  );
}
