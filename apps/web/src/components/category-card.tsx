'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/reveal';
import { assetUrl, type Category } from '@/lib/api';

export function CategoryCard({
  category,
  tone,
  index = 0,
}: {
  category: Category;
  tone: 'hot' | 'frost';
  index?: number;
}) {
  return (
    <Reveal delay={Math.min(index, 6) * 80} variant="scale">
      <Link
        href={`/categories/${category.slug}`}
        className="group relative block min-h-[280px] overflow-hidden md:min-h-[340px]"
      >
        {category.image ? (
          <Image
            src={assetUrl(category.image)}
            alt={category.name}
            fill
            className="img-zoom object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="skeleton h-full w-full" />
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            tone === 'hot' ? 'from-ink/90 via-ink/30' : 'from-frost-900/90 via-frost-900/30'
          } to-transparent`}
        />
        <div className="absolute bottom-0 p-5 transition duration-500 group-hover:translate-y-[-6px] md:p-6">
          <h3 className="font-display text-2xl text-white md:text-3xl">{category.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm text-white/75">{category.description}</p>
          {category._count && (
            <p
              className={`mt-3 text-xs font-bold uppercase tracking-wider ${
                tone === 'hot' ? 'text-mustard-300' : 'text-frost-200'
              }`}
            >
              {category._count.products} items →
            </p>
          )}
        </div>
      </Link>
    </Reveal>
  );
}
