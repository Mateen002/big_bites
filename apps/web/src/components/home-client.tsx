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
      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-karahi.jpg"
            alt="Sizzling karahi"
            fill
            priority
            quality={75}
            className="hero-kenburns object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(214,54,31,0.25),transparent_55%)]" />
        </div>

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:pb-24 md:pt-32">
          <p className="hero-rise mb-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-mustard-300">
            Made in Lahore
          </p>
          <h1 className="hero-brand font-display text-[clamp(3.4rem,12vw,8.5rem)] font-semibold leading-[0.88] tracking-tight text-white">
            BigBites
          </h1>
          <p
            className="hero-rise mt-6 max-w-md text-base leading-relaxed text-white/85 md:text-lg"
            style={{ animationDelay: '0.28s' }}
          >
            Hot karahi tonight — or pack the freezer for the week. One kitchen, two ways to eat.
          </p>
          <div
            className="hero-rise mt-9 flex flex-wrap gap-3"
            style={{ animationDelay: '0.42s' }}
          >
            <Link href="/order-now" className="btn-primary cta-pulse">
              Order Now
            </Link>
            <Link href="/stock-freezer" className="btn-secondary">
              Stock Your Freezer
            </Link>
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
            <div className="absolute inset-0 bg-gradient-to-t from-chili-600/95 via-ink/50 to-transparent transition duration-500 group-hover:from-chili-500/95" />
            <div className="absolute inset-x-0 bottom-0 p-8 transition duration-500 group-hover:translate-y-[-4px] md:p-12">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-mustard-300">Hot & Fast</p>
              <h2 className="mt-3 font-display text-4xl text-white md:text-5xl lg:text-6xl">Order Now</h2>
              <p className="mt-3 max-w-sm text-sm text-white/85 md:text-base">
                Desi, burgers, fresh-fried — cooked to order and out the door ASAP.
              </p>
              <span className="mt-6 inline-block border-b border-white pb-1 text-sm font-semibold text-white transition group-hover:border-mustard-300 group-hover:text-mustard-300">
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
            <div className="absolute inset-0 bg-gradient-to-t from-frost-900/95 via-frost-800/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 transition duration-500 group-hover:translate-y-[-4px] md:p-12">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-frost-200">No rush</p>
              <h2 className="mt-3 font-display text-4xl text-white md:text-5xl lg:text-6xl">Stock Your Freezer</h2>
              <p className="mt-3 max-w-sm text-sm text-white/85 md:text-base">
                Raw packs by weight — schedule delivery when it suits your week.
              </p>
              <span className="mt-6 inline-block border-b border-white pb-1 text-sm font-semibold text-white transition group-hover:border-frost-200 group-hover:text-frost-200">
                Browse frozen packs →
              </span>
            </div>
          </Link>
        </Reveal>
      </section>

      <section id="order-now" className="scroll-section bg-paper py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-chili-500">From the tawa</p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">
              What&apos;s cooking hot
            </h2>
            <p className="mt-4 text-ink-mute">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 transition duration-500 group-hover:translate-y-[-6px] md:p-7">
                    <h3 className="font-display text-3xl text-white">{c.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm text-white/75">{c.description}</p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-mustard-300">
                      {c._count?.products ?? 0} dishes →
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-section border-y border-ink/10 bg-paper-warm py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-chili-500">Tonight&apos;s favourites</p>
                <h2 className="mt-3 font-display text-3xl text-ink md:text-4xl">Order these first</h2>
              </div>
              <Link href="/order-now" className="text-sm font-semibold text-chili-500 hover:text-chili-600">
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

      <section id="stock-freezer" className="scroll-section relative overflow-hidden bg-frost-900 py-20 text-white md:py-28">
        <div className="relative mx-auto max-w-6xl px-5">
          <Reveal className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-frost-200">Stock up</p>
            <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Your freezer, sorted</h2>
            <p className="mt-4 text-frost-100/80">
              Pack size, weight, pieces per pack — scheduled delivery across Lahore. No rush.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            {frozen.map((c) => (
              <Reveal key={c.id} variant="left" className="lg:col-span-5">
                <Link
                  href={`/categories/${c.slug}`}
                  className="group relative block min-h-[380px] overflow-hidden md:min-h-[480px]"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-frost-900 via-frost-900/40 to-transparent" />
                  <div className="absolute bottom-0 p-7 transition duration-500 group-hover:translate-y-[-6px]">
                    <h3 className="font-display text-3xl">{c.name}</h3>
                    <p className="mt-2 text-sm text-frost-100/80">{c.description}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
            <div className="flex flex-col gap-5 lg:col-span-7">
              {frozenProducts.slice(0, 3).map((p, i) => (
                <Reveal key={p.id} delay={i * 80} variant="right">
                  <Link
                    href={`/products/${p.slug}`}
                    className="group flex gap-4 border border-white/10 bg-white/5 p-4 transition duration-300 hover:-translate-y-1 hover:border-frost-200/40 hover:bg-white/10 md:gap-6 md:p-5"
                  >
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden md:h-36 md:w-36">
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
                      <h3 className="font-display text-xl text-white md:text-2xl">{p.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-frost-100/70">{p.description}</p>
                      <p className="mt-2 text-xs text-frost-200">
                        {[p.packSize, p.weightGrams ? `${p.weightGrams}g` : null, p.piecesPerPack ? `${p.piecesPerPack} pcs` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="mt-3 font-semibold text-mustard-300">{formatPkr(p.pricePkr)}</p>
                    </div>
                  </Link>
                </Reveal>
              ))}
              <Reveal delay={240}>
                <Link href="/stock-freezer" className="btn-primary self-start bg-frost-400 text-frost-900 hover:bg-frost-200">
                  All frozen packs
                </Link>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-section relative overflow-hidden bg-ink py-24 text-center text-white md:py-32">
        <div className="absolute inset-0 opacity-30">
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
        <div className="absolute inset-0 bg-ink/75" />
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
