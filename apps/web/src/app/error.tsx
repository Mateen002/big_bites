'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="bg-[#1B042C] min-h-[70vh] flex items-center justify-center pt-24 pb-16 px-5">
      <div className="mx-auto max-w-md text-center rounded-2xl border border-red-500/30 bg-[#280628] p-8 shadow-2xl">
        <span className="text-4xl">⚠️</span>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-xs text-purple-200/70">
          Our kitchen encountered an unexpected glitch. Please try again or return to the menu.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="btn-primary text-sm py-2.5 px-5"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/30 bg-[#25083E] px-5 py-2.5 text-sm font-semibold text-amber-300 hover:bg-[#340c57] transition"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
