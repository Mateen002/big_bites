import { api, type Category, type Product } from '@/lib/api';
import { OrderNowClient } from './order-now-client';

export const revalidate = 60;

export default async function OrderNowPage() {
  let categories: Category[] = [];
  let products: Product[] = [];
  try {
    [categories, products] = await Promise.all([
      api.categories('HOT_NOW'),
      api.products({ fulfillment: 'HOT_NOW' }),
    ]);
  } catch (err) {
    console.warn('Could not load hot categories or products:', err);
  }

  return <OrderNowClient categories={categories} products={products} />;
}
