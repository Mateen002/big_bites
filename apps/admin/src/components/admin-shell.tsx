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

  // Store Online / Offline Status State
  const [storeOpen, setStoreOpen] = useState<boolean | null>(null);
  const [storeNotice, setStoreNotice] = useState('');
  const [storeToggling, setStoreToggling] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [noticeInput, setNoticeInput] = useState('');

  // Self-Service Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeStatus, setChangeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);

  // Fetch Store Status on mount
  useEffect(() => {
    if (pathname === '/login') return;
    adminApi
      .getStoreStatus()
      .then((s) => {
        setStoreOpen(s.isOpen);
        setStoreNotice(s.notice);
        setNoticeInput(s.notice);
      })
      .catch(() => {});
  }, [pathname]);

  async function handleConfirmStoreToggle(openTarget: boolean, customNotice?: string) {
    setStoreToggling(true);
    try {
      const res = await adminApi.updateStoreStatus({
        isOpen: openTarget,
        notice: customNotice !== undefined ? customNotice : noticeInput,
      });
      setStoreOpen(res.isOpen);
      setStoreNotice(res.notice);
      setShowStoreModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update store status');
    } finally {
      setStoreToggling(false);
    }
  }

  function handleStoreToggleClick() {
    if (storeOpen) {
      // Opening modal to confirm closing and allow custom closed notice
      setNoticeInput(storeNotice || 'BigBites is currently closed for orders. Feel free to explore our menu!');
      setShowStoreModal(true);
    } else {
      // Immediately reopen store
      handleConfirmStoreToggle(true);
    }
  }

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
      {/* Mobile Drawer Backdrop Overlay */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-ink-900 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:w-[260px] lg:max-w-none lg:shadow-none lg:translate-x-0 lg:border-white/5 lg:bg-ink-800 lg:sticky lg:top-0 lg:h-screen ${
          navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-2xl text-accent">BigBites</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">Admin · Lahore</p>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setNavOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          {/* Store Live Operational Status Switch */}
          {storeOpen !== null && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      storeOpen
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                        : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold leading-none text-white">
                      {storeOpen ? 'Store Open' : 'Store Closed'}
                    </p>
                    <p className="text-[10px] text-stone-400 leading-none mt-1">
                      {storeOpen ? 'Accepting Orders' : 'Orders Paused'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStoreToggleClick}
                  disabled={storeToggling}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    storeOpen
                      ? 'border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                      : 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  {storeToggling ? '…' : storeOpen ? 'Close' : 'Open'}
                </button>
              </div>
            </div>
          )}

          <nav className="mt-8 space-y-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setNavOpen(false)}
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

        <div className="mt-auto shrink-0 border-t border-white/5 bg-ink-900/40 p-5">
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

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/5 bg-ink-900/95 px-3.5 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-200 transition hover:bg-white/10 active:scale-95"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
            >
              <span className="text-xl">☰</span>
            </button>
            <div>
              <p className="font-display text-lg font-bold leading-none text-accent">BigBites</p>
              <p className="text-[10px] uppercase tracking-wider text-stone-500 leading-none mt-1">Admin Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {storeOpen !== null && (
              <button
                type="button"
                onClick={handleStoreToggleClick}
                disabled={storeToggling}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition border ${
                  storeOpen
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                }`}
                title={storeOpen ? 'Store is Open. Tap to close.' : 'Store is Closed. Tap to open.'}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    storeOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span>{storeToggling ? '…' : storeOpen ? 'Open' : 'Closed'}</span>
              </button>
            )}
            <Link
              href="/orders"
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                pathname === '/orders'
                  ? 'bg-accent text-ink-950 shadow-md shadow-accent/20'
                  : 'border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>⚡</span>
              <span>Orders</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-3.5 sm:p-5 md:p-6 lg:p-8">{children}</main>
      </div>

      {/* Self-Service Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
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
      {/* Store Close / Notice Configuration Modal */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🌙</span>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Pause Store & Orders</h3>
                  <p className="text-xs text-stone-400">Switch store to Closed mode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStoreModal(false)}
                className="text-stone-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-stone-300 leading-relaxed">
                When closed, customers can still browse all products, but adding to cart and checkout will be disabled with a <strong className="text-accent font-bold">"Store Closed"</strong> tag.
              </p>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Announcement Message shown to customers:
                </label>
                <textarea
                  value={noticeInput}
                  onChange={(e) => setNoticeInput(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-xs text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g. BigBites is currently closed for orders. Kitchen reopens tomorrow at 12:00 PM!"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowStoreModal(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-stone-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmStoreToggle(false)}
                  disabled={storeToggling}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-600/30 transition disabled:opacity-50"
                >
                  {storeToggling ? 'Updating…' : 'Yes, Close Store'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
