# BigBites - Lahore

Pakistani food e-commerce with dual browsing modes (**Order Now** / **Stock Your Freezer**), fully dynamic categories, and a NestJS API.

## Stack

- `apps/web` - Next.js storefront (port 3000)
- `apps/admin` - Next.js admin panel (port 3001)
- `apps/api` - NestJS REST API (port 4000)
- `packages/shared` - shared Zod schemas & enums
- PostgreSQL + Redis (Docker Compose)

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm --filter @bigbites/shared build
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

Local default uses **SQLite** (`file:./dev.db`) so you can run without Docker. Redis is optional - the API falls back to an in-memory cart store.

For PostgreSQL + Redis via Docker:

```bash
docker compose up -d
# set DATABASE_URL to the postgres URL in .env
# and change prisma provider to "postgresql"
pnpm db:push && pnpm db:seed
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000/api/v1/health

**Admin login:** `admin@bigbites.pk` / `BigBites@Admin1`

**Promo codes (seeded):** `BIGBITES10`, `FREEZER200`

## Dynamic categories

Categories are database-driven. Set `fulfillmentType` to:

- `HOT_NOW` → appears under Order Now
- `SCHEDULED` → appears under Stock Your Freezer

Option groups (spice, size, add-ons, pack size) attach to categories in admin - no frontend code changes required.

## Payments

- **COD** - fully working
- **JazzCash / Easypaisa** - sandbox adapters (simulate via redirect URL)
- **Stripe** - stub adapter (plug `STRIPE_SECRET_KEY` later)
