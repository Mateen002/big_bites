const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const SESSION_KEY = 'bigbites_cart_session';
const CUSTOMER_TOKEN_KEY = 'bigbites_customer_token';

export function apiOrigin() {
  return API_URL.replace(/\/api\/v1\/?$/, '');
}

/** Resolve /uploads from API; leave /images and absolute URLs as-is. */
export function assetUrl(src?: string | null) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  if (src.startsWith('/uploads/')) return `${apiOrigin()}${src}`;
  return src;
}

export function getCartSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setCartSession(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, id);
}

function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export type FulfillmentType = 'HOT_NOW' | 'SCHEDULED';

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  fulfillmentType: FulfillmentType;
  displayOrder: number;
  isActive: boolean;
  children?: Category[];
  _count?: { products: number };
};

export type OptionValue = {
  id: string;
  label: string;
  priceDeltaPkr: number;
  displayOrder: number;
};

export type OptionGroup = {
  id: string;
  name: string;
  slug: string;
  selectType: 'SINGLE' | 'MULTI' | 'QTY';
  required: boolean;
  minSelect: number;
  maxSelect?: number | null;
  displayOrder: number;
  values: OptionValue[];
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  pricePkr: number;
  compareAtPkr?: number | null;
  packSize?: string | null;
  weightGrams?: number | null;
  piecesPerPack?: number | null;
  category: {
    id: string;
    name: string;
    slug: string;
    fulfillmentType: FulfillmentType;
  };
  optionGroups?: OptionGroup[];
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  image?: string | null;
  fulfillmentType: FulfillmentType;
  unitPricePkr: number;
  quantity: number;
  selections: {
    optionGroupName: string;
    optionValueLabel: string;
    priceDeltaPkr: number;
  }[];
  lineTotalPkr: number;
};

export type Cart = {
  sessionId: string;
  items: CartItem[];
  itemCount: number;
  subtotalPkr: number;
};

export type DeliveryZone = {
  id: string;
  name: string;
  slug: string;
  feePkr: number;
  etaMinutesMin: number;
  etaMinutesMax: number;
};

async function request<T>(
  path: string,
  options: RequestInit & { cartSession?: boolean; auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (options.cartSession) {
    const sid = getCartSession();
    if (sid) headers.set('x-cart-session', sid);
  }
  if (options.auth !== false) {
    const token = getCustomerToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: options.cache ?? 'no-store',
  });

  const newSession =
    res.headers.get('x-cart-session') || res.headers.get('X-Cart-Session');
  if (newSession) setCartSession(newSession);

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      Array.isArray(err.message) ? err.message.join(', ') : err.message || err.error || 'Request failed',
    );
  }
  const data = (await res.json()) as T;
  // Also persist session from cart JSON body (CORS may hide response headers)
  if (
    data &&
    typeof data === 'object' &&
    'sessionId' in data &&
    typeof (data as { sessionId?: unknown }).sessionId === 'string' &&
    (data as { sessionId: string }).sessionId
  ) {
    setCartSession((data as { sessionId: string }).sessionId);
  }
  return data;
}

export const api = {
  categories: (fulfillment?: FulfillmentType) =>
    request<Category[]>(
      `/categories${fulfillment ? `?fulfillment=${fulfillment}` : ''}`,
    ),
  category: (slug: string) =>
    request<Category & { products: Product[]; optionGroups: OptionGroup[] }>(
      `/categories/${slug}`,
    ),
  products: (params?: { category?: string; fulfillment?: string; q?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Product[]>(`/products${q ? `?${q}` : ''}`);
  },
  search: (query: string) =>
    request<Product[]>(`/products?q=${encodeURIComponent(query)}`),
  product: (slug: string) => request<Product>(`/products/${slug}`),
  zones: () => request<DeliveryZone[]>('/zones'),
  cart: {
    get: () => request<Cart>('/cart', { cartSession: true }),
    add: (body: unknown) =>
      request<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify(body),
        cartSession: true,
      }),
    update: (itemId: string, quantity: number) =>
      request<Cart>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
        cartSession: true,
      }),
    remove: (itemId: string) =>
      request<Cart>(`/cart/items/${itemId}`, {
        method: 'DELETE',
        cartSession: true,
      }),
  },
  checkout: (body: unknown) =>
    request<Record<string, unknown>>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
      cartSession: true,
      auth: true,
    }),
  myOrders: () =>
    request<
      Array<{
        id: string;
        orderNumber: string;
        status: string;
        totalPkr: number;
        paymentMethod: string;
        createdAt: string;
        items: Array<{ productName: string; quantity: number; fulfillmentType: FulfillmentType }>;
        deliveryZone: { name: string };
      }>
    >('/orders/mine', { auth: true }),
  myOrder: (id: string) =>
    request<Record<string, unknown>>(`/orders/mine/${id}`, { auth: true }),
  track: (id: string) => request<Record<string, unknown>>(`/orders/${id}/tracking`),
  validatePromo: (code: string, subtotal: number) =>
    request<{ discountPkr: number; promo: { code: string; name: string } }>(
      `/promos/validate?code=${encodeURIComponent(code)}&subtotal=${subtotal}`,
    ),
};

export function formatPkr(amount: number) {
  return `Rs ${amount.toLocaleString('en-PK')}`;
}

export function fulfillmentLabel(type: FulfillmentType) {
  return type === 'HOT_NOW' ? 'Hot & Fast' : 'Scheduled delivery';
}

export function isValidPakistaniPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^((\+92)|(0092)|(0))?3[0-9]{9}$/.test(cleaned);
}

export function formatPakistaniPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+92')) return cleaned;
  if (cleaned.startsWith('0092')) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith('0')) return `+92${cleaned.slice(1)}`;
  if (cleaned.startsWith('3') && cleaned.length === 10) return `+92${cleaned}`;
  return cleaned;
}
