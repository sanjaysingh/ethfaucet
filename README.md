# Dripwell — Multi-chain Testnet Faucet

Static GitHub Pages UI + Cloudflare Worker API. Chain identity is config-driven (Sepolia is the first enabled network). The Worker is the security boundary and can be called from other allowlisted origins on your domains.

## Architecture

| Piece | Location | Role |
| --- | --- | --- |
| Shared registry | [`shared/chains.ts`](shared/chains.ts) | Chain slug, chainId, drip, cooldown, explorer |
| API | [`worker/`](worker/) | CORS, Turnstile, cooldowns, drip signing |
| UI | [`frontend/`](frontend/) | Static site; loads chains from the API |

Planned API host: `https://faucet.sanjaysingh.net` (create the subdomain later). Until then use the Worker `*.workers.dev` URL. Existing utils stay at `https://api.sanjaysingh.net/`.

## Defaults (Sepolia)

- Drip: `0.01` ETH
- Cooldown: `24h` per address **and** per IP (per chain)
- Abuse: Cloudflare Turnstile + dual cooldown + EOA check

## Local development

### Worker

```bash
cd worker
cp .dev.vars.example .dev.vars
npm install
npm run dev
```

Set secrets in `.dev.vars` (never commit them).

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Point `VITE_FAUCET_API_URL` at the local Worker (`http://127.0.0.1:8787`).

## API

Base URL example: `https://faucet.sanjaysingh.net`

- `GET /api/chains` — enabled chains
- `GET /api/:chain/info` — balance, drip, cooldown, faucet address
- `GET /api/:chain/cooldown/:address` — claim eligibility
- `POST /api/:chain/drip` — body `{ "address": "0x…", "turnstileToken": "…" }`

### Calling from another site

1. Add the site origin to Worker var `ALLOWED_ORIGINS` (comma-separated).
2. Add the hostname in your Turnstile widget settings.
3. Embed Turnstile, then `POST /api/:chain/drip` with the token.

CORS reflects only allowlisted origins (not `*`).

## Cloudflare setup

1. Create a KV namespace and put its id in [`worker/wrangler.toml`](worker/wrangler.toml).
2. Deploy once so the Durable Object migration applies:
   ```bash
   cd worker && npx wrangler deploy
   ```
3. Set secrets:
   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put IP_HASH_SALT
   npx wrangler secret put PRIVATE_KEY_SEPOLIA
   ```
4. Set vars (dashboard or `wrangler.toml` / `wrangler secret` as appropriate):
   - `ALLOWED_ORIGINS` — e.g. `https://ethfaucet.sanjaysingh.net,https://ethwallet.sanjaysingh.net`
   - `RPC_URL_SEPOLIA` — Sepolia RPC URL
   - `PAUSED_CHAINS` — optional, e.g. `sepolia`
5. Later: attach custom domain `faucet.sanjaysingh.net` in Cloudflare (same zone as `api.sanjaysingh.net`).

Use a **dedicated low-balance** faucet wallet per chain.

## GitHub Actions

### CI (required before merge)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on PRs and pushes to `main`:

- Worker: typecheck + tests when `worker/**` or `shared/**` change
- Frontend: typecheck + tests + build when `frontend/**` or `shared/**` change
- Aggregate job **`CI`** — enable this as a **required status check** in branch protection

Suggested branch protection on `main`:

- Require a pull request before merging
- Require status checks to pass: `CI`

### Deploy (push to `main`)

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys only what changed:

- Frontend → GitHub Pages
- Worker → Cloudflare Workers (Wrangler)

Also supports `workflow_dispatch` with force flags.

### Secrets & variables

| Name | Where | Purpose |
| --- | --- | --- |
| `CF_API_TOKEN` | GitHub Actions secret | Worker deploy |
| `CF_ACCOUNT_ID` | GitHub Actions secret | Worker deploy |
| `VITE_FAUCET_API_URL` | GitHub Actions secret or variable | Frontend build (optional; defaults in app) |
| `VITE_TURNSTILE_SITE_KEY` | GitHub Actions secret or variable | Frontend build (Turnstile site key) |

Enable GitHub Pages with **Source: GitHub Actions**.

## Add a new chain

1. Add an entry in [`shared/chains.ts`](shared/chains.ts) (`slug`, `chainId`, explorer, currency, drip, cooldown, `enabled: true`).
2. Set Worker secrets/vars: `RPC_URL_<SLUG>`, `PRIVATE_KEY_<SLUG>` (slug uppercased, `-` → `_`).
3. Fund that chain’s faucet wallet.
4. Deploy the worker. The UI picks it up from `GET /api/chains` (no Sepolia hardcoding in handlers).

## Scripts

```bash
# worker
npm run typecheck
npm test
npm run deploy

# frontend
npm run typecheck
npm test
npm run build
```
