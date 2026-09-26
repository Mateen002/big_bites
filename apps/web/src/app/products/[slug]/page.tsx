import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, formatPkr, fulfillmentLabel, assetUrl } from '@/lib/api';
import { ProductOptionsForm } from '@/components/product-options-form';

export const dynamic = 'force-dynamic';

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
    <div className={`pt-20 ${hot ? 'bg-paper' : 'bg-frost-50'}`}>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-14 lg:py-16">
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-deep lg:aspect-square">
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
            className="text-sm font-medium text-ink-mute hover:text-chili-500"
          >
            ← {product.category.name}
          </Link>
          <span
            className={`mt-5 inline-block px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
              hot ? 'bg-chili-500/10 text-chili-600' : 'bg-frost-100 text-frost-800'
            }`}
          >
            {fulfillmentLabel(product.category.fulfillmentType)}
          </span>
          <h1 className="mt-3 font-display text-4xl text-ink md:text-5xl">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold text-ink">{formatPkr(product.pricePkr)}</p>
          <p className="mt-4 text-ink-mute leading-relaxed">{product.description}</p>
          {!hot && (
            <ul className="mt-5 space-y-1 text-sm font-medium text-frost-700">
              {product.packSize && <li>Pack: {product.packSize}</li>}
              {product.weightGrams && <li>Weight: {product.weightGrams}g</li>}
              {product.piecesPerPack && <li>Pieces per pack: {product.piecesPerPack}</li>}
            </ul>
          )}
          <div className="mt-8 border-t border-ink/10 pt-8">
            <ProductOptionsForm product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
