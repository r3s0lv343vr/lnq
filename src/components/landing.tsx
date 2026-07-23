'use client';

import { useSession } from '@/lib/session';

export function Landing() {
  const { setShowAuth, exploreDemo } = useSession();

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
            onClick={() => exploreDemo()}
          >
            Explore demo
          </button>
        </div>
      </div>
    </div>
  );
}
