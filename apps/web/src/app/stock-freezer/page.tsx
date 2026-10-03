'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api, type Category, type Product } from '@/lib/api';
import { CategoryCard } from '@/components/category-card';
import { ProductCard } from '@/components/product-card';
import { ProductRow } from '@/components/product-row';
import { CategoryStrip } from '@/components/category-strip';

export default function StockFreezerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    Promise.all([api.categories('SCHEDULED'), api.products({ fulfillment: 'SCHEDULED' })])
      .then(([c, p]) => {
        setCategories(c);
        setProducts(p);
      })
      .catch((err) => {
        console.warn('Could not load frozen categories or products:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#1B042C]">
      <div className="relative h-[38vh] min-h-[240px] overflow-hidden md:h-[42vh] bg-gradient-to-b from-[#120220] via-[#24073D] to-[#1B042C]">
        <div className="absolute inset-0">
          <Image
            src="/images/mode-frozen.jpg"
            alt="Stock Your Freezer"
            fill
            priority
            quality={70}
            className="hero-kenburns object-cover opacity-25"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1B042C] via-[#1B042C]/75 to-transparent" />
        </div>
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-8">
          <p className="hero-rise text-[11px] font-bold uppercase tracking-[0.3em] text-amber-400">Scheduled Pantry Stock-Up</p>
          <h1 className="hero-brand mt-1 font-display text-4xl sm:text-5xl text-white font-black">Stock Your Freezer</h1>
          <p className="hero-rise mt-2 max-w-md text-xs sm:text-sm text-purple-200/80">
            Bulk samosa packs, rolls, chicken patties, nuggets & kababs — ready to fry anytime.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-2">
        {!loading && (
          <CategoryStrip categories={categories} tone="frost" allHref="/stock-freezer" allLabel="All packs" />
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-64" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((c, i) => (
                <CategoryCard key={c.id} category={c} tone="frost" index={i} />
              ))}
            </div>

            <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-white">Frozen packs</h2>
                <p className="mt-1 text-sm text-purple-200/80">{products.length} packs available</p>
              </div>
              <div className="flex rounded-xl border border-amber-400/25 bg-[#24073B] p-1">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                    view === 'grid' ? 'bg-amber-400 text-purple-950 shadow-sm' : 'text-purple-200/80 hover:text-white'
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                    view === 'list' ? 'bg-amber-400 text-purple-950 shadow-sm' : 'text-purple-200/80 hover:text-white'
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            {view === 'grid' ? (
              <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-amber-400/20 bg-[#24073B] p-4 md:p-5">
                {products.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
