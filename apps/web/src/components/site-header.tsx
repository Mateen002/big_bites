'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from './cart-provider';
import { useAuth } from './auth-provider';
import { AnimatedNumber } from './animated-number';
import { api, formatPkr, assetUrl, fulfillmentLabel, type Category, type Product } from '@/lib/api';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h2.2l1.1 9.2a2 2 0 0 0 2 1.8h7.5a2 2 0 0 0 2-1.7L20 8H7.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.3" fill="currentColor" />
      <circle cx="17" cy="19" r="1.3" fill="currentColor" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteHeader({ categories }: { categories: Category[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const catsRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { cart, setOpen } = useCart();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [cartBump, setCartBump] = useState(false);
  const prevCount = useRef(cart.itemCount);

  // Instant Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const hotCats = categories.filter((c) => c.fulfillmentType === 'HOT_NOW');
  const coldCats = categories.filter((c) => c.fulfillmentType === 'SCHEDULED');

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const found = await api.search(query.trim());
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let ticking = false;
    let lastScrolled = false;
    let lastOverHero = true;

    const update = () => {
      const y = window.scrollY;
      const nextScrolled = y > 24;
      const nextOverHero = isHome && y < window.innerHeight * 0.55;
      if (nextScrolled !== lastScrolled) {
        lastScrolled = nextScrolled;
        setScrolled(nextScrolled);
      }
      if (nextOverHero !== lastOverHero) {
        lastOverHero = nextOverHero;
        setOverHero(nextOverHero);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useEffect(() => {
    setMenuOpen(false);
    setCatsOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
    setQuery('');
  }, [pathname]);

  useEffect(() => {
    if (cart.itemCount > prevCount.current) {
      setCartBump(true);
      const t = window.setTimeout(() => setCartBump(false), 450);
      prevCount.current = cart.itemCount;
      return () => window.clearTimeout(t);
    }
    prevCount.current = cart.itemCount;
  }, [cart.itemCount]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!catsRef.current?.contains(e.target as Node)) setCatsOpen(false);
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const lightOnDark = isHome && overHero && !scrolled;
  const solid = scrolled || !isHome || menuOpen;

  const modeOrder = pathname.startsWith('/order-now') || hotCats.some((c) => pathname.includes(c.slug));
  const modeFreeze = pathname.startsWith('/stock-freezer') || coldCats.some((c) => pathname.includes(c.slug));

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 md:px-5 md:pt-4">
        <div
          className={`mx-auto flex max-w-6xl items-center gap-2 transition-all duration-300 md:gap-3 rounded-2xl ${
            solid
              ? 'border border-amber-400/25 bg-[#1B042C]/95 px-3 py-2 shadow-2xl shadow-black/40 backdrop-blur-md md:px-4'
              : 'border border-amber-400/20 bg-[#1B042C]/80 px-3 py-2 backdrop-blur-md shadow-xl'
          }`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group py-0.5"
            title="BigBites — Good Food, Big Mood"
          >
            {/* Official BigBites Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="BigBites — Good Food, Big Mood"
              className="h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_2px_8px_rgba(245,184,0,0.35)]"
            />
          </Link>

          {/* Mode switch — desktop */}
          <div className="ml-3 hidden items-center gap-1 rounded-xl border border-amber-400/20 bg-purple-950/60 p-1 md:flex">
            <Link
              href="/order-now"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                modeOrder
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-purple-950 shadow-sm'
                  : 'text-amber-200/80 hover:bg-amber-400/10 hover:text-amber-300'
              }`}
            >
              Order Now
            </Link>
            <Link
              href="/stock-freezer"
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                modeFreeze
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-purple-950 shadow-sm'
                  : 'text-amber-200/80 hover:bg-amber-400/10 hover:text-amber-300'
              }`}
            >
              Freezer
            </Link>
          </div>

          {/* Categories dropdown */}
          <div className="relative ml-auto hidden md:block" ref={catsRef}>
            <button
              type="button"
              onClick={() => setCatsOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition ${
                lightOnDark ? 'text-white/85 hover:text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Menu
              <svg width="12" height="12" viewBox="0 0 12 12" className={`transition ${catsOpen ? 'rotate-180' : ''}`}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </svg>
            </button>
            {catsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[340px] border border-ink/8 bg-paper p-4 shadow-float">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-chili-500">Hot & Fast</p>
                      <ul className="space-y-0.5">
                        {hotCats.map((c) => (
                          <li key={c.id}>
                            <Link
                              href={`/categories/${c.slug}`}
                              className={`block px-2 py-2 text-sm transition hover:bg-paper-warm ${
                                pathname.includes(c.slug) ? 'font-semibold text-chili-500' : 'text-ink-soft'
                              }`}
                            >
                              {c.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-frost-600">Freezer</p>
                      <ul className="space-y-0.5">
                        {coldCats.map((c) => (
                          <li key={c.id}>
                            <Link
                              href={`/categories/${c.slug}`}
                              className={`block px-2 py-2 text-sm transition hover:bg-frost-50 ${
                                pathname.includes(c.slug) ? 'font-semibold text-frost-600' : 'text-ink-soft'
                              }`}
                            >
                              {c.name}
                            </Link>
                          </li>
                        ))}
                        {!coldCats.length && <li className="px-2 py-2 text-xs text-ink-mute">Coming soon</li>}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ink/8 pt-3">
                    <Link href="/order-now" className="bg-chili-500/10 px-3 py-2 text-center text-xs font-bold text-chili-600">
                      All hot →
                    </Link>
                    <Link href="/stock-freezer" className="bg-frost-100 px-3 py-2 text-center text-xs font-bold text-frost-800">
                      All frozen →
                    </Link>
                  </div>
                </div>
              )}
          </div>

          {/* Quick Search Button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition ${
              lightOnDark ? 'text-white/85 hover:bg-white/10' : 'text-ink-soft hover:bg-ink/5'
            }`}
            aria-label="Search dishes"
          >
            <SearchIcon className="h-4 w-4" />
            <span className="hidden lg:inline text-xs">Search</span>
          </button>

          <Link
            href="/my-orders"
            className={`hidden px-3 py-2 text-sm font-medium transition sm:inline ${
              lightOnDark ? 'text-white/85 hover:text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            My Orders
          </Link>

          {/* User Account / Dropdown */}
          {user ? (
            <div className="relative hidden sm:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-[#25083E] px-3 py-1.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:bg-[#340B58]"
                aria-expanded={userMenuOpen}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-xs font-black text-purple-950 shadow-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="max-w-[90px] truncate text-xs font-bold text-amber-100">
                  {user.name.split(' ')[0]}
                </span>
                <svg
                  className={`h-3 w-3 text-amber-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 origin-top-right rounded-2xl border border-amber-400/30 bg-[#24073B] p-2 shadow-2xl backdrop-blur-xl z-50">
                  <div className="px-3 py-2.5 border-b border-amber-400/15">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-purple-200/70 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/account"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-purple-100 transition hover:bg-amber-400/15 hover:text-amber-300"
                    >
                      <UserIcon className="h-4 w-4 text-amber-400" />
                      My Profile & Account
                    </Link>
                    <Link
                      href="/my-orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-purple-100 transition hover:bg-amber-400/15 hover:text-amber-300"
                    >
                      <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      My Orders
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-amber-400/15">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-rose-400 transition hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <LogoutIcon className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`hidden items-center gap-1.5 px-3 py-2 text-sm font-semibold transition sm:inline-flex ${
                lightOnDark ? 'text-white/85 hover:text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-3.5 py-2 text-sm font-black text-purple-950 transition hover:brightness-110 shadow-md shadow-amber-500/20 active:scale-95"
            aria-label="Open cart"
          >
            <CartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-950 px-1 text-[11px] font-black text-amber-300 ${
                cartBump ? 'cart-bump' : ''
              }`}
            >
              <AnimatedNumber value={cart.itemCount} />
            </span>
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-amber-300 hover:bg-amber-400/10 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </header>

      {/* Instant Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md p-4 pt-16 sm:p-6 sm:pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-xl rounded-2xl border border-amber-400/30 bg-[#22073B] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-amber-400/20 pb-3">
              <SearchIcon className="h-5 w-5 text-amber-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search karahi, biryani, burgers, kebab packs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-base bg-transparent text-white placeholder:text-purple-300/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-300/70 hover:bg-amber-400/10 hover:text-amber-300"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 max-h-[60vh] overflow-y-auto">
              {searching && (
                <p className="py-8 text-center text-xs font-medium text-ink-mute">Searching menu…</p>
              )}
              {!searching && query.trim() && results.length === 0 && (
                <p className="py-8 text-center text-sm text-ink-mute">
                  No dishes found matching &ldquo;{query}&rdquo;.
                </p>
              )}
              {!searching && results.length > 0 && (
                <div className="divide-y divide-ink/8">
                  {results.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center justify-between p-3 rounded-lg transition hover:bg-paper-warm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">{p.name}</p>
                        <span className="text-[11px] text-ink-mute">
                          {p.category?.name} · {fulfillmentLabel(p.category?.fulfillmentType as any)}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-chili-600">{formatPkr(p.pricePkr)}</span>
                    </Link>
                  ))}
                </div>
              )}
              {!searching && !query.trim() && (
                <div className="py-4 text-center text-xs text-ink-mute">
                  Popular searches: <span className="font-semibold text-ink">Karahi</span>,{' '}
                  <span className="font-semibold text-ink">Handi</span>,{' '}
                  <span className="font-semibold text-ink">Seekh Kebab</span>,{' '}
                  <span className="font-semibold text-ink">Zinger</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile full menu */}
      {menuOpen && (
          <div className="menu-in fixed inset-0 z-30 bg-paper pt-20 md:hidden">
            <div className="flex h-full flex-col overflow-y-auto px-5 pb-10">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/order-now"
                  className="bg-chili-500 px-4 py-4 text-center text-sm font-bold text-white"
                >
                  Order Now
                </Link>
                <Link
                  href="/stock-freezer"
                  className="bg-frost-600 px-4 py-4 text-center text-sm font-bold text-white"
                >
                  Stock Freezer
                </Link>
              </div>

              {user ? (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-purple-900/10 border border-purple-900/20 px-3.5 py-2.5">
                    <div>
                      <p className="text-xs font-bold text-ink">{user.name}</p>
                      <p className="text-[11px] text-ink-mute">{user.email}</p>
                    </div>
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="text-xs font-bold text-chili-600 hover:underline"
                    >
                      Account →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/my-orders"
                      onClick={() => setMenuOpen(false)}
                      className="border border-ink/15 px-4 py-3 text-center text-sm font-semibold text-ink"
                    >
                      My Orders
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm font-bold text-rose-600"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href="/my-orders"
                    onClick={() => setMenuOpen(false)}
                    className="border border-ink/15 px-4 py-3 text-center text-sm font-semibold"
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="bg-ink px-4 py-3 text-center text-sm font-semibold text-paper"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-chili-500">Hot & Fast</p>
              <ul className="mt-3 divide-y divide-ink/8 border-y border-ink/8">
                {hotCats.map((c) => (
                  <li key={c.id}>
                    <Link href={`/categories/${c.slug}`} className="flex items-center justify-between py-3.5 text-base font-medium text-ink">
                      {c.name}
                      <span className="text-xs text-ink-mute">{c._count?.products ?? ''} →</span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-frost-600">Freezer</p>
              <ul className="mt-3 divide-y divide-ink/8 border-y border-ink/8">
                {coldCats.map((c) => (
                  <li key={c.id}>
                    <Link href={`/categories/${c.slug}`} className="flex items-center justify-between py-3.5 text-base font-medium text-ink">
                      {c.name}
                      <span className="text-xs text-ink-mute">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
    </>
  );
}
