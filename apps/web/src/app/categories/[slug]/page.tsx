import Image from 'next/image';
import { notFound } from 'next/navigation';
import { api, fulfillmentLabel, assetUrl } from '@/lib/api';
import { ProductRow } from '@/components/product-row';
import { CategoryStrip } from '@/components/category-strip';
import { Reveal } from '@/components/reveal';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let category: Awaited<ReturnType<typeof api.category>>;
  try {
    category = await api.category(slug);
  } catch {
    notFound();
  }

  const hot = category.fulfillmentType === 'HOT_NOW';
  let siblings: Awaited<ReturnType<typeof api.categories>> = [];
  try {
    siblings = await api.categories(category.fulfillmentType);
  } catch {
    siblings = [];
  }

  const products = category.products.map((p) => ({
    ...p,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
      fulfillmentType: category.fulfillmentType,
    },
  }));

  return (
    <div className={hot ? 'bg-paper' : 'bg-frost-50'}>
      <div className="relative h-[40vh] min-h-[260px] md:h-[48vh]">
        {category.image && (
          <Image src={assetUrl(category.image)} alt="" fill className="object-cover" priority sizes="100vw" />
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${
            hot ? 'from-ink via-ink/55' : 'from-frost-900 via-frost-900/55'
          } to-transparent`}
        />
        <div className="absolute bottom-0 mx-auto w-full max-w-6xl px-5 pb-10">
          <span
            className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
              hot ? 'bg-chili-500 text-white' : 'bg-frost-400 text-frost-900'
            }`}
          >
            {fulfillmentLabel(category.fulfillmentType)}
          </span>
          <h1 className="mt-3 font-display text-4xl text-white md:text-6xl">{category.name}</h1>
          <p className="mt-3 max-w-xl text-white/80">{category.description}</p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-2">
        <CategoryStrip
          categories={siblings}
          tone={hot ? 'hot' : 'frost'}
          allHref={hot ? '/order-now' : '/stock-freezer'}
          allLabel={hot ? 'All hot' : 'All packs'}
        />
        <Reveal>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="font-display text-3xl text-ink">Menu</h2>
            <p className="text-sm text-ink-mute">{products.length} items</p>
          </div>
        </Reveal>
        <div className={`border border-ink/8 ${hot ? 'bg-white' : 'bg-white'} px-4 md:px-5`}>
          {products.map((p, i) => (
            <ProductRow key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
