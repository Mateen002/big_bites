'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Category } from '@/lib/api';

export function CategoryStrip({
  categories,
  tone = 'hot',
  allHref,
  allLabel,
}: {
  categories: Category[];
  tone?: 'hot' | 'frost';
  allHref: string;
  allLabel: string;
}) {
  const pathname = usePathname();
  const activeAll = pathname === allHref;
  const accent =
    tone === 'hot'
      ? 'bg-chili-500 text-white'
      : 'bg-frost-600 text-white';
  const idle =
    tone === 'hot'
      ? 'bg-paper-warm text-ink-soft hover:bg-paper-deep'
      : 'bg-frost-50 text-ink-soft hover:bg-frost-100';

  return (
    <div className="sticky top-[4.25rem] z-20 -mx-5 mb-8 border-b border-ink/6 bg-paper px-5 md:top-[4.75rem]">
      <div className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
        <Link
          href={allHref}
          className={`shrink-0 px-4 py-2 text-sm font-semibold transition duration-300 ease-out ${activeAll ? accent : idle}`}
        >
          {allLabel}
        </Link>
        {categories.map((c) => {
          const active = pathname.includes(`/categories/${c.slug}`);
          return (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className={`shrink-0 px-4 py-2 text-sm font-medium transition duration-300 ease-out ${active ? accent : idle}`}
            >
              {c.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
