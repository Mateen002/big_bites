'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from './cart-provider';
import { AnimatedNumber } from './animated-number';
import { formatPkr, fulfillmentLabel } from '@/lib/api';

export function CartDrawer() {
  const { cart, open, setOpen, updateQty, removeItem } = useCart();
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setLeaving(false);
      return;
    }
    if (!mounted) return;
    setLeaving(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, 360);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close cart"
        className={`fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] ${
          leaving ? 'drawer-backdrop-exit' : 'drawer-backdrop-enter'
        }`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-paper shadow-float ${
          leaving ? 'drawer-panel-exit' : 'drawer-panel-enter'
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-display text-2xl text-ink">Your cart</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-ink-mute transition hover:text-ink">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!cart.items.length && (
            <p className="text-ink-mute">Empty for now. Order hot — or stock the freezer.</p>
          )}
          <ul className="space-y-4">
            {cart.items.map((item, i) => (
              <li
                key={item.id}
                className="added-pop border-b border-ink/8 pb-4"
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{item.productName}</p>
                    <span
                      className={`mt-1 inline-block px-2 py-0.5 text-[11px] font-semibold ${
                        item.fulfillmentType === 'HOT_NOW'
                          ? 'bg-chili-500/10 text-chili-600'
                          : 'bg-frost-100 text-frost-800'
                      }`}
                    >
                      {fulfillmentLabel(item.fulfillmentType)}
                    </span>
                    {item.selections.length > 0 && (
                      <p className="mt-1 text-xs text-ink-mute">
                        {item.selections.map((s) => s.optionValueLabel).join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-ink">{formatPkr(item.lineTotalPkr)}</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    className="h-8 w-8 bg-ink/5 text-ink transition hover:bg-ink hover:text-paper active:scale-90"
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    className="h-8 w-8 bg-ink/5 text-ink transition hover:bg-ink hover:text-paper active:scale-90"
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-auto text-xs text-ink-mute transition hover:text-chili-500"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-ink/10 p-5">
          <div className="mb-4 flex justify-between text-sm">
            <span className="text-ink-mute">Subtotal</span>
            <span className="font-semibold text-ink">
              Rs <AnimatedNumber value={cart.subtotalPkr} />
            </span>
          </div>
          <Link
            href="/checkout"
            onClick={() => setOpen(false)}
            className={`block bg-chili-500 py-3.5 text-center font-bold text-white transition hover:bg-chili-400 active:scale-[0.99] ${
              !cart.items.length ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            Checkout
          </Link>
        </div>
      </aside>
    </>
  );
}
