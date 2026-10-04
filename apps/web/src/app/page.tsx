import { HomeClient } from '@/components/home-client';
import { api } from '@/lib/api';

export const revalidate = 60; // Edge cached on Vercel, revalidated every 60s

export default async function HomePage() {
  let hot: Awaited<ReturnType<typeof api.categories>> = [];
  let frozen: Awaited<ReturnType<typeof api.categories>> = [];
  let hotProducts: Awaited<ReturnType<typeof api.products>> = [];
  let frozenProducts: Awaited<ReturnType<typeof api.products>> = [];
  try {
    [hot, frozen, hotProducts, frozenProducts] = await Promise.all([
      api.categories('HOT_NOW'),
      api.categories('SCHEDULED'),
      api.products({ fulfillment: 'HOT_NOW' }),
      api.products({ fulfillment: 'SCHEDULED' }),
    ]);
  } catch {
    /* API may be down during first paint */
  }

  return (
    <HomeClient
      hot={hot}
      frozen={frozen}
      hotProducts={hotProducts}
      frozenProducts={frozenProducts}
    />
  );
}
