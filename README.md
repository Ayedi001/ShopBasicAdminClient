# Maison Nour — Clothing Store E-Commerce

Full-stack fashion e-commerce platform for a Tunisian clothing shop. Customers browse Homme / Femme / Enfant collections, choose size and color variants, and place orders for **manual telephone confirmation**. The shop owner manages catalog, stock, orders, promotions, and content from an administration dashboard — **without online payments or courier APIs**.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Prisma 6** + **PostgreSQL** (required — use local Postgres or Vercel Prisma Postgres)
- **Tailwind CSS 3**, Sharp image pipeline, Zod validation
- bcrypt sessions, role-based permissions (Owner / Manager / Employee)
- i18n: French, Arabic (RTL), English — TND currency

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL to a PostgreSQL connection string (Docker, Neon, or Vercel pull)
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open:

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Storefront |
| http://localhost:3000/admin/login | Admin dashboard |

Default seeded owner (development only — set via `.env`):

- Email: value of `SEED_ADMIN_EMAIL` (example: `owner@example.com`)
- Password: value of `SEED_ADMIN_PASSWORD`

**Never** ship a default admin password to production. Create one explicitly:

```bash
npm run admin:create -- --email you@shop.tn --password 'YourStrong1' --name "Propriétaire" --phone 98123456
```

## Deploy on Vercel (+ Prisma Postgres)

The app **requires PostgreSQL**. SQLite (`file:./dev.db`) does not work on Vercel.

1. Import the GitHub repo into Vercel and deploy once (it may fail until the DB is connected — that is OK).
2. In the Vercel project → **Storage** → create / connect **Prisma Postgres**.
3. Confirm these env vars exist for Production (set by the integration):
   - `DATABASE_URL` — direct URL (used by `prisma migrate deploy` at build)
   - `DATABASE_URL_POOLED` — pooled URL (used by the running app)
4. Also set manually:
   - `APP_URL` = `https://your-app.vercel.app` (or your custom domain)
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` if you want the seed to create an owner (optional)
5. **Redeploy** so the build runs `prisma migrate deploy` against the new database.
6. Seed production once (from your machine, with the production `DATABASE_URL`):

```bash
npx vercel env pull .env.production.local
# ensure DATABASE_URL points at the Vercel Prisma DB, then:
npx dotenv -e .env.production.local -- npm run db:seed
# or create only an admin:
npx dotenv -e .env.production.local -- npm run admin:create -- --email you@shop.tn --password 'YourStrong1' --name "Marwen Ayedi" --phone 98123456
```

Without seeding (or `admin:create`), the site builds but the catalog/admin login will be empty.

**Uploads:** product images written to disk do not persist on Vercel’s serverless filesystem. Use demo seed images carefully, or add Blob/S3 later.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:deploy` | Apply migrations (prod) |
| `npm run db:seed` | Seed reference data + demo catalog |
| `npm run db:reset` | Reset DB and re-seed |
| `npm run admin:create` | Create/reset OWNER account |
| `npm run db:backup` | Backup SQLite/Postgres |
| `npm test` | Unit tests |
| `npm run test:acceptance` | Smoke tests (server must be running) |

## Business workflow

1. Customer places an order (pending confirmation).
2. Stock is **reserved** (`reserved` / `available`) but not permanently deducted.
3. Owner calls the customer from the admin order page (tel / WhatsApp).
4. On **Confirm**, stock is deducted atomically.
5. Owner contacts a delivery company independently and updates status: Preparing → Shipped → Delivered.
6. Cancelled orders release or restock inventory.

## Main features

**Storefront:** catalog with combinable filters, search, PDP with color galleries & size guides, cart (session + account merge), wishlist, reviews, coupons, returns/exchanges, order tracking, FR/AR/EN.

**Admin:** dashboard analytics, orders with status history & notes, products with variant matrix & image management, inventory movements, categories, promotions/coupons, homepage/banners, content pages, delivery regions, store settings, staff roles, audit log, CSV exports.

## Backup & restore

```bash
npm run db:backup
npm run db:backup -- --restore backups/maison-shop-….sql
```

Requires `pg_dump` / `psql` on `PATH` for PostgreSQL.

## Environment

See `.env.example`. Important keys:

- `DATABASE_URL` — Postgres direct URL (migrations)
- `DATABASE_URL_POOLED` — Postgres pooled URL (app; set automatically on Vercel)
- `APP_URL` — public site URL (SEO, CSRF origin checks)
- `UPLOAD_DIR` — local media storage (ephemeral on Vercel)
- `SEED_ADMIN_*` — only used by seed / create-admin
- `SEED_DEMO_DATA` — set `false` to skip demo products/orders

## Project layout

```
prisma/           schema, migrations, seed
src/app/(store)/  customer-facing pages
src/app/admin/    administration UI
src/app/api/      REST-style route handlers
src/components/   store + admin UI
src/server/       domain logic (orders, inventory, auth…)
src/i18n/         fr / ar / en dictionaries
storage/uploads/  optimized product media
```

## Security notes

- Passwords hashed with bcrypt (cost 12)
- Staff permissions enforced in API routes, not only in the UI
- Customers can only access their own orders
- Rate limiting on auth endpoints
- Upload type/size validation + image optimization
- Secrets stay in environment variables

## License

Private — all rights reserved for the shop operator.
