import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/components/cart-provider';
import { AuthProvider } from '@/components/auth-provider';
import { LocationProvider } from '@/components/location-provider';
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
          <LocationProvider>
            <CartProvider>
              <SiteHeader categories={categories} />
              <main className="min-h-screen">
                <PageTransition>{children}</PageTransition>
              </main>
          <footer className="border-t border-amber-400/25 bg-[#120220] text-white">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
              <div>
                <Link href="/" className="inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="BigBites — Good Food, Big Mood"
                    className="h-16 w-auto object-contain drop-shadow-[0_2px_12px_rgba(245,184,0,0.3)]"
                  />
                </Link>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-400">
                  Good Food, Big Mood ★★★★★
                </p>
                <p className="mt-2 max-w-xs text-xs text-purple-200/70 leading-relaxed">
                  Har Bite Ek Naya Taste! Freshly made with love in Lahore. Hot from the tawa & frozen pantry packs.
                </p>
                <div className="mt-4 flex flex-col gap-1 text-xs font-semibold text-amber-300">
                  <a href="tel:03104460048" className="hover:underline flex items-center gap-1.5">
                    <span>📞</span> 0310-4460048
                  </a>
                  <a href="tel:03170850048" className="hover:underline flex items-center gap-1.5">
                    <span>📞</span> 0317-0850048
                  </a>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Browse Menu</p>
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <Link href="/order-now" className="text-purple-200/80 hover:text-amber-300">
                    Hot Fast Food & Desi
                  </Link>
                  <Link href="/stock-freezer" className="text-purple-200/80 hover:text-amber-300">
                    Stock Your Freezer
                  </Link>
                  {categories.slice(0, 4).map((c) => (
                    <Link key={c.id} href={`/categories/${c.slug}`} className="text-purple-200/70 hover:text-amber-300">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Your Account</p>
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <Link href="/login" className="text-purple-200/80 hover:text-amber-300">
                    Sign In
                  </Link>
                  <Link href="/signup" className="text-purple-200/80 hover:text-amber-300">
                    Create Account
                  </Link>
                  <Link href="/my-orders" className="text-purple-200/80 hover:text-amber-300">
                    Track Orders
                  </Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">Delivery Coverage</p>
                <p className="mt-4 text-xs text-purple-200/70 leading-relaxed">
                  Valencia Town · Wapda Town · DHA (Phase 1–8) · Gulberg · Johar Town · Model Town · Bahria Town · Lake City · Cantt · Askari and across Lahore.
                </p>
                <div className="mt-3 rounded-lg border border-amber-400/20 bg-purple-950/40 p-2.5 text-[11px] text-amber-200/90">
                  📍 Central Kitchen: Main Boulevard, Gulberg III, Lahore
                </div>
              </div>
            </div>
            <div className="border-t border-amber-400/15 py-5 text-center text-xs text-purple-300/50">
              © {new Date().getFullYear()} BigBites Lahore · Good Food, Big Mood. All rights reserved.
            </div>
          </footer>
          <FloatingChrome />
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
