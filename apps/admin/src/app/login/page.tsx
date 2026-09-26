'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await adminApi.login(String(fd.get('email')), String(fd.get('password')));
      setToken(res.accessToken);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(224,168,46,0.12),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(239,68,68,0.08),transparent_45%)]" />
      <form onSubmit={onSubmit} className="card relative w-full max-w-sm space-y-4 shadow-2xl shadow-black/40">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Lahore kitchen</p>
          <h1 className="mt-1 font-display text-3xl text-white">BigBites Admin</h1>
          <p className="mt-1 text-sm text-stone-400">Revenue, catalog & order control</p>
        </div>
        <input name="email" type="email" required defaultValue="admin@bigbites.pk" className="input" placeholder="Email" />
        <input name="password" type="password" required defaultValue="BigBites@Admin1" className="input" placeholder="Password" />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
