import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, formatPkr, fulfillmentLabel, type FulfillmentType } from '@/lib/api';

export const dynamic = 'force-dynamic';

const STATUS_STEPS = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'SCHEDULED',
  'DELIVERED',
];

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: Awaited<ReturnType<typeof api.track>>;
  try {
    order = await api.track(id);
  } catch {
    notFound();
  }

  const status = String(order.status);
  const items =
    (order.items as Array<{
      productName: string;
      quantity: number;
      lineTotalPkr: number;
      fulfillmentType: FulfillmentType;
      selectionsJson: Array<{ optionValueLabel: string }>;
    }>) || [];
  const zone = order.deliveryZone as { name: string; etaMinutesMin: number; etaMinutesMax: number };
  const payment = order.payment as { redirectUrl?: string; message?: string; sandbox?: boolean } | undefined;

  return (
    <div className="bg-paper pt-20">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <p className="text-sm text-ink-mute">Order confirmed</p>
        <h1 className="font-display text-3xl text-ink md:text-4xl">{String(order.orderNumber)}</h1>
        <p className="mt-2 text-ink-soft">
          Status: <span className="font-semibold text-ink">{status.replace(/_/g, ' ')}</span>
        </p>

        <ol className="mt-8 flex flex-wrap gap-2">
          {STATUS_STEPS.filter((s) => s !== 'SCHEDULED' || status === 'SCHEDULED').map((s) => (
            <li
              key={s}
              className={`px-3 py-1 text-xs font-semibold ${
                STATUS_STEPS.indexOf(s) <= STATUS_STEPS.indexOf(status)
                  ? 'bg-chili-500 text-white'
                  : 'bg-paper-deep text-ink-mute'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </li>
          ))}
        </ol>

        <div className="mt-8 space-y-3 border border-ink/10 bg-white p-5">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <p className="text-ink">
                  {item.quantity}× {item.productName}
                </p>
                <span className="text-[11px] text-ink-mute">{fulfillmentLabel(item.fulfillmentType)}</span>
              </div>
              <span className="font-medium">{formatPkr(item.lineTotalPkr)}</span>
            </div>
          ))}
          <div className="border-t border-ink/10 pt-3 text-sm">
            <p className="text-ink-mute">
              Delivering to {String(order.addressLine)} · {zone?.name}
            </p>
            <p className="mt-1 font-semibold text-ink">
              Total {formatPkr(Number(order.totalPkr))} · {String(order.paymentMethod)}
            </p>
          </div>
        </div>

        {payment?.redirectUrl && (
          <div className="mt-6 border border-frost-200 bg-frost-50 p-4 text-sm text-frost-800">
            <p>{payment.message}</p>
            <a href={payment.redirectUrl} className="mt-2 inline-block font-semibold underline">
              Complete sandbox payment →
            </a>
          </div>
        )}

        <Link href="/" className="mt-10 inline-block font-semibold text-chili-500">
          ← Back to BigBites
        </Link>
      </div>
    </div>
  );
}
