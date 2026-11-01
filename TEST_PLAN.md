# BigBites E-Commerce Platform — Comprehensive QA Test Plan

**Document Version:** 1.0.0  
**Target System:** BigBites Storefront (`apps/web`), Admin Panel (`apps/admin`), REST API (`apps/api`), Shared Enums & Schemas (`packages/shared`)  
**Scope:** Functional, Negative, Boundary/Edge, Concurrency, Security, Performance, and Cross-Platform Testing  
**Audience:** QA Engineers, Core Developers, DevOps, Release Managers

---

## 1. Test Strategy & Overview

The BigBites platform combines instant food delivery (`HOT_NOW`) with frozen meal stock delivery (`SCHEDULED`) across Lahore. Because e-commerce directly touches customer money, personal identity, and inventory fulfillment, testing must validate not only standard "happy paths" but also failure handling, network latency, payment webhooks, concurrency, and adversarial tampering.

### Test Levels
1. **Automated Integration Tests (API)**: Fast contract, state, and vulnerability verification using Node.js Test Runner and TypeScript (`tests/audit-flows.test.ts`).
2. **End-to-End Tests (E2E)**: Browser-level user journey automation (Playwright/Cypress) simulating complete checkout, address validation, and coupon application.
3. **Security Penetration Testing**: IDOR fuzzing, CORS tampering, SQL injection payload submission, and brute-force threshold validation.
4. **Performance & Stress Testing**: Headless load tests via k6 simulating peak dinner hour order spikes (Lahore 7:00 PM – 10:00 PM).

---

## 2. Comprehensive Test Case Matrix

| ID | Feature | Scenario | Test Steps | Expected Result | Type | Priority |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-AUTH-01** | Auth | Registered customer signup | 1. Navigate to `/signup`<br>2. Fill Name, unique Email, Phone, Password (>=6 chars)<br>3. Submit | 201 Created. User is logged in, JWT stored, redirected to home or checkout. | Functional | High |
| **TC-AUTH-02** | Auth | Duplicate email signup rejection | 1. Submit signup form with already registered email | 409 Conflict. Error message: "An account with this email already exists". Form preserves non-sensitive fields. | Negative | High |
| **TC-AUTH-03** | Auth | Customer login with valid credentials | 1. Navigate to `/login`<br>2. Enter valid email and password<br>3. Submit | 200 OK. Receives JWT, user session initialized, redirected to destination. | Functional | High |
| **TC-AUTH-04** | Auth | Customer login with wrong password | 1. Enter valid email, wrong password<br>2. Submit | 401 Unauthorized. Error: "Invalid email or password". No user session created. | Negative | High |
| **TC-AUTH-05** | Auth | Brute-force login defense | 1. Send 10 rapid invalid login attempts to `/auth/customer/login` | 429 Too Many Requests triggered by rate limiter after 5 attempts. | Security | High |
| **TC-AUTH-06** | Auth | Customer sign out | 1. Click "Sign out" from header account menu | Token cleared from client. Protected routes (`/account`, `/my-orders`) redirect to `/login`. | Functional | Medium |
| **TC-AUTH-07** | Auth | Password reset request | 1. Click "Forgot Password"<br>2. Enter email<br>3. Click "Send reset link" | Reset email sent with single-use cryptographic token expiring in 15 minutes. | Functional | High |
| **TC-CAT-01** | Catalog | Browse Order Now (`HOT_NOW`) | 1. Navigate to `/order-now`<br>2. Inspect displayed categories and dishes | Only products belonging to categories with `fulfillmentType === HOT_NOW` are displayed. | Functional | High |
| **TC-CAT-02** | Catalog | Browse Stock Your Freezer (`SCHEDULED`) | 1. Navigate to `/stock-freezer`<br>2. Inspect items | Only frozen meal packs with `fulfillmentType === SCHEDULED` are displayed with pack size badges. | Functional | High |
| **TC-CAT-03** | Search | Case-insensitive product search | 1. Type "biryani" in search box<br>2. Type "BIRYANI"<br>3. Type "Biryani" | All queries return the exact same matching products regardless of capitalization. | Functional | High |
| **TC-CAT-04** | Search | Special character search injection | 1. Enter `' OR '1'='1`, `'; DROP TABLE;`, `<script>` in search bar | Escaped safely, no SQL error, no XSS execution. Displays "No products found". | Security | High |
| **TC-CAT-05** | Options | Required option group enforcement | 1. Open product modal with required option (e.g. Spice Level)<br>2. Try adding to cart without selecting option | Add button disabled or error prompt "Spice Level is required". Item not added. | Negative | High |
| **TC-CAT-06** | Options | Multi-select and quantity options | 1. Select 2 add-ons (extra cheese + extra dip)<br>2. Add to cart | Unit price increases by sum of `priceDeltaPkr` of selected values. Item added with selections array. | Functional | Medium |
| **TC-CART-01** | Cart | Add item as guest | 1. Add item to cart without logging in<br>2. Inspect header cart badge and floating cart | Cart item count increments. `x-cart-session` UUID assigned. Total price updates. | Functional | High |
| **TC-CART-02** | Cart | Update item quantity | 1. Open cart drawer<br>2. Click `+` to increase qty from 1 to 3<br>3. Click `-` to decrease to 2 | Line total and subtotal update instantly. Quantity clamps between 1 and 99. | Functional | High |
| **TC-CART-03** | Cart | Remove item from cart | 1. Click trash icon on line item in cart | Item removed. Subtotal recalculates. If last item, cart displays "Cart is empty". | Functional | Medium |
| **TC-CART-04** | Cart | Cart persistence after customer login | 1. Add items to cart as guest<br>2. Navigate to `/login` and sign in | Guest cart items are merged with any existing customer cart without losing items. | Functional | High |
| **TC-CART-05** | Cart | Out of stock handling | 1. Item in cart has stock reduced to 0 by kitchen admin<br>2. View cart | Item flagged as "Out of Stock". Checkout button disabled until removed. | Edge | High |
| **TC-CHK-01** | Checkout | Phone number validation (Pakistan format) | 1. Enter `12345` into phone field<br>2. Enter `03001234567`<br>3. Enter `+923001234567` | Invalid phone rejects with error. Valid formats accepted and normalized. | Negative | High |
| **TC-CHK-02** | Checkout | Delivery Zone fee calculation | 1. Select "Gulberg" (Fee Rs 150)<br>2. Select "Bahria Town" (Fee Rs 300) | Order summary delivery fee updates dynamically to match selected zone's `feePkr`. | Functional | High |
| **TC-CHK-03** | Checkout | Self Pick-Up fee waiver | 1. Toggle "Pick-Up"<br>2. Submit order | Web and backend both calculate delivery fee as Rs 0. Address sets to Central Kitchen. | Functional | High |
| **TC-CHK-04** | Checkout | Valid promo code application | 1. Apply `BIGBITES10` on order exceeding Rs 1000 | 10% discount subtracted from subtotal. Promo banner shows success. Total reflects discount. | Functional | High |
| **TC-CHK-05** | Checkout | Expired promo code rejection | 1. Apply expired coupon code | Error message: "Promo expired". Discount remains 0. | Negative | Medium |
| **TC-CHK-06** | Checkout | Promo below minimum order amount | 1. Add Rs 400 item to cart<br>2. Apply coupon with Rs 1000 minimum order | Error message: "Minimum order Rs 1000 for this promo". Discount remains 0. | Negative | High |
| **TC-CHK-07** | Checkout | Scheduled delivery slot selection | 1. Add frozen item to cart<br>2. Select delivery day "Tomorrow" and window "Dinner" | `scheduledFor` timestamp correctly calculated and saved with order record. | Functional | High |
| **TC-PAY-01** | Payment | Cash on Delivery (COD) order | 1. Select COD payment method<br>2. Click "Confirm Order" | Order created with `status: CONFIRMED`, `paymentStatus: PENDING`. Redirects to tracking page. | Functional | High |
| **TC-PAY-02** | Payment | Stripe card payment success | 1. Select Stripe<br>2. Enter valid test card on Stripe Checkout<br>3. Complete payment | Webhook verifies signature, updates `paymentStatus: PAID`, `status: CONFIRMED`. | Functional | High |
| **TC-PAY-03** | Payment | Stripe payment cancelled/declined | 1. Cancel payment on Stripe hosted page or simulate declined card | Payment marked `FAILED`. Order remains unconfirmed. User prompted to retry or change method. | Negative | High |
| **TC-PAY-04** | Payment | Rapid double-submit / idempotency | 1. Double-click "Confirm Order" within 50ms<br>2. Intercept network and send duplicate payload | Only ONE order is created in database. Same order reference returned. | Edge | High |
| **TC-PAY-05** | Payment | Duplicate webhook delivery | 1. Send same payment webhook event twice from payment gateway | First marks order PAID; second acknowledges 200 OK without double-processing or errors. | Edge | High |
| **TC-PAY-06** | Payment | Unauthenticated sandbox complete tampering | 1. Attacker calls `GET /api/v1/payments/sandbox/complete?ref=...` directly | Rejected with 403 Forbidden or 404 Not Found. Requires valid HMAC signature. | Security | High |
| **TC-ORD-01** | Orders | Order confirmation notification | 1. Place successful order | Customer receives confirmation email and SMS with order number and tracking link. | Functional | High |
| **TC-ORD-02** | Orders | Live order tracking status progression | 1. Admin updates status: CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED | Tracking UI reflects state change via polling/SSE without requiring page refresh. | Functional | Medium |
| **TC-ORD-03** | Orders | Customer order cancellation window | 1. Customer clicks "Cancel Order" within 5 minutes of placement (before PREPARING) | Status set to CANCELLED. Kitchen notified. Refund initiated if digital payment. | Functional | High |
| **TC-INV-01** | Inventory | Concurrency race condition on last item | 1. Product has stock = 1<br>2. User A and User B submit checkout concurrently | Exactly ONE user succeeds. Other user receives "Item is out of stock" error. Stock never goes negative. | Concurrency | High |
| **TC-ADM-01** | Admin | Unauthenticated user cannot access admin | 1. Access `http://localhost:3001/orders` without admin token | Redirects immediately to `/login`. API returns 401 Unauthorized. | Security | High |
| **TC-ADM-02** | Admin | Customer token cannot access admin routes | 1. Send customer Bearer token to `GET /orders` or `POST /products` | 401 Unauthorized / "Admin access required". | Security | High |
| **TC-ADM-03** | Admin | Product CRUD management | 1. Create new product in admin<br>2. Edit price and image<br>3. Toggle active status | Changes persist in DB and reflect on customer storefront within cache window. | Functional | High |
| **TC-SEC-01** | Security | IDOR on order tracking endpoint | 1. Request `GET /orders/:id/tracking` for another customer's order without auth | Sensitive PII (phone number, full home address) must be masked or blocked. | Security | High |
| **TC-SEC-02** | Security | CORS origin reflection verification | 1. Send request with `Origin: https://malicious-site.com` | API must NOT return `Access-Control-Allow-Origin: https://malicious-site.com`. Reject with CORS error. | Security | High |
| **TC-SEC-03** | Security | Client-side price tampering | 1. Intercept checkout request and modify `subtotalPkr` or product prices | Ignored. Backend recalculates subtotal strictly from catalog product prices in DB. | Security | High |
| **TC-PERF-01**| Performance | Catalog load under peak traffic | 1. Run k6 load test: 100 concurrent virtual users hitting `GET /products` for 5 min | 95th percentile latency < 250ms. Error rate < 0.1%. | Performance | High |
| **TC-PERF-02**| Performance | Checkout throughput under load | 1. Run k6 load test: 20 concurrent checkouts per second | Server CPU < 70%, database connections pooled without timeout. | Performance | High |
| **TC-UX-01**  | UX/Responsive | Mobile viewport layout & drawer | 1. Test storefront and checkout on iPhone 14 (390px) and Android (360px) viewports | No horizontal scrollbars, sticky cart drawer accessible, location modal centered. | UX | Medium |

---

## 3. Automated Test Suite Execution Guide

An automated test suite covering authentication, RBAC, cart option validation, promos, checkout, and security vulnerability confirmations has been implemented in:
`tests/audit-flows.test.ts`

### Running the Tests Locally

Make sure the API backend is running (`pnpm dev:api` or `pnpm dev`):

```bash
# Execute integration test suite
pnpm test
```

Or execute directly with Node's native test runner via `tsx`:

```bash
pnpm --filter @bigbites/api exec tsx --test ../../tests/audit-flows.test.ts
```

### Extending with End-to-End Browser Tests (Playwright)

For browser-level automated testing of user clicks, modals, and responsive layout, install and initialize Playwright:

```bash
pnpm add -D -w @playwright/test
npx playwright install --with-deps
```

Create `tests/e2e/checkout-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('BigBites Storefront E2E Checkout', () => {
  test('User can browse menu, customize options, and complete checkout', async ({ page }) => {
    await page.goto('http://localhost:3000/order-now');
    
    // Select first product card
    await page.locator('.product-card').first().click();
    
    // Select required spice level if modal appears
    const optionRadio = page.locator('input[type="radio"]').first();
    if (await optionRadio.isVisible()) {
      await optionRadio.check();
    }
    
    // Add to cart
    await page.click('button:has-text("Add to Cart")');
    
    // Open floating cart and proceed to checkout
    await page.click('a[href="/checkout"]');
    await expect(page).toHaveURL(/.*checkout/);
    
    // Fill delivery form
    await page.fill('input[name="customerName"]', 'Automated QA Tester');
    await page.fill('input[name="customerPhone"]', '03001234567');
    await page.fill('textarea[name="addressLine"]', 'House 45, Sector B, DHA Phase 5, Lahore');
    
    // Select COD
    await page.check('input[value="COD"]');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify redirection to live tracking
    await expect(page).toHaveURL(/.*orders\/BB-.*/);
    await expect(page.locator('h1')).toContainText('BB-');
    await expect(page.locator('text=Order Placed Successfully')).toBeVisible();
  });
});
```

---

## 4. Performance & Load Testing Specifications (k6)

### Key Endpoint Target Metrics

| Endpoint | Target Concurrent Users (VUs) | Target RPS | Max P95 Latency | Error Threshold |
| :--- | :---: | :---: | :---: | :---: |
| `GET /api/v1/health` | 200 | 500 | < 50ms | 0.00% |
| `GET /api/v1/products` | 150 | 250 | < 200ms | < 0.1% |
| `GET /api/v1/categories` | 150 | 250 | < 150ms | < 0.1% |
| `POST /api/v1/cart/items` | 100 | 100 | < 300ms | < 0.1% |
| `POST /api/v1/orders` (Checkout) | 50 | 30 | < 800ms | < 0.2% |

### Sample k6 Load Script (`tests/load-test.js`)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 100 }, // Sustain peak dinner rush
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests must complete below 300ms
    http_req_failed: ['rate<0.01'],    // Error rate must stay below 1%
  },
};

export default function () {
  const res = http.get('http://localhost:4000/api/v1/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'body has products': (r) => r.json().length > 0,
  });
  sleep(1);
}
```

---
*QA Plan approved for BigBites Lahore production release lifecycle.*
