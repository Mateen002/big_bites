import Image from 'next/image';
import { notFound } from 'next/navigation';
import { api, fulfillmentLabel, assetUrl } from '@/lib/api';
import { ProductRow } from '@/components/product-row';
import { CategoryStrip } from '@/components/category-strip';
import { Reveal } from '@/components/reveal';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const categories = await api.categories();
    return categories.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

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
    <div className="bg-[#1B042C] min-h-screen">
      <div className="relative h-[40vh] min-h-[260px] md:h-[48vh]">
        {category.image && (
          <Image src={assetUrl(category.image)} alt="" fill className="object-cover" priority sizes="100vw" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#140224]/95 via-[#1B042C]/60 to-transparent"
        />
        <div className="absolute bottom-0 mx-auto w-full max-w-6xl px-5 pb-10">
          <span
            className="rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-400 text-purple-950 shadow-sm"
          >
            {fulfillmentLabel(category.fulfillmentType)}
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-6xl">{category.name}</h1>
          <p className="mt-3 max-w-xl text-purple-200/90">{category.description}</p>
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
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-3xl font-bold text-white">Menu</h2>
            <p className="text-sm font-semibold text-purple-200/80">{products.length} items</p>
          </div>
        </Reveal>
        <div className="rounded-2xl border border-amber-400/20 bg-[#24073B] p-4 shadow-xl md:p-6">
          {products.length === 0 ? (
            <div className="py-12 text-center text-purple-200/70">
              No dishes found in this category yet.
            </div>
          ) : (
            products.map((p, i) => (
              <ProductRow key={p.id} product={p} index={i} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
