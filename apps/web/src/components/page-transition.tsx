'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Lightweight route enter - CSS only, no Framer scroll observers. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [key, setKey] = useState(pathname);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    setKey(pathname);
    // Soft scroll-to-top on navigation without smooth (smooth feels laggy on Windows)
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div key={key} className={reduced ? undefined : 'page-enter'}>
      {children}
    </div>
  );
}
