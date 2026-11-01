const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const TOKEN_KEY = 'bigbites_admin_token';

export function apiOrigin() {
  return API_URL.replace(/\/api\/v1\/?$/, '');
}

/** Resolve catalog image paths (local /images, uploaded /uploads, or absolute). */
export function assetUrl(src?: string | null) {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  if (src.startsWith('/uploads/')) return `${apiOrigin()}${src}`;
  return src;
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Request failed');
  }
  return res.json();
}

export const adminApi = {
  login: (email: string, password: string) =>
    adminFetch<{ accessToken: string; user: { name: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () =>
    adminFetch<{
      id: string;
      email: string;
      name: string;
      role?: string;
      roleName?: string;
      permissions?: string[];
    }>('/auth/me'),
  roles: () => adminFetch<RolesResponse>('/roles'),
  users: () => adminFetch<AdminUserMember[]>('/roles/users'),
  createUser: (body: { name: string; email: string; password: string; roleId?: string }) =>
    adminFetch<AdminUserMember>('/roles/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateUser: (
    id: string,
    body: { name?: string; email?: string; password?: string; roleId?: string },
  ) =>
    adminFetch<AdminUserMember>(`/roles/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteUser: (id: string) =>
    adminFetch<{ ok: boolean; message: string }>(`/roles/users/${id}`, {
      method: 'DELETE',
    }),
  createRole: (body: { name: string; description?: string; permissions: string[] }) =>
    adminFetch<AdminRole>('/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (
    id: string,
    body: { name?: string; description?: string; permissions?: string[] },
  ) => adminFetch<AdminRole>(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRole: (id: string) =>
    adminFetch<{ ok: boolean; message: string }>(`/roles/${id}`, { method: 'DELETE' }),
  categories: () => adminFetch<AdminCategory[]>('/categories?admin=1'),
  createCategory: (body: unknown) =>
    adminFetch('/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: unknown) =>
    adminFetch(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  reorderCategories: (items: { id: string; displayOrder: number }[]) =>
    adminFetch('/categories/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
  deleteCategory: (id: string) => adminFetch(`/categories/${id}`, { method: 'DELETE' }),
  products: () => adminFetch<AdminProduct[]>('/products?admin=1'),
  createProduct: (body: unknown) =>
    adminFetch('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: unknown) =>
    adminFetch(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  reorderProducts: (items: { id: string; displayOrder: number }[]) =>
    adminFetch('/products/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
  deleteProduct: (id: string) => adminFetch(`/products/${id}`, { method: 'DELETE' }),
  optionGroups: () => adminFetch<AdminOptionGroup[]>('/option-groups'),
  createOptionGroup: (body: unknown) =>
    adminFetch('/option-groups', { method: 'POST', body: JSON.stringify(body) }),
  updateOptionGroup: (id: string, body: unknown) =>
    adminFetch(`/option-groups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteOptionGroup: (id: string) => adminFetch(`/option-groups/${id}`, { method: 'DELETE' }),
  zones: () => adminFetch<AdminZone[]>('/zones/admin/all'),
  createZone: (body: unknown) => adminFetch('/zones', { method: 'POST', body: JSON.stringify(body) }),
  updateZone: (id: string, body: unknown) =>
    adminFetch(`/zones/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteZone: (id: string) => adminFetch(`/zones/${id}`, { method: 'DELETE' }),
  promos: () => adminFetch<AdminPromo[]>('/promos'),
  createPromo: (body: unknown) => adminFetch('/promos', { method: 'POST', body: JSON.stringify(body) }),
  updatePromo: (id: string, body: unknown) =>
    adminFetch(`/promos/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deletePromo: (id: string) => adminFetch(`/promos/${id}`, { method: 'DELETE' }),
  orders: () => adminFetch<AdminOrder[]>('/orders'),
  updateOrderStatus: (id: string, status: string) =>
    adminFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  analytics: (days = 30) =>
    adminFetch<AnalyticsOverview>(`/analytics/overview?days=${days}`),
  uploadImage: async (file: File) => {
    const headers = new Headers();
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${API_URL}/uploads/image`, { method: 'POST', headers, body });
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(
        Array.isArray(err.message) ? err.message.join(', ') : err.message || 'Upload failed',
      );
    }
    return res.json() as Promise<{ url: string; filename: string; size: number; mimeType: string }>;
  },
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  fulfillmentType: 'HOT_NOW' | 'SCHEDULED';
  displayOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  pricePkr: number;
  costPkr?: number | null;
  categoryId: string;
  displayOrder: number;
  isActive: boolean;
  packSize?: string | null;
  weightGrams?: number | null;
  piecesPerPack?: number | null;
  category: { id: string; name: string; slug: string; fulfillmentType: string };
};

export type AnalyticsOverview = {
  range: { from: string; to: string; days: number };
  catalog: {
    products: number;
    categories: number;
    zones: number;
    customers: number;
    productsMissingCost: number;
  };
  kpis: {
    revenuePkr: number;
    merchandisePkr: number;
    discountsPkr: number;
    netMerchandisePkr: number;
    deliveryFeesPkr: number;
    cogsPkr: number;
    grossProfitPkr: number;
    marginPct: number;
    ordersCount: number;
    cancelledCount: number;
    deliveredCount: number;
    aovPkr: number;
    revenueChangePct: number;
    ordersChangePct: number;
    prevRevenuePkr: number;
    prevMerchandisePkr: number;
  };
  revenueByDay: { date: string; revenue: number; orders: number; profit: number }[];
  byStatus: { status: string; count: number; revenue: number }[];
  byFulfillment: { type: string; items: number; revenue: number; orders: number }[];
  byPayment: { method: string; count: number; revenue: number }[];
  byZone: { zone: string; count: number; revenue: number }[];
  topProducts: {
    name: string;
    qty: number;
    revenue: number;
    cogs: number;
    profit: number;
    marginPct: number;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    totalPkr: number;
    paymentMethod: string;
    zone?: string;
    createdAt: string;
    itemCount: number;
  }[];
};

export type AdminOptionGroup = {
  id: string;
  name: string;
  slug: string;
  selectType: string;
  required: boolean;
  minSelect: number;
  maxSelect?: number | null;
  displayOrder: number;
  values: { id: string; label: string; priceDeltaPkr: number; displayOrder: number }[];
};

export type AdminZone = {
  id: string;
  name: string;
  slug: string;
  feePkr: number;
  etaMinutesMin: number;
  etaMinutesMax: number;
  isActive: boolean;
  displayOrder: number;
};

export type AdminPromo = {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  minOrderPkr: number;
  isActive: boolean;
  categoryId?: string | null;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  totalPkr: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: { productName: string; quantity: number; fulfillmentType: string }[];
  deliveryZone: { name: string };
};

export type AdminRole = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  _count?: { users: number };
};

export type AvailablePermission = {
  key: string;
  label: string;
  module: string;
};

export type RolesResponse = {
  roles: AdminRole[];
  availablePermissions: AvailablePermission[];
};

export type AdminUserMember = {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  role?: { id: string; name: string; slug: string; isSystem: boolean } | null;
  createdAt: string;
};
