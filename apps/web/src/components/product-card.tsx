'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/reveal';
import { formatPkr, fulfillmentLabel, assetUrl, type Product } from '@/lib/api';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const hot = product.category.fulfillmentType === 'HOT_NOW';
  return (
    <Reveal delay={Math.min(index, 8) * 70} variant="up">
      <Link
        href={`/products/${product.slug}`}
        className="card-lift group block rounded-2xl border border-amber-400/20 bg-[#220738] p-3.5 shadow-xl shadow-black/40 transition-all duration-300 hover:border-amber-400/60 hover:bg-[#280a43] hover:shadow-amber-500/10"
      >
        <div className="relative aspect-[5/4] overflow-hidden rounded-xl bg-[#1B042C]">
          {product.image ? (
            <Image
              src={assetUrl(product.image)}
              alt={product.name}
              fill
              className="img-zoom object-cover"
              sizes="(max-width:768px) 50vw, 33vw"
              loading="lazy"
            />
          ) : (
            <div className="skeleton h-full w-full" />
          )}
          <span
            className={`absolute left-3 top-3 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm transition duration-300 group-hover:translate-y-[-2px] ${
              hot
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-purple-950'
                : 'bg-amber-300 text-purple-950'
            }`}
          >
            {fulfillmentLabel(product.category.fulfillmentType)}
          </span>
        </div>
        <div className="pt-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-snug text-white transition-colors duration-300 group-hover:text-amber-300">
              {product.name}
            </h3>
            <p className="shrink-0 text-base font-black text-amber-400">{formatPkr(product.pricePkr)}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-purple-200/70">{product.description}</p>
          {product.packSize && (
            <p className="mt-2 text-[11px] font-semibold text-amber-300/90">
              {product.packSize}
              {product.weightGrams ? ` · ${product.weightGrams}g` : ''}
              {product.piecesPerPack ? ` · ${product.piecesPerPack} pcs` : ''}
            </p>
          )}
        </div>
      </Link>
    </Reveal>
  );
}
