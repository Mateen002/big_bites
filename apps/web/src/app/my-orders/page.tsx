'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { api, formatPkr, fulfillmentLabel, type FulfillmentType } from '@/lib/api';

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  totalPkr: number;
  paymentMethod: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; fulfillmentType: FulfillmentType }>;
  deliveryZone?: { name: string };
};

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      if (user) {
        try {
          const data = await api.myOrders();
          if (active) setOrders(data);
        } catch {
          if (active) setOrders([]);
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      // Guest user: check localStorage for recent order IDs placed on this device
      if (typeof window !== 'undefined') {
        try {
          const ids: string[] = JSON.parse(
            localStorage.getItem('bigbites_recent_orders') || '[]',
          );
          if (ids.length > 0) {
            const fetched = await Promise.allSettled(
              ids.slice(0, 6).map((id) => api.track(id)),
            );
            const valid = fetched
              .filter((f): f is PromiseFulfilledResult<any> => f.status === 'fulfilled')
              .map((f) => f.value as OrderSummary);
            if (active) setOrders(valid);
          } else {
            if (active) setOrders([]);
          }
        } catch {
          if (active) setOrders([]);
        } finally {
          if (active) setLoading(false);
        }
      }
    }

    if (!authLoading) {
      loadOrders();
    }

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    const q = searchId.trim();
    if (!q) return;
    router.push(`/orders/${encodeURIComponent(q)}`);
  };

  const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-sky-100 text-sky-800',
    PREPARING: 'bg-orange-100 text-orange-800',
    OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800',
    SCHEDULED: 'bg-cyan-100 text-cyan-800',
    DELIVERED: 'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-rose-100 text-rose-800',
  };

  return (
    <div className="min-h-screen bg-paper pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-chili-500">BigBites Kitchen</p>
            <h1 className="mt-1 font-display text-3xl text-ink md:text-4xl">My Orders</h1>
            <p className="mt-1 text-sm text-ink-mute">
              {user ? `Orders for ${user.email}` : 'Recent orders placed on this device'}
            </p>
          </div>
          <Link href="/order-now" className="btn-primary">
            + New Order
          </Link>
        </div>

        {/* Quick Order Lookup Form */}
        <div className="mt-8 rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Track Any Order</h2>
          <p className="text-xs text-ink-mute mt-0.5">
            Enter your Order Number (e.g. BB-20260926-XXXX) to track status instantly.
          </p>
          <form onSubmit={onSearch} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Enter Order Number…"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="flex-1 rounded-md border border-ink/15 bg-white px-3.5 py-2.5 text-sm uppercase text-ink placeholder:normal-case placeholder:text-ink-mute/60 focus:border-chili-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/80"
            >
              Track
            </button>
          </form>
          {searchError && <p className="mt-2 text-xs font-medium text-chili-600">{searchError}</p>}
        </div>

        {/* Orders List */}
        <div className="mt-8">
          <h2 className="font-display text-2xl text-ink">Order History</h2>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-28 rounded-xl" />
              ))}
            </div>
          ) : !orders.length ? (
            <div className="mt-4 rounded-xl border border-dashed border-ink/15 bg-white/50 p-10 text-center">
              <span className="text-4xl">🥘</span>
              <h3 className="mt-3 font-display text-xl text-ink">No Orders Found</h3>
              <p className="mt-1 text-sm text-ink-mute">
                You haven&apos;t placed any orders yet, or your orders are on another device.
              </p>
              {!user && (
                <div className="mt-4 text-xs text-ink-mute">
                  Have an account?{' '}
                  <Link href="/login?next=/my-orders" className="font-semibold text-chili-500 hover:underline">
                    Sign in to see past orders
                  </Link>
                </div>
              )}
              <Link href="/order-now" className="btn-primary mt-6 inline-block">
                Explore Menu
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="overflow-hidden rounded-xl border border-ink/10 bg-white p-5 shadow-sm transition hover:border-ink/25"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold text-ink">{o.orderNumber}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            STATUS_STYLES[o.status] || 'bg-paper-deep text-ink'
                          }`}
                        >
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-mute">
                        {new Date(o.createdAt).toLocaleString('en-PK')}
                        {o.deliveryZone?.name && ` · ${o.deliveryZone.name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-chili-600">{formatPkr(o.totalPkr)}</p>
                      <span className="text-xs text-ink-mute">{o.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-ink/8 pt-3">
                    <p className="text-xs text-ink-soft">
                      {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(' · ')}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-ink/8 pt-3">
                    <span className="text-xs text-ink-mute">
                      {o.items.map((i) => fulfillmentLabel(i.fulfillmentType)).filter((v, idx, a) => a.indexOf(v) === idx).join(' & ')}
                    </span>
                    <Link
                      href={`/orders/${o.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-paper-warm px-3.5 py-1.5 text-xs font-bold text-ink transition hover:bg-chili-500 hover:text-white"
                    >
                      Track Order →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
