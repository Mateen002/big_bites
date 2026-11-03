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
  { href: '/roles', label: 'Roles & Permissions', icon: '🛡' },
  { href: '/users', label: 'Team & Staff', icon: '👥' },
];

export type AdminUserState = {
  id: string;
  name: string;
  email: string;
  role?: string;
  roleName?: string;
  permissions?: string[];
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AdminUserState | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  // Self-Service Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeStatus, setChangeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setChangeStatus({ type: 'error', message: 'New password must be at least 6 characters long' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeStatus({ type: 'error', message: 'New passwords do not match' });
      return;
    }
    setChangeBusy(true);
    setChangeStatus(null);
    try {
      const res = await adminApi.changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setChangeStatus({ type: 'success', message: res.message || 'Password changed successfully' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setChangeStatus(null);
      }, 2000);
    } catch (err) {
      setChangeStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to change password',
      });
    } finally {
      setChangeBusy(false);
    }
  }

  useEffect(() => {
    if (pathname === '/login') {
      setReady(true);
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    // If user is already loaded in state, don't block navigation with loading screen
    if (user) {
      setReady(true);
      return;
    }

    adminApi
      .me()
      .then((u) => {
        setUser(u);
        setReady(true);
      })
      .catch(() => {
        setToken(null);
        router.replace('/login');
      });
  }, [pathname, router, user]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  if (!ready && pathname !== '/login') {
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
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'Administrator'}</p>
            <span
              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                user?.role === 'super_admin'
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
              }`}
            >
              {user?.roleName || (user?.role === 'super_admin' ? 'Super Admin' : 'Admin')}
            </span>
          </div>
          <p className="truncate text-xs text-stone-500">{user?.email}</p>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs font-semibold text-stone-400 transition hover:text-white flex items-center gap-1.5"
              onClick={() => {
                setShowPasswordModal(true);
                setChangeStatus(null);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              🔑 Change Password
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-accent hover:underline"
              onClick={() => {
                setToken(null);
                router.push('/login');
              }}
            >
              Sign out
            </button>
          </div>
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

      {/* Self-Service Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔑</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Change Password</h3>
                  <p className="text-xs text-stone-400">Update your account login password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Current Password (optional for super admin)
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {changeStatus && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    changeStatus.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {changeStatus.message}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-stone-400 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeBusy || !newPassword.trim() || !confirmPassword.trim()}
                  className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-ink-950 shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-50"
                >
                  {changeBusy ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
