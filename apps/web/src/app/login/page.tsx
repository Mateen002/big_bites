'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/account';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    router.replace(next);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await login(String(fd.get('email')), String(fd.get('password')));
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full border border-ink/15 bg-white px-4 py-3 text-sm focus:border-chili-500 focus:outline-none';

  return (
    <div className="bg-paper pt-24">
      <div className="mx-auto max-w-md px-5 py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-chili-500">Welcome back</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-ink-mute">Track your orders and checkout faster next time.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input name="email" type="email" required placeholder="Email" className={field} />
          <input name="password" type="password" required minLength={6} placeholder="Password" className={field} />
          {error && <p className="text-sm text-chili-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-mute">
          New to BigBites?{' '}
          <Link
            href={`/signup${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-semibold text-chili-500"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="pt-28 text-center text-ink-mute">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
