import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, formatPkr, fulfillmentLabel, assetUrl } from '@/lib/api';
import { ProductOptionsForm } from '@/components/product-options-form';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const products = await api.products();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: Awaited<ReturnType<typeof api.product>>;
  try {
    product = await api.product(slug);
  } catch {
    notFound();
  }

  const hot = product.category.fulfillmentType === 'HOT_NOW';

  return (
    <div className="bg-[#1B042C] min-h-screen pt-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-14 lg:py-16">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-amber-400/20 bg-purple-950 lg:aspect-square">
          {product.image && (
            <Image
              src={assetUrl(product.image)}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
            />
          )}
        </div>
        <div className="lg:py-4">
          <Link
            href={`/categories/${product.category.slug}`}
            className="text-sm font-semibold text-amber-300 transition hover:text-amber-400"
          >
            ← {product.category.name}
          </Link>
          <span
            className={`mt-4 inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
              hot ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-purple-900/60 text-purple-200 border border-purple-700/40'
            }`}
          >
            {fulfillmentLabel(product.category.fulfillmentType)}
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">{product.name}</h1>
          <p className="mt-3 text-2xl font-black text-amber-400">{formatPkr(product.pricePkr)}</p>
          <p className="mt-4 text-purple-200/90 leading-relaxed text-sm md:text-base">{product.description}</p>
          {!hot && (
            <ul className="mt-5 space-y-1.5 text-sm font-semibold text-amber-300/90">
              {product.packSize && <li>📦 Pack: {product.packSize}</li>}
              {product.weightGrams && <li>⚖️ Weight: {product.weightGrams}g</li>}
              {product.piecesPerPack && <li>🔢 Pieces per pack: {product.piecesPerPack}</li>}
            </ul>
          )}
          <div className="mt-8 border-t border-purple-800/40 pt-8">
            <ProductOptionsForm product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
