# Eth Faucet

A testnet faucet for claiming small amounts of ETH while building and testing. Live at [ethfaucet.sanjaysingh.net](https://ethfaucet.sanjaysingh.net/).

Sepolia is the only network enabled right now. Each claim is rate-limited (per address and IP), behind a captcha, and only goes to regular wallets — not contracts.

## Tech stack

- React and Vite for the frontend
- Hono on Cloudflare Workers for the API
- Cloudflare KV for cooldown records
- A Durable Object to serialize faucet transactions
- viem for Ethereum RPC calls, account handling, and address validation
- Cloudflare Turnstile for bot protection

```
frontend/   UI
worker/     API
shared/     chain config
.github/    CI and deployment workflows
```

## How it works

Sepolia defaults (from [`shared/chains.ts`](shared/chains.ts)):

- `0.01` ETH per claim
- 24h cooldown per address and per IP

Keep the faucet wallet lightly funded — don't reuse a main wallet.

Browser requests are restricted by the `ALLOWED_ORIGINS` setting in
[`worker/wrangler.toml`](worker/wrangler.toml). The deployed configuration
allows both `https://ethfaucet.sanjaysingh.net` and
`https://ethwallet.sanjaysingh.net`, along with local development origins.

## Getting started

### Worker

```bash
cd worker
cp .dev.vars.example .dev.vars
npm install
npm run dev
```

Fill in `.dev.vars` before starting the worker. It contains the Turnstile
secret, IP hash salt, Sepolia faucet private key, and Sepolia RPC URL. Never
commit this file or use a wallet that holds funds beyond what the faucet needs.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The example environment file points the UI at
`http://127.0.0.1:8787`. Replace `VITE_TURNSTILE_SITE_KEY` with a valid
Turnstile site key configured to allow your local hostname.

### Useful scripts

```bash
# from the repository root
npm test
npm run typecheck

# from worker/ or frontend/
npm run typecheck
npm test

# worker
npm run deploy

# frontend
npm run build
npm run preview
```

## API

Base URL: `https://faucet-api.times2.workers.dev` (override locally with `VITE_FAUCET_API_URL`).

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/` | service name and available endpoints |
| `GET` | `/api/chains` | enabled chains |
| `GET` | `/api/:chain/info` | balance, drip size, cooldown, faucet address |
| `GET` | `/api/:chain/cooldown/:address` | address cooldown only; IP cooldown is checked when claiming |
| `POST` | `/api/:chain/drip` | `{ "address", "turnstileToken" }` |

The claim endpoint validates the address and Turnstile token, checks address
and IP cooldowns, verifies that the recipient is not a contract, and then
sends the configured amount. It returns `429` when either cooldown is active.

Browser requests with an `Origin` header must come from `ALLOWED_ORIGINS`;
other origins receive `403`. Requests without an `Origin` header, such as
server-to-server calls, are accepted by the CORS check, but claims still
require a valid Turnstile token.

`https://ethwallet.sanjaysingh.net` is already allowlisted. For another
browser client, add its origin to `ALLOWED_ORIGINS` and its hostname to the
Turnstile widget configuration.

## Deploy

### Cloudflare Worker

KV and Durable Objects are already wired in [`worker/wrangler.toml`](worker/wrangler.toml). Deploy with:

```bash
cd worker && npx wrangler deploy
```

Secrets (not in git):

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put IP_HASH_SALT
npx wrangler secret put PRIVATE_KEY_SEPOLIA
```

Always set a unique `IP_HASH_SALT` in production. The code has a default
fallback when it is missing, but relying on that weakens the hashing of client
IP addresses.

Vars already in `wrangler.toml` (or override in the dashboard):

- `ALLOWED_ORIGINS` — the two deployed sites plus localhost and `127.0.0.1` on ports `5173` and `8000`
- `RPC_URL_SEPOLIA` — committed public Sepolia RPC; it can be overridden in Cloudflare
- `PAUSED_CHAINS` — optional, e.g. `sepolia` to shut a chain off

### GitHub Actions

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pull requests
and pushes to `main`. Jobs are selected by changed paths: worker changes run
typecheck and tests, while frontend changes run typecheck, tests, and a build.
The aggregate job is named `CI`.

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) deploys changed
parts on pushes to `main`: the frontend goes to GitHub Pages and the API goes
to Cloudflare Workers. For a manual run, select `deploy_frontend`,
`deploy_worker`, or both in the workflow form.

Secrets / vars used by deploy:

- `CF_API_TOKEN`, `CF_ACCOUNT_ID` — worker deploy
- `VITE_FAUCET_API_URL` — optional secret or repository variable; defaults to `https://faucet-api.times2.workers.dev`
- `VITE_TURNSTILE_SITE_KEY` — secret or repository variable containing the Turnstile site key

GitHub Pages source should be **GitHub Actions**.

## Adding a chain

1. Add an entry in [`shared/chains.ts`](shared/chains.ts) with `enabled: true`.
2. Configure `RPC_URL_<SLUG>` for the worker and store `PRIVATE_KEY_<SLUG>` as a Worker secret (slug uppercased, hyphens → underscores).
3. Fund that chain's faucet wallet.
4. Redeploy the worker. The API exposes the chain through `GET /api/chains`.
5. Update the frontend if the new chain should be selectable; the current UI has a disabled selector hardcoded to Sepolia.
