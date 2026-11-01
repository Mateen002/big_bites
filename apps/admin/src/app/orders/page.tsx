'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi, type AdminOrder } from '@/lib/api';
import { formatPkr } from '@/components/charts';

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'SCHEDULED',
  'DELIVERED',
  'CANCELLED',
];

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300',
  CONFIRMED: 'bg-sky-500/20 text-sky-300',
  PREPARING: 'bg-orange-500/20 text-orange-300',
  OUT_FOR_DELIVERY: 'bg-violet-500/20 text-violet-300',
  SCHEDULED: 'bg-cyan-500/20 text-cyan-300',
  DELIVERED: 'bg-emerald-500/20 text-emerald-300',
  CANCELLED: 'bg-rose-500/20 text-rose-300',
};

let cachedOrders: AdminOrder[] = [];

export default function OrdersPage() {
  const [items, setItems] = useState<AdminOrder[]>(() => cachedOrders);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const fresh = await adminApi.orders();
    cachedOrders = fresh;
    setItems(fresh);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (filter !== 'ALL' && o.status !== filter) return false;
      if (!q.trim()) return true;
      const zone = o.deliveryZone?.name || '';
      const hay = `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${zone}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [items, filter, q]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: items.length };
    for (const s of STATUSES) map[s] = items.filter((o) => o.status === s).length;
    return map;
  }, [items]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await adminApi.updateOrderStatus(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Kitchen board</p>
          <h1 className="mt-1 font-display text-3xl text-white">Orders</h1>
          <p className="mt-1 text-sm text-stone-400">{items.length} total · {filtered.length} showing</p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Search name, phone, order…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === s ? 'bg-accent text-ink-900' : 'bg-white/5 text-stone-400 hover:bg-white/10'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-accent">{o.orderNumber}</p>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[o.status]}`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-300">
                  {o.customerName} · {o.customerPhone} · {o.deliveryZone?.name ?? 'Standard'}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(' · ')}
                </p>
                <p className="mt-3 text-sm text-stone-300">
                  <span className="font-semibold text-white">{formatPkr(o.totalPkr)}</span>
                  <span className="text-stone-500"> · {o.paymentMethod} · {o.paymentStatus}</span>
                  <span className="text-stone-500"> · {new Date(o.createdAt).toLocaleString('en-PK')}</span>
                </p>
              </div>
              <select
                className="input w-auto min-w-[180px]"
                value={o.status}
                disabled={busyId === o.id}
                onChange={(e) => updateStatus(o.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="card text-center text-stone-500">No orders match.</p>}
      </div>
    </div>
  );
}
