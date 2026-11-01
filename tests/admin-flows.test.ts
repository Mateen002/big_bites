import { describe, it } from 'node:test';
import assert from 'node:assert';

const API_BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

describe('BigBites Admin Operations & Performance Test Suite', () => {
  let adminToken = '';
  let customerToken = '';
  let createdCategoryId = '';
  let createdProductId = '';
  let createdOptionGroupId = '';
  let createdZoneId = '';
  let createdPromoId = '';
  let testOrderId = '';

  // 1. Admin Authentication
  it('01. Admin Login succeeds and returns JWT with admin role', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@bigbites.pk',
        password: process.env.ADMIN_PASSWORD || 'BigBites@Admin1',
      }),
    });
    assert.strictEqual(res.status, 201, 'Admin login should succeed');
    const data = await res.json();
    assert.ok(data.accessToken, 'Must return JWT accessToken');
    assert.strictEqual(data.user?.role, 'admin');
    adminToken = data.accessToken;
  });

  it('02. Admin /auth/me returns admin identity', async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const me = await res.json();
    assert.strictEqual(me.role, 'admin');
    assert.ok(me.email);
  });

  // 2. RBAC Enforcement
  it('03. RBAC: Unauthenticated requests to admin routes return 401', async () => {
    const res = await fetch(`${API_BASE}/orders`);
    assert.strictEqual(res.status, 401, 'Unauthenticated access to /orders must be rejected');
  });

  it('04. RBAC: Customer tokens cannot perform admin operations', async () => {
    // Generate a quick customer token
    const custRes = await fetch(`${API_BASE}/auth/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin RBAC Tester',
        email: `rbac-test-${Date.now()}@example.com`,
        password: 'Password123!',
      }),
    });
    const custData = await custRes.json();
    customerToken = custData.accessToken;

    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        name: 'Hacked Category',
        slug: 'hacked-cat',
        fulfillmentType: 'HOT_NOW',
      }),
    });
    assert.strictEqual(res.status, 401, 'Customer token must be rejected with 401 on admin routes');
  });

  // 3. Category Management CRUD
  it('05. Categories: Admin can fetch all categories (including inactive)', async () => {
    const res = await fetch(`${API_BASE}/categories?admin=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list), 'Should return list of categories');
    assert.ok(list.length > 0, 'Catalog should have at least 1 category');
  });

  it('06. Categories: Admin can create a new category', async () => {
    const uniqueSlug = `admin-cat-${Date.now()}`;
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Gourmet Category',
        slug: uniqueSlug,
        description: 'Created by automated admin test suite',
        fulfillmentType: 'HOT_NOW',
        displayOrder: 99,
        isActive: true,
      }),
    });
    assert.strictEqual(res.status, 201, 'Category creation should return 201');
    const cat = await res.json();
    assert.strictEqual(cat.slug, uniqueSlug);
    createdCategoryId = cat.id;
  });

  it('07. Categories: Admin can update an existing category', async () => {
    const res = await fetch(`${API_BASE}/categories/${createdCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Gourmet Category',
        description: 'Updated description by admin test',
      }),
    });
    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.name, 'Updated Gourmet Category');
  });

  it('08. Categories: Admin can reorder categories', async () => {
    const listRes = await fetch(`${API_BASE}/categories?admin=1`);
    const list = await listRes.json();
    if (list.length >= 2) {
      const items = [
        { id: list[0].id, displayOrder: 2 },
        { id: list[1].id, displayOrder: 1 },
      ];
      const res = await fetch(`${API_BASE}/categories/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ items }),
      });
      assert.strictEqual(res.status, 200);
    }
  });

  // 4. Product Management CRUD
  it('09. Products: Admin can create a new product with cost and margin', async () => {
    const uniqueSlug = `admin-prod-${Date.now()}`;
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Admin Test Burger',
        slug: uniqueSlug,
        description: 'Succulent double patty with special secret sauce',
        pricePkr: 1200,
        costPkr: 650,
        categoryId: createdCategoryId,
        displayOrder: 99,
        isActive: true,
      }),
    });
    assert.strictEqual(res.status, 201, 'Product creation should return 201');
    const prod = await res.json();
    assert.strictEqual(prod.slug, uniqueSlug);
    assert.strictEqual(prod.pricePkr, 1200);
    assert.strictEqual(prod.costPkr, 650);
    createdProductId = prod.id;
  });

  it('10. Products: Admin can update product pricing and details', async () => {
    const res = await fetch(`${API_BASE}/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        pricePkr: 1350,
        costPkr: 700,
        description: 'Updated recipe with extra cheese',
      }),
    });
    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.pricePkr, 1350);
    assert.strictEqual(updated.costPkr, 700);
  });

  it('11. Products: Admin can disable (soft delete) a product', async () => {
    const res = await fetch(`${API_BASE}/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);

    // Verify it is now inactive in admin list
    const adminListRes = await fetch(`${API_BASE}/products?admin=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminProducts = await adminListRes.json();
    const found = adminProducts.find((p: any) => p.id === createdProductId);
    assert.ok(found, 'Product should still exist in admin list');
    assert.strictEqual(found.isActive, false, 'Product should be marked inactive');
  });

  // 5. Option Groups CRUD
  it('12. Option Groups: Admin can create an option group with values', async () => {
    const uniqueSlug = `admin-og-${Date.now()}`;
    const res = await fetch(`${API_BASE}/option-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Extra Sauce',
        slug: uniqueSlug,
        selectType: 'SINGLE',
        required: false,
        minSelect: 0,
        maxSelect: 1,
        displayOrder: 1,
        values: [
          { label: 'Garlic Mayo', priceDeltaPkr: 50, displayOrder: 1 },
          { label: 'Smoky BBQ', priceDeltaPkr: 60, displayOrder: 2 },
        ],
      }),
    });
    assert.strictEqual(res.status, 201);
    const og = await res.json();
    assert.strictEqual(og.slug, uniqueSlug);
    assert.strictEqual(og.values.length, 2);
    createdOptionGroupId = og.id;
  });

  it('13. Option Groups: Admin can delete an option group', async () => {
    const res = await fetch(`${API_BASE}/option-groups/${createdOptionGroupId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  // 6. Delivery Zones CRUD
  it('14. Zones: Admin can view all zones and create a new delivery zone', async () => {
    const uniqueSlug = `zone-test-${Date.now()}`;
    const res = await fetch(`${API_BASE}/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Bahria Town Lahore',
        slug: uniqueSlug,
        feePkr: 280,
        etaMinutesMin: 35,
        etaMinutesMax: 50,
        isActive: true,
        displayOrder: 10,
      }),
    });
    assert.strictEqual(res.status, 201);
    const zone = await res.json();
    assert.strictEqual(zone.slug, uniqueSlug);
    assert.strictEqual(zone.feePkr, 280);
    createdZoneId = zone.id;
  });

  it('15. Zones: Admin can update delivery fee and deactivate a zone', async () => {
    const res = await fetch(`${API_BASE}/zones/${createdZoneId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        feePkr: 320,
        isActive: false,
      }),
    });
    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.feePkr, 320);
    assert.strictEqual(updated.isActive, false);

    // Clean up
    await fetch(`${API_BASE}/zones/${createdZoneId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  // 7. Promo Codes CRUD
  it('16. Promos: Admin can create a percentage discount promo code', async () => {
    const uniqueCode = `TESTPROMO${Date.now().toString().slice(-4)}`;
    const res = await fetch(`${API_BASE}/promos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: uniqueCode,
        name: 'Flash Sale Test',
        discountType: 'PERCENT',
        discountValue: 15,
        minOrderPkr: 1000,
        isActive: true,
      }),
    });
    assert.strictEqual(res.status, 201);
    const promo = await res.json();
    assert.strictEqual(promo.code, uniqueCode);
    createdPromoId = promo.id;

    // Validate with public checkout API
    const valRes = await fetch(`${API_BASE}/promos/validate?code=${uniqueCode}&subtotal=2000`);
    assert.strictEqual(valRes.status, 200);
    const valData = await valRes.json();
    assert.strictEqual(valData.discountPkr, 300, '15% of 2000 should be 300 PKR');

    // Clean up
    await fetch(`${API_BASE}/promos/${createdPromoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  // 8. Order & Kitchen Management
  it('17. Orders: Admin can fetch orders list and inspect details', async () => {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const orders = await res.json();
    assert.ok(Array.isArray(orders), 'Should return array of orders');
    if (orders.length > 0) {
      testOrderId = orders[0].id;
      assert.ok(orders[0].orderNumber);
      assert.ok(orders[0].status);
      assert.ok(orders[0].customerName);
      assert.ok(Array.isArray(orders[0].items));
    }
  });

  it('18. Orders: Admin can transition order status through the complete lifecycle', async () => {
    if (!testOrderId) return;

    // Transition PENDING -> CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
    const statuses = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    for (const st of statuses) {
      const res = await fetch(`${API_BASE}/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: st }),
      });
      assert.strictEqual(res.status, 200, `Transition to ${st} should succeed`);
      const updated = await res.json();
      assert.strictEqual(updated.status, st);
    }
  });

  // 9. Analytics & Performance Benchmark
  it('19. Analytics: Returns complete financial & operational KPIs for 7d, 30d, 90d', async () => {
    for (const d of [7, 30, 90]) {
      const start = Date.now();
      const res = await fetch(`${API_BASE}/analytics/overview?days=${d}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const latencyMs = Date.now() - start;
      assert.strictEqual(res.status, 200, `Analytics for ${d}d should return 200`);

      // Verify in-memory cache hit is sub-200ms
      const cacheStart = Date.now();
      const cacheRes = await fetch(`${API_BASE}/analytics/overview?days=${d}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const cacheLatency = Date.now() - cacheStart;
      assert.strictEqual(cacheRes.status, 200);
      assert.ok(cacheLatency < 200, `Cached analytics should be under 200ms (took ${cacheLatency}ms)`);

      const data = await res.json();
      assert.ok(data.range, 'Range must be present');
      assert.strictEqual(data.range.days, d);
      assert.ok(data.kpis, 'KPIs object must be present');
      assert.strictEqual(typeof data.kpis.revenuePkr, 'number');
      assert.strictEqual(typeof data.kpis.grossProfitPkr, 'number');
      assert.strictEqual(typeof data.kpis.marginPct, 'number');
      assert.strictEqual(typeof data.kpis.aovPkr, 'number');
      assert.ok(Array.isArray(data.revenueByDay), 'revenueByDay must be array');
      assert.ok(Array.isArray(data.byStatus), 'byStatus must be array');
      assert.ok(Array.isArray(data.byFulfillment), 'byFulfillment must be array');
      assert.ok(Array.isArray(data.topProducts), 'topProducts must be array');
      assert.ok(Array.isArray(data.recentOrders), 'recentOrders must be array');
      assert.ok(data.catalog.products > 0, 'Catalog should count products');
    }
  });

  it('20. Clean up test category created in suite', async () => {
    if (createdCategoryId) {
      const res = await fetch(`${API_BASE}/categories/${createdCategoryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
    }
  });
});
