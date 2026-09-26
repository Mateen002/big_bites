import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/components/cart-provider';
import { AuthProvider } from '@/components/auth-provider';
import { FloatingChrome } from '@/components/floating-chrome';
import { PageTransition } from '@/components/page-transition';
import { SiteHeader } from '@/components/site-header';
import { api } from '@/lib/api';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'BigBites — Lahore',
  description: 'Order hot desi & fast food now, or stock your freezer — BigBites Lahore.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let categories: Awaited<ReturnType<typeof api.categories>> = [];
  try {
    categories = await api.categories();
  } catch {
    categories = [];
  }

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <SiteHeader categories={categories} />
            <main className="min-h-screen">
              <PageTransition>{children}</PageTransition>
            </main>
          <footer className="border-t border-ink/10 bg-ink text-white">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
              <div>
                <p className="font-display text-3xl text-mustard-300">BigBites</p>
                <p className="mt-3 max-w-xs text-sm text-white/65">
                  Lahore kitchen for hot made-to-order meals and freezer stock-ups.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">Browse</p>
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <Link href="/order-now" className="hover:text-mustard-300">
                    Order Now
                  </Link>
                  <Link href="/stock-freezer" className="hover:text-frost-200">
                    Stock Your Freezer
                  </Link>
                  {categories.slice(0, 4).map((c) => (
                    <Link key={c.id} href={`/categories/${c.slug}`} className="text-white/70 hover:text-white">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">Account</p>
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <Link href="/login" className="hover:text-mustard-300">
                    Sign in
                  </Link>
                  <Link href="/signup" className="hover:text-mustard-300">
                    Create account
                  </Link>
                  <Link href="/account" className="text-white/70 hover:text-white">
                    My orders
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">Zones</p>
                <p className="mt-4 text-sm text-white/70">
                  DHA · Gulberg · Johar Town · Model Town · Bahria · Cantt
                </p>
              </div>
            </div>
            <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">
              © {new Date().getFullYear()} BigBites Lahore
            </div>
          </footer>
          <FloatingChrome />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
