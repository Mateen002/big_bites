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
    <div className="min-h-screen bg-[#1B042C] pt-24 pb-16">
      <div className="mx-auto max-w-4xl px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400">BigBites Kitchen</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-white md:text-4xl">My Orders</h1>
            <p className="mt-1 text-sm text-purple-200/70">
              {user ? `Orders for ${user.email}` : 'Recent orders placed on this device'}
            </p>
          </div>
          <Link href="/order-now" className="btn-primary">
            + New Order
          </Link>
        </div>

        {/* Quick Order Lookup Form */}
        <div className="mt-8 rounded-2xl border border-amber-400/20 bg-[#24073B] p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white">Track Any Order</h2>
          <p className="text-xs text-purple-200/70 mt-0.5">
            Enter your Order Number (e.g. BB-20260926-XXXX) to track status instantly.
          </p>
          <form onSubmit={onSearch} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Enter Order Number…"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="flex-1 rounded-xl border border-amber-400/30 bg-[#1C0430] px-4 py-2.5 text-sm uppercase text-white placeholder:normal-case placeholder:text-purple-300/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-2.5 text-sm font-bold text-purple-950 transition hover:brightness-110 shadow-md shadow-amber-400/20"
            >
              Track
            </button>
          </form>
          {searchError && <p className="mt-2 text-xs font-semibold text-red-400">{searchError}</p>}
        </div>

        {/* Orders List */}
        <div className="mt-8">
          <h2 className="font-display text-2xl font-bold text-white">Order History</h2>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-28 rounded-2xl" />
              ))}
            </div>
          ) : !orders.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-amber-400/20 bg-[#24073B]/50 p-10 text-center">
              <span className="text-4xl">🥘</span>
              <h3 className="mt-3 font-display text-xl font-bold text-white">No Orders Found</h3>
              <p className="mt-1 text-sm text-purple-200/70">
                You haven&apos;t placed any orders yet, or your orders are on another device.
              </p>
              {!user && (
                <div className="mt-4 text-xs text-purple-200/70">
                  Have an account?{' '}
                  <Link href="/login?next=/my-orders" className="font-bold text-amber-400 hover:underline">
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
                  className="overflow-hidden rounded-2xl border border-amber-400/20 bg-[#24073B] p-5 shadow-xl transition hover:border-amber-400/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold text-white">{o.orderNumber}</span>
                        <span
                          className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
                            STATUS_STYLES[o.status] || 'bg-purple-900/60 text-purple-200 border border-purple-700/40'
                          }`}
                        >
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-purple-200/70">
                        {new Date(o.createdAt).toLocaleString('en-PK')}
                        {o.deliveryZone?.name && ` · ${o.deliveryZone.name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-amber-400">{formatPkr(o.totalPkr)}</p>
                      <span className="text-xs text-purple-300/60">{o.paymentMethod}</span>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-purple-800/40 pt-3">
                    <p className="text-xs text-purple-200/90">
                      {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(' · ')}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-purple-800/40 pt-3">
                    <span className="text-xs text-purple-300/70">
                      {o.items.map((i) => fulfillmentLabel(i.fulfillmentType)).filter((v, idx, a) => a.indexOf(v) === idx).join(' & ')}
                    </span>
                    <Link
                      href={`/orders/${o.id}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-amber-400/30 bg-[#1C0430] px-3.5 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400 hover:text-purple-950"
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
