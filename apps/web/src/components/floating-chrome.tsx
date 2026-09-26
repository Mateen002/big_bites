'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from './cart-provider';
import { AnimatedNumber } from './animated-number';
import { formatPkr } from '@/lib/api';
import { CartDrawer } from './floating-cart';

export function FloatingChrome() {
  const [showCta, setShowCta] = useState(false);
  const { cart, open, setOpen } = useCart();
  const pathname = usePathname();
  const hideChrome = open || pathname.startsWith('/checkout') || pathname.startsWith('/orders');

  useEffect(() => {
    let ticking = false;
    let last = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 520;
        if (next !== last) {
          last = next;
          setShowCta(next);
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <CartDrawer />

      {/* Desktop Floating Cart Button */}
      {!hideChrome && cart.itemCount > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="float-in fixed bottom-8 right-8 z-40 hidden md:flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-float transition duration-300 hover:-translate-y-1 hover:bg-chili-500"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chili-500 text-xs font-bold text-white">
            <AnimatedNumber value={cart.itemCount} />
          </span>
          <span className="font-semibold">{formatPkr(cart.subtotalPkr)}</span>
          <span className="text-xs text-white/70">View Cart →</span>
        </button>
      )}

      {/* Mobile Sticky Bottom Checkout Bar */}
      {!hideChrome && cart.itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-4 py-3 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-2.5 text-left"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-chili-500 text-xs font-bold text-white">
                <AnimatedNumber value={cart.itemCount} />
              </span>
              <div>
                <p className="text-[11px] font-medium text-ink-mute uppercase tracking-wider">Cart Total</p>
                <p className="text-sm font-bold text-ink">{formatPkr(cart.subtotalPkr)}</p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-md border border-ink/15 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-paper-deep"
              >
                Cart
              </button>
              <Link
                href="/checkout"
                className="rounded-md bg-chili-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-chili-600"
              >
                Checkout →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Order Now Floating CTA on scroll */}
      {!hideChrome && showCta && cart.itemCount === 0 && (
        <div className="float-in fixed bottom-5 left-4 z-40 md:bottom-8 md:left-8">
          <Link href="/order-now" className="btn-primary rounded-full shadow-float">
            Order Now
          </Link>
        </div>
      )}
    </>
  );
}
