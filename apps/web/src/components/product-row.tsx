'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatPkr, fulfillmentLabel, assetUrl, type Product } from '@/lib/api';

export function ProductRow({ product }: { product: Product; index?: number }) {
  const hot = product.category.fulfillmentType === 'HOT_NOW';
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex gap-4 border-b border-ink/8 py-4 transition hover:bg-paper-warm/60 md:gap-5 md:py-5"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-paper-deep md:h-28 md:w-28">
        {product.image && (
          <Image
            src={assetUrl(product.image)}
            alt={product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            sizes="112px"
            loading="lazy"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                hot ? 'text-chili-500' : 'text-frost-600'
              }`}
            >
              {fulfillmentLabel(product.category.fulfillmentType)}
            </span>
            <h3 className="font-display text-lg text-ink transition group-hover:text-chili-500 md:text-xl">
              {product.name}
            </h3>
          </div>
          <p className="shrink-0 pt-4 font-semibold text-ink md:pt-5">{formatPkr(product.pricePkr)}</p>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-ink-mute md:line-clamp-2">{product.description}</p>
        {product.packSize && (
          <p className="mt-1 text-xs text-frost-600">
            {[
              product.packSize,
              product.weightGrams ? `${product.weightGrams}g` : null,
              product.piecesPerPack ? `${product.piecesPerPack} pcs` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
}
