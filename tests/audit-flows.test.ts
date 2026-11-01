import { describe, it } from 'node:test';
import assert from 'node:assert';

const API_BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

describe('BigBites API Production Readiness Test Suite', () => {
  let adminToken = '';
  let customerToken = '';
  let customerEmail = `qa-audit-${Date.now()}@example.com`;
  let sampleProduct: any = null;
  let sampleZoneId = '';
  let createdOrderId = '';
  let createdOrderNumber = '';
  const testSessionId = `test-cart-${Date.now()}`;

  // 1. Health check
  it('01. Health Check returns 200 OK and service metadata', async () => {
    const res = await fetch(`${API_BASE}/health`);
    assert.strictEqual(res.status, 200, 'Health endpoint should return 200');
    const data = await res.json();
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.service, 'bigbites-api');
    assert.strictEqual(data.database, 'connected');
  });

  // 2. Auth: Admin login
  it('02. Admin Login succeeds with seeded credentials', async () => {
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

  // 3. Auth: Customer signup and login
  it('03. Customer Signup successfully registers a new customer', async () => {
    const res = await fetch(`${API_BASE}/auth/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'QA Test User',
        email: customerEmail,
        password: 'Password123!',
        phone: '03001234567',
      }),
    });
    assert.strictEqual(res.status, 201, 'Customer signup should return 201');
    const data = await res.json();
    assert.ok(data.accessToken, 'Must return JWT token');
    assert.strictEqual(data.user?.role, 'customer');
    customerToken = data.accessToken;
  });

  it('04. Customer Signup rejects duplicate email with 409 Conflict', async () => {
    const res = await fetch(`${API_BASE}/auth/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: customerEmail,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(res.status, 409, 'Duplicate signup should return 409 Conflict');
  });

  // 4. Role-based access control
  it('05. RBAC: Normal customer cannot access admin routes (GET /orders)', async () => {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 401, 'Customer token must be rejected on admin routes');
  });

  it('06. RBAC: Admin can access admin routes (GET /orders)', async () => {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200, 'Admin token should be accepted on admin routes');
  });

  // 5. Product catalog & Zones discovery
  it('07. Catalog: Fetches active products and delivery zones', async () => {
    const pRes = await fetch(`${API_BASE}/products`);
    assert.strictEqual(pRes.status, 200);
    const products = await pRes.json();
    assert.ok(Array.isArray(products) && products.length > 0, 'Catalog should have products');

    // Fetch detailed product by slug to get full option groups
    const detailRes = await fetch(`${API_BASE}/products/${products[0].slug}`);
    sampleProduct = await detailRes.json();
    assert.ok(sampleProduct.id);

    const zRes = await fetch(`${API_BASE}/zones`);
    assert.strictEqual(zRes.status, 200);
    const zones = await zRes.json();
    assert.ok(Array.isArray(zones) && zones.length > 0, 'Should have delivery zones');
    sampleZoneId = zones[0].id;
  });

  // 6. Cart Flow
  it('08. Cart: Add product with required options and verify subtotal', async () => {
    // Build valid selections if option groups are required
    const selections = (sampleProduct.optionGroups || [])
      .filter((og: any) => og.required && og.values?.length > 0)
      .map((og: any) => ({
        optionGroupId: og.id,
        optionValueId: og.values[0].id,
        quantity: 1,
      }));

    const res = await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cart-session': testSessionId,
      },
      body: JSON.stringify({
        productId: sampleProduct.id,
        quantity: 4,
        selections,
      }),
    });
    assert.strictEqual(res.status, 201);
    const cart = await res.json();
    assert.strictEqual(cart.itemCount, 4);
    assert.ok(cart.subtotalPkr >= 1000);
  });

  // 7. Promo validation
  it('09. Promo: Validates active promo code BIGBITES10 via GET endpoint', async () => {
    const res = await fetch(`${API_BASE}/promos/validate?code=BIGBITES10&subtotal=2000`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.discountPkr > 0, 'Promo discount should be greater than 0');
  });

  it('10. Promo: Rejects nonexistent promo code with 400 Bad Request', async () => {
    const res = await fetch(`${API_BASE}/promos/validate?code=NON_EXISTENT_COUPON_XYZ&subtotal=2000`);
    assert.strictEqual(res.status, 400);
  });

  // 8. Checkout Flow
  it('11. Checkout: Successfully places COD order and clears cart', async () => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cart-session': testSessionId,
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        customerName: 'QA Test User',
        customerPhone: '03001234567',
        customerEmail: customerEmail,
        addressLine: 'House 123, Street 4, Gulberg III, Lahore',
        deliveryZoneId: sampleZoneId,
        paymentMethod: 'COD',
        promoCode: 'BIGBITES10',
      }),
    });
    assert.strictEqual(res.status, 201);
    const order = await res.json();
    assert.ok(order.id);
    assert.ok(order.orderNumber);
    assert.strictEqual(order.paymentMethod, 'COD');
    assert.strictEqual(order.status, 'CONFIRMED');
    createdOrderId = order.id;
    createdOrderNumber = order.orderNumber;

    // Verify cart is cleared
    const cartRes = await fetch(`${API_BASE}/cart`, {
      headers: { 'x-cart-session': testSessionId },
    });
    const cart = await cartRes.json();
    assert.strictEqual(cart.items.length, 0, 'Cart should be empty after checkout');
  });

  it('12. Checkout: Rejects checkout when cart is empty', async () => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cart-session': testSessionId, // empty now
      },
      body: JSON.stringify({
        customerName: 'QA Test User',
        customerPhone: '03001234567',
        addressLine: 'House 123, Lahore',
        deliveryZoneId: sampleZoneId,
        paymentMethod: 'COD',
      }),
    });
    assert.strictEqual(res.status, 400, 'Should reject empty cart with 400');
  });

  // 9. Security & Production-Readiness Verifications
  it('13. SECURITY VERIFICATION: Guest order tracking masks PII, while authenticated admin gets full view', async () => {
    assert.ok(createdOrderId, 'Order must exist from previous test');
    // Public guest tracking
    const res = await fetch(`${API_BASE}/orders/${createdOrderId}/tracking`);
    assert.strictEqual(res.status, 200, 'Tracking endpoint responds 200');
    const order = await res.json();
    
    // PII Masking verification
    assert.ok(order.customerPhone.includes('••••'), 'customerPhone must be masked with bullet points for guests');
    assert.ok(order.addressLine.includes('••••'), 'addressLine must be masked for guests');
    assert.strictEqual(order.notes, undefined, 'Internal notes must be omitted in public guest tracking');

    // Authenticated admin tracking
    const adminRes = await fetch(`${API_BASE}/orders/${createdOrderId}/tracking`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
    const adminOrder = await adminRes.json();
    assert.strictEqual(adminOrder.customerPhone, '03001234567', 'Admin receives full unmasked phone');
    assert.ok(adminOrder.addressLine.includes('Gulberg III'), 'Admin receives full unmasked address');
  });

  it('14. SECURITY VERIFICATION: CORS rejects arbitrary origins and does not reflect credentials', async () => {
    const attackerOrigin = 'https://evil-hacker-site.com';
    const res = await fetch(`${API_BASE}/health`, {
      headers: { Origin: attackerOrigin },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    assert.notStrictEqual(
      allowOrigin,
      attackerOrigin,
      'CORS Security: API must NOT reflect arbitrary attacker origin back',
    );
  });

  it('15. PAYMENT VERIFICATION: Digital payment gateways rejected while offline and sandbox complete is disabled', async () => {
    const paySession = `test-pay-${Date.now()}`;
    const selections = (sampleProduct.optionGroups || [])
      .filter((og: any) => og.required && og.values?.length > 0)
      .map((og: any) => ({
        optionGroupId: og.id,
        optionValueId: og.values[0].id,
        quantity: 1,
      }));

    await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cart-session': paySession },
      body: JSON.stringify({ productId: sampleProduct.id, quantity: 1, selections }),
    });

    // Attempting online payment when disabled should return 400 Bad Request
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cart-session': paySession },
      body: JSON.stringify({
        customerName: 'QA Test User',
        customerPhone: '03001234567',
        addressLine: 'House 123, Lahore',
        deliveryZoneId: sampleZoneId,
        paymentMethod: 'STRIPE',
      }),
    });
    assert.strictEqual(res.status, 400, 'Must reject digital payment when online payments are offline');
    const err = await res.json();
    assert.ok(err.message.includes('Cash on Delivery'), 'Error instructs user to use Cash on Delivery');

    // Attempting sandbox complete returns 400
    const sandboxRes = await fetch(`${API_BASE}/payments/sandbox/complete?ref=FAKE-REF`);
    assert.strictEqual(sandboxRes.status, 400, 'Sandbox mark-paid must be rejected');
  });

  it('16. COMMERCE VERIFICATION: Pickup orders apply Rs 0 delivery fee', async () => {
    const pickupSession = `test-pickup-${Date.now()}`;
    const selections = (sampleProduct.optionGroups || [])
      .filter((og: any) => og.required && og.values?.length > 0)
      .map((og: any) => ({
        optionGroupId: og.id,
        optionValueId: og.values[0].id,
        quantity: 1,
      }));

    await fetch(`${API_BASE}/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cart-session': pickupSession },
      body: JSON.stringify({ productId: sampleProduct.id, quantity: 1, selections }),
    });

    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cart-session': pickupSession },
      body: JSON.stringify({
        customerName: 'Pickup Tester',
        customerPhone: '03001234567',
        addressLine: 'Self Pickup at Gulberg Central Kitchen',
        deliveryZoneId: sampleZoneId,
        paymentMethod: 'COD',
        orderType: 'PICKUP',
      }),
    });
    assert.strictEqual(res.status, 201, 'Pickup order succeeds');
    const order = await res.json();
    assert.strictEqual(order.deliveryFeePkr, 0, 'Delivery fee must be 0 for PICKUP orders');
  });
});
