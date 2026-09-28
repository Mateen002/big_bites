'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { Reveal } from '@/components/reveal';
import { formatPkr, assetUrl, type Category, type Product } from '@/lib/api';

export function HomeClient({
  hot,
  frozen,
  hotProducts,
  frozenProducts,
}: {
  hot: Category[];
  frozen: Category[];
  hotProducts: Product[];
  frozenProducts: Product[];
}) {
  return (
    <>
      <section className="relative min-h-[92svh] overflow-hidden bg-gradient-to-b from-[#120220] via-[#20073B] to-[#150326] flex items-center pt-24 pb-16">
        {/* Ambient gold & purple lighting */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px]" />
          <div className="absolute top-1/2 -right-32 h-96 w-96 rounded-full bg-purple-600/20 blur-[130px]" />
          <div className="absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-12 w-full">
          {/* Left Text / Branding Column */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Official BigBites Logo */}
            <div className="hero-rise mb-3 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="BigBites — Good Food, Big Mood"
                className="h-24 sm:h-32 md:h-40 w-auto object-contain drop-shadow-[0_8px_30px_rgba(245,184,0,0.4)]"
              />
            </div>

            <div className="hero-rise flex items-center gap-2 rounded-full border border-amber-400/30 bg-purple-950/60 px-3.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-sm">
              <span>⭐</span>
              <span>Good Food, Big Mood · Har Bite Ek Naya Taste!</span>
            </div>

            <h1 className="hero-brand mt-4 font-display text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight text-white">
              Lahore&apos;s Sizzling Desi, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">Fast Food</span> & Pantry Packs
            </h1>

            <p
              className="hero-rise mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-purple-200/80"
              style={{ animationDelay: '0.2s' }}
            >
              Freshly made with love in Gulberg III. Enjoy hot Karahi, Wraps, Burgers and Paratha Rolls tonight — or stock your freezer with ready-to-fry snack packs.
            </p>

            <div
              className="hero-rise mt-7 flex flex-wrap items-center gap-3.5"
              style={{ animationDelay: '0.35s' }}
            >
              <Link href="/order-now" className="btn-primary cta-pulse flex items-center gap-2">
                <span>🛵</span> Order Hot & Fast
              </Link>
              <Link href="/stock-freezer" className="btn-secondary flex items-center gap-2">
                <span>❄️</span> Stock Your Freezer
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 text-xs text-purple-300/70 border-t border-amber-400/15 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span> Hot Cooked To Order
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span> 27+ Lahore Areas
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400">✓</span> Free Sada Roti Deals
              </div>
            </div>
          </div>

          {/* Right Hero Food Imagery */}
          <div className="lg:col-span-5 flex justify-center relative">
            <div className="relative w-full max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/menu-assets/hero-burger.png"
                alt="BigBites Gourmet Burgers & Fries"
                className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-float"
              />
              <div className="absolute -bottom-4 right-2 rounded-2xl border border-amber-400/40 bg-[#25083E]/95 p-3.5 shadow-2xl backdrop-blur-md">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  BigBites Central Kitchen
                </p>
                <p className="text-xs font-semibold text-white">Main Boulevard, Gulberg III</p>
                <p className="mt-0.5 text-[10px] text-purple-200/70">📞 0310-4460048 · 0317-0850048</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-section grid md:grid-cols-2">
        <Reveal variant="left" className="min-h-[70vh] md:min-h-[80vh]">
          <Link href="/order-now" className="group relative block h-full min-h-[70vh] overflow-hidden md:min-h-[80vh]">
            <Image
              src="/images/mode-hot.jpg"
              alt="Hot food"
              fill
              quality={70}
              className="img-zoom object-cover"
              sizes="(max-width:768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#140224]/95 via-[#1B042C]/50 to-transparent transition duration-500 group-hover:from-[#140224]/85" />
            <div className="absolute inset-x-0 bottom-0 p-8 transition duration-500 group-hover:translate-y-[-4px] md:p-12">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">Hot & Fast</p>
              <h2 className="mt-3 font-display text-4xl text-white md:text-5xl lg:text-6xl">Order Now</h2>
              <p className="mt-3 max-w-sm text-sm text-white/85 md:text-base">
                Desi, burgers, fresh-fried — cooked to order and out the door ASAP.
              </p>
              <span className="mt-6 inline-block border-b border-amber-400 pb-1 text-sm font-semibold text-amber-300 transition group-hover:border-amber-300 group-hover:text-amber-200">
                Browse hot menu →
              </span>
            </div>
          </Link>
        </Reveal>

        <Reveal variant="right" delay={120} className="min-h-[70vh] md:min-h-[80vh]">
          <Link href="/stock-freezer" className="group relative block h-full min-h-[70vh] overflow-hidden md:min-h-[80vh]">
            <Image
              src="/images/mode-frozen.jpg"
              alt="Frozen packs"
              fill
              quality={70}
              className="img-zoom object-cover"
              sizes="(max-width:768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#140224]/95 via-[#1B042C]/50 to-transparent transition duration-500 group-hover:from-[#140224]/85" />
            <div className="absolute inset-x-0 bottom-0 p-8 transition duration-500 group-hover:translate-y-[-4px] md:p-12">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">No rush</p>
              <h2 className="mt-3 font-display text-4xl text-white md:text-5xl lg:text-6xl">Stock Your Freezer</h2>
              <p className="mt-3 max-w-sm text-sm text-white/85 md:text-base">
                Raw packs by weight — schedule delivery when it suits your week.
              </p>
              <span className="mt-6 inline-block border-b border-amber-400 pb-1 text-sm font-semibold text-amber-300 transition group-hover:border-amber-300 group-hover:text-amber-200">
                Browse frozen packs →
              </span>
            </div>
          </Link>
        </Reveal>
      </section>

      <section id="order-now" className="scroll-section bg-[#1B042C] py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">From the tawa</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-white md:text-5xl">
              What&apos;s cooking hot
            </h2>
            <p className="mt-4 text-purple-200/80">
              Real BigBites menu — desi, fast food, and fried, ready to order now.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
            {hot.map((c, i) => (
              <Reveal key={c.id} delay={i * 90} variant="scale">
                <Link
                  href={`/categories/${c.slug}`}
                  className={`group relative block overflow-hidden ${
                    i === 0 ? 'min-h-[420px] md:min-h-[520px]' : 'min-h-[320px] md:min-h-[520px]'
                  }`}
                >
                  {c.image && (
                    <Image
                      src={assetUrl(c.image)}
                      alt={c.name}
                      fill
                      quality={70}
                      loading="lazy"
                      className="img-zoom object-cover"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140224]/95 via-[#1B042C]/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 transition duration-500 group-hover:translate-y-[-6px] md:p-7">
                    <h3 className="font-display text-3xl text-white">{c.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-white/75">{c.description}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-400">
                      {c._count?.products ?? 0} dishes →
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-section border-y border-amber-400/20 bg-[#220738] py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">Tonight&apos;s favourites</p>
                <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">Order these first</h2>
              </div>
              <Link href="/order-now" className="text-sm font-semibold text-amber-400 hover:text-amber-300">
                Full hot menu →
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {hotProducts.slice(0, 6).map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section id="stock-freezer" className="scroll-section relative overflow-hidden bg-[#130222] py-20 text-white md:py-28">
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">Stock up</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">Your freezer, sorted</h2>
            <p className="mt-4 text-base text-purple-200/90">
              Pack size, weight, pieces per pack — scheduled delivery across Lahore. No rush.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            {frozen.map((c) => (
              <Reveal key={c.id} variant="left" className="lg:col-span-5">
                <Link
                  href={`/categories/${c.slug}`}
                  className="group relative block min-h-[380px] overflow-hidden rounded-2xl md:min-h-[480px]"
                >
                  {c.image && (
                    <Image
                      src={assetUrl(c.image)}
                      alt={c.name}
                      fill
                      quality={70}
                      loading="lazy"
                      className="img-zoom object-cover"
                      sizes="(max-width:1024px) 100vw, 42vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140224]/95 via-[#1B042C]/40 to-transparent" />
                  <div className="absolute bottom-0 p-7 transition duration-500 group-hover:translate-y-[-6px]">
                    <h3 className="font-display text-3xl font-bold text-white">{c.name}</h3>
                    <p className="mt-2 text-sm text-purple-200/90">{c.description}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
            <div className="flex flex-col gap-5 lg:col-span-7">
              {frozenProducts.slice(0, 3).map((p, i) => (
                <Reveal key={p.id} delay={i * 80} variant="right">
                  <Link
                    href={`/products/${p.slug}`}
                    className="group flex gap-4 rounded-2xl border border-amber-400/20 bg-[#24073B] p-4 transition duration-300 hover:-translate-y-1 hover:border-amber-400/50 hover:bg-[#2c0948] md:gap-6 md:p-5"
                  >
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl md:h-36 md:w-36">
                      {p.image && (
                        <Image
                          src={assetUrl(p.image)}
                          alt={p.name}
                          fill
                          quality={65}
                          loading="lazy"
                          className="img-zoom object-cover"
                          sizes="144px"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-center">
                      <h3 className="font-display text-xl font-bold text-white md:text-2xl">{p.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-purple-200/90">{p.description}</p>
                      <p className="mt-2 text-xs font-semibold text-amber-300/90">
                        {[p.packSize, p.weightGrams ? `${p.weightGrams}g` : null, p.piecesPerPack ? `${p.piecesPerPack} pcs` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-3 font-extrabold text-amber-400 text-lg">{formatPkr(p.pricePkr)}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
              <Reveal delay={240}>
                <Link href="/stock-freezer" className="btn-primary self-start">
                  All frozen packs →
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-section relative overflow-hidden bg-[#120220] py-24 text-center text-white md:py-32">
        <div className="absolute inset-0 opacity-25">
          <Image
            src="/images/closing.jpg"
            alt=""
            fill
            quality={60}
            loading="lazy"
            className="object-cover transition-transform duration-[8s] ease-out hover:scale-105"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-[#120220]/80" />
        <Reveal variant="scale" className="relative mx-auto max-w-3xl px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-mustard-300">Lahore delivery</p>
          <h2 className="mt-4 font-display text-4xl leading-tight md:text-6xl">
            Hungry now? Or stocking up?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-white/75">
            Same BigBites kitchen. Pick your pace — we&apos;ll bring it to DHA, Gulberg, Johar Town & more.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/order-now" className="btn-primary">
              Order hot food
            </Link>
            <Link href="/stock-freezer" className="btn-secondary">
              Stock freezer
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
