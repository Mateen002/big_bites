'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminApi, type AnalyticsOverview } from '@/lib/api';
import {
  DonutChart,
  HorizontalBars,
  KpiCard,
  LineBarChart,
  formatPkr,
  formatPct,
} from '@/components/charts';

const RANGES = [
  { days: 7, label: '7d' },
  { days: 14, label: '14d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
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

let cachedOverview: { days: number; data: AnalyticsOverview } | null = null;

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsOverview | null>(() => {
    return cachedOverview && cachedOverview.days === 30 ? cachedOverview.data : null;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => !cachedOverview || cachedOverview.days !== 30);

  useEffect(() => {
    if (!cachedOverview || cachedOverview.days !== days) {
      setLoading(true);
    }
    setError('');
    adminApi
      .analytics(days)
      .then((res) => {
        cachedOverview = { days, data: res };
        setData(res);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [days]);

  const k = data?.kpis;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Operations</p>
          <h1 className="mt-1 font-display text-2xl text-white sm:text-3xl md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-400">
            Revenue, margin, and kitchen mix — last {days} days.
          </p>
        </div>
        <div className="flex self-start sm:self-auto rounded-xl bg-ink-700 p-1 ring-1 ring-white/5 overflow-x-auto">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                days === r.days ? 'bg-accent text-ink-900' : 'text-stone-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-ink-700/60" />
          ))}
        </div>
      ) : data && k ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Gross revenue"
              value={formatPkr(k.revenuePkr)}
              change={k.revenueChangePct}
              tone="accent"
              hint={`AOV ${formatPkr(k.aovPkr)}`}
            />
            <KpiCard
              label="Gross profit"
              value={formatPkr(k.grossProfitPkr)}
              tone="good"
              hint={`Margin ${k.marginPct}% · COGS ${formatPkr(k.cogsPkr)}`}
            />
            <KpiCard
              label="Orders"
              value={String(k.ordersCount)}
              change={k.ordersChangePct}
              hint={`${k.deliveredCount} delivered · ${k.cancelledCount} cancelled`}
            />
            <KpiCard
              label="Delivery fees"
              value={formatPkr(k.deliveryFeesPkr)}
              hint={`Discounts −${formatPkr(k.discountsPkr)}`}
            />
          </div>

          {data.catalog.productsMissingCost > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {data.catalog.productsMissingCost} products missing cost — margin uses ~58% estimate.{' '}
              <Link href="/products" className="font-semibold underline underline-offset-2">
                Set cost on products
              </Link>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-5">
            <div className="card xl:col-span-3">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl text-white">Revenue trend</h2>
                  <p className="text-xs text-stone-500">Bars = revenue · thin bar = gross profit</p>
                </div>
                <div className="flex gap-3 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-accent" /> Revenue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-emerald-400" /> Profit
                  </span>
                </div>
              </div>
              <LineBarChart
                data={data.revenueByDay.map((d) => ({
                  label: d.date,
                  value: d.revenue,
                  secondary: d.profit,
                }))}
                showSecondary
              />
            </div>

            <div className="card xl:col-span-2">
              <h2 className="font-display text-xl text-white">Hot vs freezer</h2>
              <p className="mb-4 text-xs text-stone-500">Merchandise by fulfillment</p>
              <DonutChart
                slices={data.byFulfillment.map((f) => ({
                  label: f.type === 'HOT_NOW' ? 'Order Now' : 'Stock Freezer',
                  value: f.revenue,
                  color: f.type === 'HOT_NOW' ? '#ef4444' : '#38bdf8',
                }))}
              />
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-stone-400">
                {data.byFulfillment.map((f) => (
                  <div key={f.type} className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-stone-500">{f.type === 'HOT_NOW' ? 'Hot orders' : 'Frozen packs'}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{f.orders}</p>
                    <p>{f.items} items</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card">
              <h2 className="font-display text-xl text-white">Top products</h2>
              <p className="mb-4 text-xs text-stone-500">By revenue in range</p>
              <HorizontalBars
                rows={data.topProducts.map((p) => ({
                  label: p.name,
                  value: p.revenue,
                  meta: `${p.qty} sold · margin ${p.marginPct.toFixed(0)}% · profit ${formatPkr(p.profit)}`,
                }))}
              />
            </div>

            <div className="card">
              <h2 className="font-display text-xl text-white">Zones</h2>
              <p className="mb-4 text-xs text-stone-500">Delivery revenue by area</p>
              <HorizontalBars
                rows={data.byZone.map((z) => ({
                  label: z.zone,
                  value: z.revenue,
                  meta: `${z.count} orders`,
                }))}
              />
            </div>

            <div className="card">
              <h2 className="font-display text-xl text-white">Payments</h2>
              <p className="mb-4 text-xs text-stone-500">Method mix</p>
              <HorizontalBars
                rows={data.byPayment.map((p) => ({
                  label: p.method,
                  value: p.revenue,
                  meta: `${p.count} orders`,
                }))}
              />
              <div className="mt-6 border-t border-white/5 pt-4">
                <h3 className="text-sm font-semibold text-stone-300">Order status</h3>
                <ul className="mt-3 space-y-2">
                  {data.byStatus.map((s) => (
                    <li key={s.status} className="flex items-center justify-between gap-2 text-sm">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[s.status] || 'bg-white/10'}`}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-stone-400">
                        {s.count} · {formatPkr(s.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="card lg:col-span-2">
              <h2 className="font-display text-xl text-white">Catalog snapshot</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Products', value: data.catalog.products, href: '/products' },
                  { label: 'Categories', value: data.catalog.categories, href: '/categories' },
                  { label: 'Zones', value: data.catalog.zones, href: '/zones' },
                  { label: 'Customers', value: data.catalog.customers, href: '/' },
                ].map((c) => (
                  <Link
                    key={c.label}
                    href={c.href}
                    className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/5 transition hover:ring-accent/40"
                  >
                    <p className="text-xs text-stone-500">{c.label}</p>
                    <p className="mt-1 font-display text-2xl text-white">{c.value}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-ink-700/50 p-4 text-sm text-stone-400">
                Net merchandise {formatPkr(k.netMerchandisePkr)} after discounts.
                Prior period revenue {formatPkr(k.prevRevenuePkr)} (
                {formatPct(k.revenueChangePct)}).
              </div>
            </div>

            <div className="card lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl text-white">Recent orders</h2>
                <Link href="/orders" className="text-sm font-semibold text-accent hover:underline">
                  View all →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-stone-500">
                    <tr className="border-b border-white/5">
                      <th className="pb-2 font-medium">Order</th>
                      <th className="pb-2 font-medium">Customer</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-white/[0.04]">
                        <td className="py-3">
                          <p className="font-medium text-accent">{o.orderNumber}</p>
                          <p className="text-[11px] text-stone-500">
                            {new Date(o.createdAt).toLocaleString('en-PK')} · {o.zone}
                          </p>
                        </td>
                        <td className="py-3 text-stone-300">
                          {o.customerName}
                          <span className="block text-[11px] text-stone-500">
                            {o.itemCount} items · {o.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[o.status] || 'bg-white/10'}`}>
                            {o.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 text-right font-semibold text-white">{formatPkr(o.totalPkr)}</td>
                      </tr>
                    ))}
                    {!data.recentOrders.length && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-stone-500">
                          No orders in this range yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
