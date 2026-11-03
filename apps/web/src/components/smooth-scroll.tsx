'use client';

/** Native scroll only - Lenis was making wheel scroll feel laggy on Windows. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
