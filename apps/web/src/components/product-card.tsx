'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/reveal';
import { formatPkr, fulfillmentLabel, assetUrl, type Product } from '@/lib/api';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const hot = product.category.fulfillmentType === 'HOT_NOW';
  return (
    <Reveal delay={Math.min(index, 8) * 70} variant="up">
      <Link href={`/products/${product.slug}`} className="card-lift group block">
        <div className="relative aspect-[5/4] overflow-hidden bg-paper-deep">
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
            className={`absolute left-3 top-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition duration-300 group-hover:translate-y-[-2px] ${
              hot ? 'bg-chili-500 text-white' : 'bg-frost-400 text-frost-900'
            }`}
          >
            {fulfillmentLabel(product.category.fulfillmentType)}
          </span>
        </div>
        <div className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-xl leading-snug text-ink transition-colors duration-300 group-hover:text-chili-500">
              {product.name}
            </h3>
            <p className="shrink-0 font-semibold text-ink">{formatPkr(product.pricePkr)}</p>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-mute">{product.description}</p>
          {product.packSize && (
            <p className="mt-2 text-xs font-medium text-frost-600">
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
