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
      {!hideChrome && cart.itemCount > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="float-in fixed bottom-5 right-4 z-40 flex items-center gap-3 bg-ink px-4 py-3 text-sm text-white shadow-float transition duration-300 hover:-translate-y-1 hover:bg-chili-500 md:bottom-8 md:right-8"
        >
          <span className="flex h-7 w-7 items-center justify-center bg-chili-500 text-xs font-bold">
            <AnimatedNumber value={cart.itemCount} />
          </span>
          <span className="font-semibold">{formatPkr(cart.subtotalPkr)}</span>
        </button>
      )}
      {!hideChrome && showCta && (
        <div className="float-in fixed bottom-5 left-4 z-40 md:bottom-8 md:left-8">
          <Link href="/order-now" className="btn-primary shadow-float">
            Order Now
          </Link>
        </div>
      )}
    </>
  );
}
