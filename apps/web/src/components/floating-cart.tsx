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
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-amber-400/25 bg-[#1E0533] text-white shadow-2xl ${
          leaving ? 'drawer-panel-exit' : 'drawer-panel-enter'
        }`}
      >
        <div className="flex items-center justify-between border-b border-amber-400/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛍️</span>
            <h2 className="font-display text-xl font-bold text-amber-400">Your Cart</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-purple-200/70 hover:bg-purple-900/50 hover:text-white"
          >
            ✕ Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!cart.items.length && (
            <div className="py-12 text-center text-sm text-purple-200/60">
              <p className="text-3xl mb-2">🥘</p>
              Your cart is empty. Order hot dishes or stock your freezer!
            </div>
          )}
          <ul className="space-y-4">
            {cart.items.map((item, i) => (
              <li
                key={item.id}
                className="added-pop border-b border-amber-400/10 pb-4"
                style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-bold text-white text-sm">{item.productName}</p>
                    <span
                      className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        item.fulfillmentType === 'HOT_NOW'
                          ? 'bg-amber-400 text-purple-950'
                          : 'bg-purple-900 border border-amber-400/30 text-amber-300'
                      }`}
                    >
                      {fulfillmentLabel(item.fulfillmentType)}
                    </span>
                    {item.selections.length > 0 && (
                      <p className="mt-1 text-xs text-purple-200/70">
                        {item.selections.map((s) => s.optionValueLabel).join(' · ')}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-black text-amber-400">{formatPkr(item.lineTotalPkr)}</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 bg-purple-950/70 text-amber-300 transition hover:bg-amber-400 hover:text-purple-950 active:scale-90 font-bold"
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="text-sm font-bold text-white">{item.quantity}</span>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 bg-purple-950/70 text-amber-300 transition hover:bg-amber-400 hover:text-purple-950 active:scale-90 font-bold"
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-auto text-xs text-purple-300/60 transition hover:text-rose-400"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-amber-400/20 bg-[#160326] p-5">
          <div className="mb-4 flex justify-between text-sm">
            <span className="text-purple-200/70">Subtotal</span>
            <span className="font-black text-lg text-amber-400">
              Rs <AnimatedNumber value={cart.subtotalPkr} />
            </span>
          </div>
          <Link
            href="/checkout"
            onClick={() => setOpen(false)}
            className={`btn-primary w-full py-3.5 text-center text-sm font-black uppercase tracking-wider ${
              !cart.items.length ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            Proceed to Checkout →
          </Link>
        </div>
      </aside>
    </>
  );
}
