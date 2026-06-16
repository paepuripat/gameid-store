# gameid-store

> A Thai digital-product store that sells game account IDs, with **real bank-slip verification** via SlipOK. Built in one episode with [Claude Code](https://docs.claude.com) and deployed on [Cloudflare Workers](https://workers.cloudflare.com).

📺 **Video:** [YouTube link — add after publish]
📝 **Blog:** [Medium link — add after publish]
🔗 **Live:** [https://gameid-store.<subdomain>.workers.dev]

## What this is

A minimal digital-goods store that demonstrates the **pay → verify slip → deliver** loop. Customer pays via PromptPay QR, uploads the bank slip, SlipOK confirms it's real (amount + duplicate check), and the system reveals the game ID on screen. Built as a tutorial — not production-hardened.

**Core loop:**
1. Browse the product grid → click a product → view full detail → click "ซื้อ".
2. Pay the generated PromptPay QR, then upload the bank slip.
3. SlipOK verifies the slip → the system claims a credential from stock and reveals username / password / notes.

This is **EP.1**. Email delivery is EP.2; the admin back-office + auth is EP.3.

## Stack

- [Cloudflare Workers](https://workers.cloudflare.com) — hosting (static assets + Hono API Worker)
- [Vite](https://vite.dev) + [React](https://react.dev) + [React Router](https://reactrouter.com) — front end
- [`@cloudflare/vite-plugin`](https://www.npmjs.com/package/@cloudflare/vite-plugin) — Worker runs in the Vite dev server (one origin, no CORS)
- [Hono](https://hono.dev) — API framework
- [Drizzle](https://orm.drizzle.team) + [Cloudflare D1](https://developers.cloudflare.com/d1/) — database (products, inventory, orders)
- [SlipOK](https://slipok.com/api-documentation/) — Thai bank-slip verification (amount cross-check + duplicate detection)
- [promptpay-qr](https://www.npmjs.com/package/promptpay-qr) + [qrcode.react](https://www.npmjs.com/package/qrcode.react) — generate the PromptPay QR for each order

The SlipOK API key + Branch ID live only in the Worker; the SPA calls a relative `/api/...` path, so the key never reaches the browser. The PromptPay ID is public config (it's encoded in the QR anyway).

## Setup

```bash
# 1. Clone
git clone https://github.com/cqsol/gameid-store.git
cd gameid-store

# 2. Install
pnpm install

# 3. Configure local secrets + config
cp .env.example .dev.vars     # then edit: SLIPOK_API_KEY, SLIPOK_BRANCH_ID
# set VITE_PROMPTPAY_ID in .env (your shop's PromptPay phone/national ID)

# 4. Create D1 + run migrations + seed (local)
wrangler d1 create gameid-store-db        # paste the binding into wrangler.jsonc as "DB"
pnpm drizzle-kit generate
wrangler d1 migrations apply gameid-store-db --local
wrangler d1 execute gameid-store-db --local --file=./seed.sql

# 5. Run (Vite + Worker on one origin)
pnpm run dev
```

Visit the URL Vite prints (e.g. `http://localhost:5173`).

## Deploy

```bash
# Production secrets (not from .dev.vars):
wrangler secret put SLIPOK_API_KEY
wrangler secret put SLIPOK_BRANCH_ID

# Apply migrations + seed to the REMOTE D1 (easy to forget):
wrangler d1 migrations apply gameid-store-db --remote
wrangler d1 execute gameid-store-db --remote --file=./seed.sql

pnpm run deploy
```

This builds the SPA and deploys the static assets and the Worker as one unit to `*.workers.dev`. To update later: change code, run `pnpm run deploy` again.

## Build along with the video

Each checkpoint is a Git tag:

```bash
git checkout checkpoint-1   # storefront + product detail from D1
git checkout checkpoint-2   # checkout + PromptPay QR
git checkout checkpoint-3   # slip verification endpoint (SlipOK)
git checkout checkpoint-4   # claim credential + reveal
git checkout checkpoint-5   # deploy
git checkout main           # final, deployed state
```

The video starts after this scaffold (the prebuild):

```bash
pnpm create cloudflare@latest gameid-store -- --framework=react
pnpm add hono drizzle-orm promptpay-qr qrcode.react react-router-dom
pnpm add -D drizzle-kit
```

## Project structure

```
gameid-store/
├── src/              # React SPA
│   ├── types.ts      # shared types (also used by the Worker)
│   └── pages/        # Storefront, ProductDetail, Checkout, Success
├── worker/
│   ├── index.ts      # Hono API Worker (holds the SlipOK secret)
│   └── db/           # Drizzle client (per request) + schema
├── drizzle/          # generated migrations
├── seed.sql          # sample products + inventory
├── vite.config.ts    # plugins: [react(), cloudflare()]
└── wrangler.jsonc    # name, main, assets, D1 binding
```

## What's NOT included (by design)

Tutorial MVP. Intentionally cut to keep EP.1 focused:

- Email delivery of credentials (→ EP.2)
- Admin back-office to add products/stock + authentication (→ EP.3)
- Cart / multi-item checkout, customer accounts, storing the slip image

See the [blog post](#) for the reasoning.

## License

MIT.

## Credits

Built by [cqsol](https://github.com/cqsol).
Powered by [Claude Code](https://docs.claude.com) and [Cloudflare](https://cloudflare.com), with slip verification by [SlipOK](https://slipok.com).
