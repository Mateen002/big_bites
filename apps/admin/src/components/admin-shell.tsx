'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminApi, getToken, setToken } from '@/lib/api';

const links = [
  { href: '/', label: 'Dashboard', icon: '◆' },
  { href: '/orders', label: 'Orders', icon: '☰' },
  { href: '/products', label: 'Products', icon: '▣' },
  { href: '/categories', label: 'Categories', icon: '▦' },
  { href: '/options', label: 'Options', icon: '⚙' },
  { href: '/zones', label: 'Zones', icon: '⌖' },
  { href: '/promos', label: 'Promos', icon: '%' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/login') {
      setReady(true);
      return;
    }
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    adminApi
      .me()
      .then(setUser)
      .catch(() => router.replace('/login'))
      .finally(() => setReady(true));
  }, [pathname, router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-900 text-stone-400">
        <div className="text-center">
          <p className="font-display text-2xl text-accent">BigBites</p>
          <p className="mt-2 text-sm">Loading admin…</p>
        </div>
      </div>
    );
  }

  if (pathname === '/login') return <>{children}</>;

  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={`border-white/5 bg-ink-800 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r ${
          navOpen ? 'block border-b' : 'hidden lg:flex'
        }`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl text-accent">BigBites</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Admin · Lahore</p>
            </div>
            <button
              type="button"
              className="btn-ghost lg:hidden"
              onClick={() => setNavOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav className="mt-8 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active(l.href)
                    ? 'bg-accent/15 font-semibold text-accent ring-1 ring-accent/25'
                    : 'text-stone-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="w-4 text-center text-xs opacity-70">{l.icon}</span>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/5 p-5">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-stone-500">{user?.email}</p>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-accent hover:underline"
            onClick={() => {
              setToken(null);
              router.push('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/5 bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" className="btn-ghost" onClick={() => setNavOpen((v) => !v)}>
            Menu
          </button>
          <p className="font-display text-lg text-accent">BigBites</p>
          <Link href="/orders" className="text-xs font-semibold text-stone-400">
            Orders
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
