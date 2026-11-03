'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/cart-provider';
import { useStoreStatus } from '@/components/store-status-provider';
import { formatPkr, fulfillmentLabel } from '@/lib/api';

export default function CartPage() {
  const { cart, setOpen, updateQty, removeItem } = useCart();
  const { isOpen } = useStoreStatus();

  useEffect(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <div className="bg-paper pt-20">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-4xl text-ink">Your cart</h1>
        {!cart.items.length ? (
          <p className="mt-6 text-ink-mute">
            Empty -{' '}
            <Link href="/order-now" className="font-semibold text-chili-500">
              Order Now
            </Link>{' '}
            or{' '}
            <Link href="/stock-freezer" className="font-semibold text-frost-600">
              Stock Your Freezer
            </Link>
            .
          </p>
        ) : (
          <>
            <ul className="mt-8 space-y-4">
              {cart.items.map((item) => (
                <li key={item.id} className="border border-ink/10 bg-white p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{item.productName}</p>
                      <span
                        className={`text-[11px] font-semibold ${
                          item.fulfillmentType === 'HOT_NOW' ? 'text-chili-500' : 'text-frost-600'
                        }`}
                      >
                        {fulfillmentLabel(item.fulfillmentType)}
                      </span>
                    </div>
                    <p className="font-semibold">{formatPkr(item.lineTotalPkr)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button type="button" className="h-8 w-8 bg-paper-deep" onClick={() => updateQty(item.id, item.quantity - 1)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" className="h-8 w-8 bg-paper-deep" onClick={() => updateQty(item.id, item.quantity + 1)}>
                      +
                    </button>
                    <button type="button" className="ml-auto text-xs text-ink-mute" onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center justify-between">
              <p className="text-lg font-semibold text-ink">Subtotal {formatPkr(cart.subtotalPkr)}</p>
              {isOpen ? (
                <Link href="/checkout" className="btn-primary">
                  Checkout
                </Link>
              ) : (
                <span className="rounded-xl bg-stone-800 border border-white/10 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-stone-400 cursor-not-allowed">
                  Store Closed
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
