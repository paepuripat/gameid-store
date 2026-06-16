# gameid-store

> A Thai digital-product store that sells game account IDs, with **real bank-slip verification** via SlipOK. Built in public with [Claude Code](https://docs.claude.com) and deployed on [Cloudflare Workers](https://workers.cloudflare.com).

📺 **Video:** [YouTube link — add after publish]
📝 **Blog:** [Medium link — add after publish]
🔗 **Live:** [https://gameid-store.<subdomain>.workers.dev]

## What this is

A minimal digital-goods store that demonstrates the **pay → verify slip → deliver** loop. Customer pays via PromptPay QR, uploads the bank slip, SlipOK confirms it's real (amount + duplicate check), and the system delivers the game ID. Built as a tutorial — not production-hardened.

**Core loop:**
1. Browse products and pick a game ID.
2. Pay the generated PromptPay QR, then upload the bank slip.
3. SlipOK verifies the slip → the system claims a credential from stock and delivers username / password / notes.

## Episodes

This is a build-in-public series. Each episode ships a deployed, working app and adds one layer.

| EP | Adds | Delivery | Auth | Status |
|----|------|----------|------|--------|
| **1** | Storefront, PromptPay QR checkout, SlipOK slip verification, stock claim | On-screen reveal | none | ← you are here |
| **2** | Auto-email the credential (Resend) + `pending → paid → delivered` lifecycle + resend | Email (on-screen fallback) | none | planned |
| **3** | Admin back-office: manage products, add stock, view orders (Better Auth, admin-only) | — | admin login | planned |

Each episode is independent to follow but builds on the previous repo state. Checkpoint tags are prefixed per episode (`checkpoint-N` for EP.1, `ep2-checkpoint-N`, `ep3-checkpoint-N`).

## Stack

- [Cloudflare Workers](https://workers.cloudflare.com) — hosting (static assets + Hono API Worker)
- [Vite](https://vite.dev) + [React](https://react.dev) + [React Router](https://reactrouter.com) — front end
- [`@cloudflare/vite-plugin`](https://www.npmjs.com/package/@cloudflare/vite-plugin) — Worker runs in the Vite dev server (one origin, no CORS)
- [Hono](https://hono.dev) — API framework
- [Drizzle](https://orm.drizzle.team) + [Cloudflare D1](https://developers.cloudflare.com/d1/) — database (products, inventory, orders)
- [SlipOK](https://slipok.com/api-documentation/) — Thai bank-slip verification (amount cross-check + duplicate detection)
- [promptpay-qr](https://www.npmjs.com/package/promptpay-qr) + [qrcode.react](https://www.npmjs.com/package/qrcode.react) — generate the PromptPay QR for each order
- [Resend](https://resend.com) — transactional email *(added in EP.2)*
- [Better Auth](https://better-auth.com) — admin authentication *(added in EP.3)*

The SlipOK API key + Branch ID (and later the Resend key + Better Auth secret) live only in the Worker; the SPA calls a relative `/api/...` path, so secrets never reach the browser. The PromptPay ID is public config (it's encoded in the QR anyway).

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

## Environment variables

| Name | Where | Secret? | Introduced | Purpose |
|------|-------|---------|-----------|---------|
| `SLIPOK_API_KEY` | Worker env | yes | EP.1 | SlipOK auth |
| `SLIPOK_BRANCH_ID` | Worker env | yes | EP.1 | SlipOK branch in the URL |
| `VITE_PROMPTPAY_ID` | build (`.env`) | no | EP.1 | PromptPay payee for the QR |
| `RESEND_API_KEY` | Worker env | yes | EP.2 | Resend auth |
| `RESEND_FROM` | Worker env | no | EP.2 | Verified sender address |
| `BETTER_AUTH_SECRET` | Worker env | yes | EP.3 | Better Auth signing secret |
| `BETTER_AUTH_URL` | Worker env | no | EP.3 | Deployed origin for auth callbacks/cookies |

Local secrets go in `.dev.vars` (gitignored); production secrets via `wrangler secret put <NAME>`.

## Deploy

```bash
# Production secrets (not from .dev.vars):
wrangler secret put SLIPOK_API_KEY
wrangler secret put SLIPOK_BRANCH_ID
# EP.2: wrangler secret put RESEND_API_KEY   (+ set RESEND_FROM)
# EP.3: wrangler secret put BETTER_AUTH_SECRET   (+ set BETTER_AUTH_URL to the deployed origin)

# Apply migrations + seed to the REMOTE D1 (easy to forget):
wrangler d1 migrations apply gameid-store-db --remote
wrangler d1 execute gameid-store-db --remote --file=./seed.sql

pnpm run deploy
```

This builds the SPA and deploys the static assets and the Worker as one unit to `*.workers.dev`. To update later: change code, run `pnpm run deploy` again.

## Build along with the videos

Each checkpoint is a Git tag:

```bash
# EP.1
git checkout checkpoint-1   # storefront + product detail from D1
git checkout checkpoint-2   # checkout + PromptPay QR
git checkout checkpoint-3   # slip verification endpoint (SlipOK)
git checkout checkpoint-4   # claim credential + reveal
git checkout checkpoint-5   # deploy
# EP.2
git checkout ep2-checkpoint-1 ... ep2-checkpoint-4
# EP.3
git checkout ep3-checkpoint-1 ... ep3-checkpoint-6
git checkout main           # latest deployed state
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
├── src/              # React SPA (Storefront, ProductDetail, Checkout, Success)
│   ├── types.ts      # shared types (also used by the Worker)
│   └── pages/
├── worker/
│   ├── index.ts      # Hono API Worker (holds the SlipOK secret)
│   └── db/           # Drizzle client (per request) + schema
├── drizzle/          # generated migrations
├── seed.sql          # sample products + inventory
├── vite.config.ts    # plugins: [react(), cloudflare()]
└── wrangler.jsonc    # name, main, assets, D1 binding
```

## What's NOT included (by design)

Tutorial MVP, scoped per episode:

- **EP.1:** no email, no admin, no accounts, no cart, no stored slip images.
- **EP.2:** still no admin, no accounts.
- **EP.3:** admin-only auth (no customer accounts); product images are pasted URLs (no file upload / R2).

See the blog posts for the reasoning behind each cut.

## License

MIT.

## Credits

Built by [cqsol](https://github.com/cqsol).
Powered by [Claude Code](https://docs.claude.com) and [Cloudflare](https://cloudflare.com), with slip verification by [SlipOK](https://slipok.com).
