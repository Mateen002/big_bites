'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/account';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(next);
    }
  }, [loading, user, next, router]);

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
    'w-full rounded-xl border border-amber-400/30 bg-[#1C0430] px-4 py-3 text-sm text-white placeholder:text-purple-300/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition';

  return (
    <div className="min-h-screen bg-[#1B042C] pt-24 pb-16">
      <div className="mx-auto max-w-md px-5 py-8">
        <div className="rounded-2xl border border-amber-400/25 bg-[#24073B] p-8 shadow-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400">Welcome back</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white">Sign in</h1>
          <p className="mt-2 text-sm text-purple-200/70">Track your orders and checkout faster next time.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <input name="email" type="email" required placeholder="Email" className={field} />
            <input name="password" type="password" required minLength={6} placeholder="Password" className={field} />
            {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-purple-200/70">
            New to BigBites?{' '}
            <Link
              href={`/signup${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="font-bold text-amber-400 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
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
