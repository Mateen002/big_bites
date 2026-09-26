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
    <div className="bg-paper pt-24">
      <div className="mx-auto max-w-4xl px-5 py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-chili-500">Your kitchen tab</p>
            <h1 className="mt-2 font-display text-4xl text-ink">Hi, {user.name.split(' ')[0]}</h1>
            <p className="mt-1 text-sm text-ink-mute">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink hover:text-paper"
          >
            Sign out
          </button>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-5">
          <form onSubmit={onProfile} className="space-y-3 border border-ink/10 bg-white p-5 lg:col-span-2">
            <h2 className="font-display text-2xl text-ink">Profile</h2>
            <input
              name="name"
              defaultValue={user.name}
              required
              className="w-full border border-ink/15 px-3 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
            />
            <input
              name="phone"
              defaultValue={user.phone || ''}
              placeholder="Phone"
              className="w-full border border-ink/15 px-3 py-2.5 text-sm focus:border-chili-500 focus:outline-none"
            />
            <input
              value={user.email}
              disabled
              className="w-full border border-ink/10 bg-paper-warm px-3 py-2.5 text-sm text-ink-mute"
            />
            {profileMsg && <p className="text-sm text-ink-mute">{profileMsg}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </form>

          <div className="lg:col-span-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl text-ink">Your orders</h2>
              <Link href="/order-now" className="text-sm font-semibold text-chili-500">
                Order again →
              </Link>
            </div>

            {ordersLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="skeleton h-24" />
                ))}
              </div>
            ) : !orders.length ? (
              <div className="mt-4 border border-dashed border-ink/15 p-8 text-center">
                <p className="text-ink-mute">No orders yet.</p>
                <Link href="/order-now" className="mt-4 inline-block btn-primary">
                  Browse menu
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {orders.map((o) => (
                  <li key={o.id} className="border border-ink/10 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/orders/${o.id}`} className="font-semibold text-ink hover:text-chili-500">
                          {o.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-ink-mute">
                          {new Date(o.createdAt).toLocaleString('en-PK')} · {o.deliveryZone.name} ·{' '}
                          {o.status.replace(/_/g, ' ')}
                        </p>
                        <p className="mt-2 text-sm text-ink-soft">
                          {o.items
                            .map((i) => `${i.quantity}× ${i.productName}`)
                            .join(' · ')}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-mute">
                          {o.items.map((i) => fulfillmentLabel(i.fulfillmentType)).filter((v, idx, a) => a.indexOf(v) === idx).join(' + ')}
                        </p>
                      </div>
                      <p className="font-semibold text-ink">{formatPkr(o.totalPkr)}</p>
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
