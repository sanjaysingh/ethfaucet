import {
  chainEnvSuffix,
  getChainBySlug,
  type ChainConfig,
} from "../../shared/chains";

export type Env = {
  COOLDOWN_KV: KVNamespace;
  FAUCET_SIGNER: DurableObjectNamespace;
  TURNSTILE_SECRET_KEY: string;
  ALLOWED_ORIGINS: string;
  IP_HASH_SALT: string;
  PAUSED_CHAINS?: string;
  /** Per-chain: RPC_URL_<SLUG>, PRIVATE_KEY_<SLUG> */
  [key: string]: unknown;
};

export type ResolvedChain = {
  config: ChainConfig;
  rpcUrl: string;
  privateKey: `0x${string}`;
  paused: boolean;
};

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function parsePausedChains(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getEnvString(env: Env, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  // Trim paste artifacts from `wrangler secret put` (newlines/quotes/spaces).
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveChain(
  env: Env,
  slug: string,
):
  | { ok: true; chain: ResolvedChain }
  | { ok: false; status: 404 | 503; error: string } {
  const config = getChainBySlug(slug);
  if (!config) {
    return { ok: false, status: 404, error: "Unknown or disabled chain" };
  }

  const suffix = chainEnvSuffix(config.slug);
  const rpcUrl = getEnvString(env, `RPC_URL_${suffix}`);
  const privateKey = getEnvString(env, `PRIVATE_KEY_${suffix}`);

  if (!rpcUrl || !privateKey) {
    return {
      ok: false,
      status: 503,
      error: "Chain is not configured",
    };
  }

  if (!privateKey.startsWith("0x") || privateKey.length < 66) {
    return {
      ok: false,
      status: 503,
      error: "Chain is not configured",
    };
  }

  const paused = parsePausedChains(env.PAUSED_CHAINS).has(config.slug);

  return {
    ok: true,
    chain: {
      config,
      rpcUrl,
      privateKey: privateKey as `0x${string}`,
      paused,
    },
  };
}
