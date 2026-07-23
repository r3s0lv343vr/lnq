'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';
import { FORTH_PRODUCTION_URL } from '@/lib/identity';
import { DEMO_ACCOUNT } from '@/lib/store/demo-store';

export function AuthPanel() {
  const {
    signIn,
    signUp,
    signInGoogle,
    signInGithub,
    hasFirebase,
    setShowAuth,
    exploreDemo,
  } = useSession();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState(DEMO_ACCOUNT.email);
  const [password, setPassword] = useState(DEMO_ACCOUNT.password);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleExploreDemo = async () => {
    setError('');
    setSubmitting(true);
    try {
      await exploreDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start demo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
      setShowAuth(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError('');
    setSubmitting(true);
    try {
      if (provider === 'google') await signInGoogle();
      else await signInGithub();
      setShowAuth(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-elevated border border-border rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-ink">
            {mode === 'signin' ? 'Sign in to Lnq' : 'Create account'}
          </h2>
          <button
            type="button"
            className="text-muted hover:text-charcoal text-xl leading-none"
            onClick={() => setShowAuth(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-muted mb-3 leading-relaxed">
          Use the same email as your{' '}
          <a
            href={FORTH_PRODUCTION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-dim underline"
          >
            Forth
          </a>{' '}
          account (Google or GitHub) so identity stays aligned across platforms.
        </p>

        {!hasFirebase && (
          <p className="text-sm mb-4 rounded border border-border bg-paper/60 px-3 py-2 text-charcoal">
            Demo login:{' '}
            <span className="font-mono-meta text-teal-dim">{DEMO_ACCOUNT.email}</span>
            {' / '}
            <span className="font-mono-meta text-teal-dim">{DEMO_ACCOUNT.password}</span>
          </p>
        )}

        {hasFirebase && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              className="lnq-btn lnq-btn-outline flex-1 text-xs"
              disabled={submitting}
              onClick={() => handleOAuth('google')}
            >
              Google
            </button>
            <button
              type="button"
              className="lnq-btn lnq-btn-outline flex-1 text-xs"
              disabled={submitting}
              onClick={() => handleOAuth('github')}
            >
              GitHub
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="font-mono-meta text-muted block mb-1">Display name</label>
              <input
                className="lnq-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="font-mono-meta text-muted block mb-1">Email</label>
            <input
              className="lnq-input"
              type="text"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="font-mono-meta text-muted block mb-1">Password</label>
            <input
              className="lnq-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            className="lnq-btn lnq-btn-primary w-full"
            disabled={submitting}
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2 text-sm text-center">
          <button
            type="button"
            className="text-teal-dim hover:underline"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
          <button
            type="button"
            className="text-muted hover:text-charcoal"
            disabled={submitting}
            onClick={() => void handleExploreDemo()}
          >
            Or explore the demo without signing up
          </button>
        </div>
      </div>
    </div>
  );
}
