export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const { hostname, protocol, host } = window.location;
    // Local development (localhost / 127.0.0.1 without reverse proxy)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000/api/v1';
    }
    // LAN dev testing on local Wi-Fi without Nginx
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname)) {
      return `${protocol}//${hostname}:4000/api/v1`;
    }
    // Dedicated API subdomain (if loaded directly on api.bigbites.pk)
    if (hostname === 'api.bigbites.pk') {
      return `${protocol}//api.bigbites.pk/api/v1`;
    }
    // Production domains & server IP fallback (bigbites.pk, admin.bigbites.pk, 116.203.215.86):
    // Use the current host's standard port 80/443 /api/v1 proxy route handled by Nginx.
    // This avoids carrier port blocking, CORS preflights, and mixed content warnings.
    return `${protocol}//${host}/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
}

const SESSION_KEY = 'bigbites_cart_session';
const CUSTOMER_TOKEN_KEY = 'bigbites_customer_token';

export function apiOrigin() {
  return getApiUrl().replace(/\/api\/v1\/?$/, '');
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

async function fetchWithRetry(url: string, init: RequestInit, retries = 2, delayMs = 600): Promise<Response> {
  let targetUrl = url;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(targetUrl, init);
    } catch (err) {
      lastError = err;
      // On connection errors (common on Windows with IPv6/IPv4 localhost binding differences), swap host:
      if (targetUrl.includes('localhost')) {
        targetUrl = targetUrl.replace('localhost', '127.0.0.1');
      } else if (targetUrl.includes('127.0.0.1')) {
        targetUrl = targetUrl.replace('127.0.0.1', 'localhost');
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `BigBites backend API could not be reached at ${url} (${detail}). Please verify your connection or check that the backend is running.`,
  );
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 60_000; // 60 seconds memory cache (server + browser)

function isCacheablePath(
  path: string,
  options?: RequestInit & { cartSession?: boolean; auth?: boolean },
) {
  if (options?.cartSession || options?.auth === true) return false;
  if (options?.method && options.method.toUpperCase() !== 'GET') return false;
  return (
    path.startsWith('/categories') ||
    path.startsWith('/products') ||
    path.startsWith('/zones')
  );
}

async function request<T>(
  path: string,
  options: RequestInit & {
    cartSession?: boolean;
    auth?: boolean;
    next?: { revalidate?: number | false; tags?: string[] };
  } = {},
): Promise<T> {
  const isCacheable = isCacheablePath(path, options);

  if (isCacheable) {
    const cached = memoryCache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    if (inflightRequests.has(path)) {
      return inflightRequests.get(path) as Promise<T>;
    }
  }

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

  const fetchCache =
    options.cache !== undefined
      ? options.cache
      : isCacheable
        ? undefined
        : 'no-store';

  const fetchNext =
    options.next !== undefined
      ? options.next
      : isCacheable
        ? { revalidate: 60 }
        : undefined;

  const fetchPromise = (async () => {
    const res = await fetchWithRetry(`${getApiUrl()}${path}`, {
      ...options,
      headers,
      cache: fetchCache,
      ...(fetchNext ? { next: fetchNext } : {}),
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

    if (isCacheable) {
      memoryCache.set(path, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }

    return data;
  })();

  if (isCacheable) {
    inflightRequests.set(path, fetchPromise);
    fetchPromise.finally(() => {
      inflightRequests.delete(path);
    });
  }

  return fetchPromise;
}

export type StoreStatus = {
  isOpen: boolean;
  notice: string;
};

export const api = {
  storeStatus: () => request<StoreStatus>('/store/status', { auth: false }),
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
