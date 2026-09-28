'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { api, formatPkr, fulfillmentLabel } from '@/lib/api';

export default function AccountPage() {
  const { user, loading, logout, updateProfile } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof api.myOrders>>>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profileMsg, setProfileMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/account');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setOrdersLoading(true);
    api
      .myOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [user]);

  async function onProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setProfileMsg('');
    const fd = new FormData(e.currentTarget);
    try {
      await updateProfile({
        name: String(fd.get('name')),
        phone: String(fd.get('phone') || ''),
      });
      setProfileMsg('Profile saved');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <div className="pt-28 text-center text-ink-mute">Loading account…</div>;
  }

  return (
    <div className="min-h-screen bg-[#1B042C] pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400">Your kitchen tab</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white">Hi, {user.name.split(' ')[0]}</h1>
            <p className="mt-1 text-sm text-purple-200/70">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="rounded-xl border border-amber-400/30 bg-[#25083E] px-5 py-2.5 text-sm font-bold text-amber-300 transition hover:bg-[#340b58]"
          >
            Sign out
          </button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-5">
          <form onSubmit={onProfile} className="space-y-4 rounded-2xl border border-amber-400/20 bg-[#24073B] p-6 shadow-xl lg:col-span-2">
            <h2 className="font-display text-2xl font-bold text-white">Profile</h2>
            <input
              name="name"
              defaultValue={user.name}
              required
              placeholder="Name"
              className="w-full rounded-xl border border-amber-400/30 bg-[#1C0430] px-4 py-2.5 text-sm text-white placeholder:text-purple-300/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <input
              name="phone"
              defaultValue={user.phone || ''}
              placeholder="Phone"
              className="w-full rounded-xl border border-amber-400/30 bg-[#1C0430] px-4 py-2.5 text-sm text-white placeholder:text-purple-300/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <input
              value={user.email}
              disabled
              className="w-full rounded-xl border border-purple-800/40 bg-purple-950/60 px-4 py-2.5 text-sm text-purple-300/60 cursor-not-allowed"
            />
            {profileMsg && <p className="text-sm font-semibold text-amber-300">{profileMsg}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </form>

          <div className="lg:col-span-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-white">Your orders</h2>
              <Link href="/order-now" className="text-sm font-bold text-amber-400 hover:underline">
                Order again →
              </Link>
            </div>

            {ordersLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="skeleton h-24 rounded-2xl" />
                ))}
              </div>
            ) : !orders.length ? (
              <div className="mt-4 rounded-2xl border border-dashed border-amber-400/20 bg-[#24073B]/50 p-8 text-center">
                <p className="text-purple-200/70">No orders yet.</p>
                <Link href="/order-now" className="mt-4 inline-block btn-primary">
                  Browse menu
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {orders.map((o) => (
                  <li key={o.id} className="rounded-2xl border border-amber-400/20 bg-[#24073B] p-5 shadow-xl">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/orders/${o.id}`} className="font-display text-lg font-bold text-white hover:text-amber-300">
                          {o.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-purple-200/70">
                          {new Date(o.createdAt).toLocaleString('en-PK')} · {o.deliveryZone.name} ·{' '}
                          <span className="text-amber-300 font-semibold">{o.status.replace(/_/g, ' ')}</span>
                        </p>
                        <p className="mt-2 text-sm text-purple-200/90">
                          {o.items
                            .map((i) => `${i.quantity}× ${i.productName}`)
                            .join(' · ')}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-400/90">
                          {o.items.map((i) => fulfillmentLabel(i.fulfillmentType)).filter((v, idx, a) => a.indexOf(v) === idx).join(' + ')}
                        </p>
                      </div>
                      <p className="font-bold text-amber-400 text-lg">{formatPkr(o.totalPkr)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
