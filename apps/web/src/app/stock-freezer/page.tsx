import { api, type Category, type Product } from '@/lib/api';
import { StockFreezerClient } from './stock-freezer-client';

export const revalidate = 60;

export default async function StockFreezerPage() {
  let categories: Category[] = [];
  let products: Product[] = [];
  try {
    [categories, products] = await Promise.all([
      api.categories('SCHEDULED'),
      api.products({ fulfillment: 'SCHEDULED' }),
    ]);
  } catch (err) {
    console.warn('Could not load frozen categories or products:', err);
  }

  return <StockFreezerClient categories={categories} products={products} />;
}
