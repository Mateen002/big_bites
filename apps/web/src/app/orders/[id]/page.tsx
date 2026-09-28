'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api, formatPkr, fulfillmentLabel, type FulfillmentType } from '@/lib/api';

const STATUS_ORDER = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const STATUS_DETAILS: Record<string, { label: string; desc: string; icon: string }> = {
  PENDING: {
    label: 'Order Placed',
    desc: 'Waiting for kitchen confirmation…',
    icon: '⏳',
  },
  CONFIRMED: {
    label: 'Order Confirmed',
    desc: 'The BigBites kitchen has accepted your order.',
    icon: '✅',
  },
  PREPARING: {
    label: 'In the Kitchen',
    desc: 'Chef is firing up the tawa & assembling fresh items.',
    icon: '🍳',
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    desc: 'Rider is on the way to your doorstep.',
    icon: '🛵',
  },
  SCHEDULED: {
    label: 'Delivery Scheduled',
    desc: 'Packs prepared and scheduled for your selected delivery window.',
    icon: '❄️',
  },
  DELIVERED: {
    label: 'Delivered',
    desc: 'Enjoy your hot meal & fresh bites!',
    icon: '🎉',
  },
  CANCELLED: {
    label: 'Cancelled',
    desc: 'This order was cancelled.',
    icon: '❌',
  },
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchOrder = async () => {
      try {
        const data = await api.track(id);
        if (active) {
          setOrder(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not load order');
          setLoading(false);
        }
      }
    };

    fetchOrder();
    // Live polling every 8 seconds for real-time kitchen status updates
    const interval = setInterval(fetchOrder, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-paper pt-20">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-chili-500 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-ink-mute">Loading order details…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-5 py-28 text-center bg-paper">
        <h1 className="font-display text-3xl text-ink">Order Not Found</h1>
        <p className="mt-2 text-sm text-ink-mute">We could not find this order number.</p>
        <Link href="/" className="btn-primary mt-6">
          ← Back to BigBites
        </Link>
      </div>
    );
  }

  const status = String(order.status || 'PENDING');
  const details = STATUS_DETAILS[status] || STATUS_DETAILS.PENDING;
  const items =
    (order.items as Array<{
      productName: string;
      quantity: number;
      lineTotalPkr: number;
      fulfillmentType: FulfillmentType;
      selectionsJson?: Array<{ optionValueLabel: string }>;
    }>) || [];
  const zone = order.deliveryZone as { name: string; etaMinutesMin: number; etaMinutesMax: number } | undefined;
  const payment = order.payment as { redirectUrl?: string; message?: string; sandbox?: boolean } | undefined;
  const currentIndex = STATUS_ORDER.indexOf(status);

  const copyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hi BigBites! Inquiring about my order ${order.orderNumber}.`,
  );

  return (
    <div className="min-h-screen bg-[#1B042C] pt-20 pb-16">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Live Order Tracker</p>
            <h1 className="mt-1 font-display text-3xl text-white font-bold md:text-4xl">{String(order.orderNumber)}</h1>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-amber-400/30 bg-[#25083E] px-4 py-2 text-xs font-semibold text-amber-300 transition hover:bg-[#340c57]"
          >
            {copied ? 'Link Copied ✓' : 'Share Tracking Link'}
          </button>
        </div>

        {/* Order Placed Successfully Banner */}
        <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/70 p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white shadow-sm">
              ✓
            </span>
            <div>
              <p className="text-sm font-bold text-emerald-300">Order Placed Successfully!</p>
              <p className="text-xs text-emerald-200/90">
                Your order is confirmed and sent to the BigBites kitchen. Track live cooking and delivery below.
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Hero Card */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-amber-400/25 bg-[#24073B] p-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-2xl border border-amber-400/30">
              {details.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                </span>
                <h2 className="font-display text-xl font-bold text-white">{details.label}</h2>
              </div>
              <p className="mt-1 text-sm text-purple-200/90">{details.desc}</p>
              {zone && status !== 'DELIVERED' && status !== 'CANCELLED' && (
                <p className="mt-2 text-xs font-semibold text-amber-400">
                  Estimated Delivery Window: {zone.etaMinutesMin}–{zone.etaMinutesMax} mins ({zone.name})
                </p>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar */}
          {status !== 'CANCELLED' && (
            <div className="mt-8">
              <div className="grid grid-cols-4 gap-2">
                {['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((step) => {
                  const stepIndex = STATUS_ORDER.indexOf(step);
                  const isDone = currentIndex >= stepIndex;
                  const isCurrent = status === step;
                  return (
                    <div key={step} className="flex flex-col items-center text-center">
                      <div
                        className={`h-2.5 w-full rounded-full transition-all duration-500 ${
                          isDone
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm shadow-amber-400/40'
                            : 'bg-purple-950/80 border border-purple-900/50'
                        } ${isCurrent ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#24073B]' : ''}`}
                      />
                      <span
                        className={`mt-2 text-[10px] font-semibold tracking-tight ${
                          isDone ? 'text-amber-300' : 'text-purple-300/50'
                        }`}
                      >
                        {STATUS_DETAILS[step]?.label || step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Payment Warning or Completion if pending */}
        {payment?.redirectUrl && order.paymentStatus !== 'PAID' && (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-[#2C0A46] p-4 text-sm text-white shadow-sm">
            <p className="font-semibold text-amber-300">Payment Required</p>
            <p className="mt-1 text-xs text-purple-200/80">{payment.message || 'Please complete your digital payment.'}</p>
            <a
              href={payment.redirectUrl}
              className="mt-3 inline-flex items-center rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-purple-950 transition hover:bg-amber-300 shadow-md"
            >
              Complete Online Payment →
            </a>
          </div>
        )}

        {/* Order Items Breakdown */}
        <div className="mt-6 rounded-2xl border border-amber-400/25 bg-[#24073B] p-6 shadow-xl">
          <h3 className="font-display text-lg font-bold text-white">Order Items</h3>
          <ul className="mt-3 divide-y divide-purple-800/40">
            {items.map((item, i) => (
              <li key={i} className="flex justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-white">
                    {item.quantity}× {item.productName}
                  </p>
                  <span className="text-[11px] font-semibold text-amber-400/90">{fulfillmentLabel(item.fulfillmentType)}</span>
                  {item.selectionsJson && item.selectionsJson.length > 0 && (
                    <p className="mt-0.5 text-xs text-purple-300/70">
                      {item.selectionsJson.map((s) => s.optionValueLabel).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-bold text-amber-300">{formatPkr(item.lineTotalPkr)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-purple-800/40 pt-4 text-sm space-y-2">
            <div className="flex justify-between text-purple-200/80">
              <span>Delivery to</span>
              <span className="text-right text-white font-medium max-w-[240px] truncate">
                {String(order.addressLine)}
              </span>
            </div>
            <div className="flex justify-between text-purple-200/80">
              <span>Payment</span>
              <span className="font-medium text-white">
                {String(order.paymentMethod)} ({String(order.paymentStatus)})
              </span>
            </div>
            <div className="flex justify-between pt-3 text-base font-bold text-white border-t border-purple-800/40">
              <span>Total</span>
              <span className="text-amber-400 text-lg font-black">{formatPkr(Number(order.totalPkr))}</span>
            </div>
          </div>
        </div>

        {/* Support & Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`https://wa.me/923001234567?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
          >
            <span>💬</span> WhatsApp Kitchen
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-[#25083E] px-5 py-3 text-sm font-semibold text-amber-300 transition hover:bg-[#340c57]"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
