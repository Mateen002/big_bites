'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

type RevealVariant = 'up' | 'left' | 'right' | 'scale';

const VARIANT_CLASS: Record<RevealVariant, string> = {
  up: 'reveal',
  left: 'reveal-left',
  right: 'reveal-right',
  scale: 'reveal-scale',
};

/** One-shot IntersectionObserver reveal - disconnects after fire (smooth, no scroll lag). */
export function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: RevealVariant;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in');
      return;
    }

    // Already visible on load - reveal immediately for smoother first paint
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      requestAnimationFrame(() => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add('is-in');
        io.disconnect();
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style = { '--reveal-delay': `${delay}ms` } as CSSProperties;

  return (
    <Tag ref={ref as never} className={`${VARIANT_CLASS[variant]} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
