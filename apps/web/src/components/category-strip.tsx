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
    'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-purple-950 font-black rounded-xl shadow-md shadow-amber-500/20';
  const idle =
    'bg-[#220738] text-amber-200/80 hover:bg-[#2c0948] hover:text-amber-300 border border-amber-400/20 rounded-xl';

  return (
    <div className="sticky top-[4.25rem] z-20 -mx-5 mb-8 border-b border-amber-400/15 bg-[#1B042C]/90 backdrop-blur-md px-5 md:top-[4.75rem]">
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
