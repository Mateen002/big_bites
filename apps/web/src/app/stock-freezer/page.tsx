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
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-frost-50">
      <div className="relative h-[38vh] min-h-[240px] overflow-hidden md:h-[44vh]">
        <Image
          src="/images/mode-frozen.jpg"
          alt=""
          fill
          priority
          quality={70}
          className="hero-kenburns object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-frost-900 via-frost-900/55 to-frost-900/25" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-10">
          <p className="hero-rise text-[11px] font-bold uppercase tracking-[0.3em] text-frost-200">Scheduled</p>
          <h1 className="hero-brand mt-2 font-display text-5xl text-white md:text-6xl">Stock Your Freezer</h1>
          <p className="hero-rise mt-3 max-w-md text-white/80" style={{ animationDelay: '0.28s' }}>
            Pack sizes, weight, and bulk reorders — delivery when you want it.
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
                <h2 className="font-display text-3xl text-ink">Frozen packs</h2>
                <p className="mt-1 text-sm text-ink-mute">{products.length} packs available</p>
              </div>
              <div className="flex bg-white p-1">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    view === 'grid' ? 'bg-frost-600 text-white' : 'text-ink-mute'
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    view === 'list' ? 'bg-frost-600 text-white' : 'text-ink-mute'
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
              <div className="mt-4 border border-ink/8 bg-white px-4 md:px-5">
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
