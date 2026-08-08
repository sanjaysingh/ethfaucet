import {
  explorerTxUrl,
  formatDripAmount,
  getEnabledChains,
} from "../../shared/chains";
import { normalizeAddress } from "./address";
import {
  createClients,
  formatBalanceEth,
  getFaucetBalanceWei,
} from "./chainClient";
import {
  addrKey,
  computeCooldownStatus,
  hashIp,
  ipKey,
  readLastClaim,
  writeLastClaim,
} from "./cooldown";
import { getCorsHeaders, isOriginAllowed } from "./cors";
import { resolveChain, type Env } from "./env";
import { dripViaSigner } from "./signer";
import { verifyTurnstile } from "./turnstile";

function json(
  request: Request,
  env: Env,
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request, env),
    },
  });
}

function clientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function handleChains(request: Request, env: Env): Promise<Response> {
  if (!isOriginAllowed(request, env)) {
    return json(request, env, { error: "Origin not allowed" }, 403);
  }

  const chains = getEnabledChains().map((c) => ({
    slug: c.slug,
    name: c.name,
    chainId: c.chainId,
    dripAmount: formatDripAmount(c),
    cooldownSeconds: c.cooldownSeconds,
    symbol: c.nativeCurrency.symbol,
    decimals: c.nativeCurrency.decimals,
    explorerUrl: c.explorerUrl,
  }));

  return json(request, env, { chains });
}

export async function handleInfo(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  if (!isOriginAllowed(request, env)) {
    return json(request, env, { error: "Origin not allowed" }, 403);
  }

  const resolved = resolveChain(env, slug);
  if (!resolved.ok) {
    return json(request, env, { error: resolved.error }, resolved.status);
  }

  const { chain } = resolved;
  let faucetAddress: string | null = null;
  let balance: string | null = null;

  try {
    const { publicClient, account } = createClients(chain);
    faucetAddress = account.address;
    const wei = await getFaucetBalanceWei(publicClient, account.address);
    balance = formatBalanceEth(wei);
  } catch (err) {
    console.error("info balance lookup failed", err);
  }

  return json(request, env, {
    slug: chain.config.slug,
    name: chain.config.name,
    chainId: chain.config.chainId,
    dripAmount: formatDripAmount(chain.config),
    symbol: chain.config.nativeCurrency.symbol,
    cooldownSeconds: chain.config.cooldownSeconds,
    explorerUrl: chain.config.explorerUrl,
    faucetAddress,
    balance,
    paused: chain.paused,
  });
}

export async function handleCooldown(
  request: Request,
  env: Env,
  slug: string,
  addressParam: string,
): Promise<Response> {
  if (!isOriginAllowed(request, env)) {
    return json(request, env, { error: "Origin not allowed" }, 403);
  }

  const resolved = resolveChain(env, slug);
  if (!resolved.ok) {
    return json(request, env, { error: resolved.error }, resolved.status);
  }

  const addr = normalizeAddress(addressParam);
  if (!addr.ok) {
    return json(request, env, { error: addr.error }, 400);
  }

  const lastClaimAt = await readLastClaim(
    env.COOLDOWN_KV,
    addrKey(resolved.chain.config.slug, addr.address),
  );
  const status = computeCooldownStatus(
    lastClaimAt,
    resolved.chain.config.cooldownSeconds,
  );

  return json(request, env, {
    chain: resolved.chain.config.slug,
    address: addr.address,
    ...status,
  });
}

export async function handleDrip(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  if (!isOriginAllowed(request, env)) {
    return json(request, env, { error: "Origin not allowed" }, 403);
  }

  const resolved = resolveChain(env, slug);
  if (!resolved.ok) {
    return json(request, env, { error: resolved.error }, resolved.status);
  }

  if (resolved.chain.paused) {
    return json(request, env, { error: "Faucet is paused for this chain" }, 503);
  }

  let body: { address?: unknown; turnstileToken?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json(request, env, { error: "Invalid JSON body" }, 400);
  }

  const addr = normalizeAddress(body.address);
  if (!addr.ok) {
    return json(request, env, { error: addr.error }, 400);
  }

  const token =
    typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const captcha = await verifyTurnstile(
    env.TURNSTILE_SECRET_KEY,
    token,
    clientIp(request),
  );
  if (!captcha.ok) {
    return json(request, env, { error: captcha.error }, 400);
  }

  const ip = clientIp(request);
  const salt = env.IP_HASH_SALT || "faucet-default-salt";
  const ipHash = await hashIp(ip, salt);
  const aKey = addrKey(resolved.chain.config.slug, addr.address);
  const iKey = ipKey(resolved.chain.config.slug, ipHash);

  const [addrLast, ipLast] = await Promise.all([
    readLastClaim(env.COOLDOWN_KV, aKey),
    readLastClaim(env.COOLDOWN_KV, iKey),
  ]);

  const now = Date.now();
  const addrStatus = computeCooldownStatus(
    addrLast,
    resolved.chain.config.cooldownSeconds,
    now,
  );
  const ipStatus = computeCooldownStatus(
    ipLast,
    resolved.chain.config.cooldownSeconds,
    now,
  );

  if (!addrStatus.canClaim) {
    return json(
      request,
      env,
      {
        error: "Address is on cooldown",
        nextClaimAt: addrStatus.nextClaimAt,
      },
      429,
    );
  }
  if (!ipStatus.canClaim) {
    return json(
      request,
      env,
      {
        error: "IP is on cooldown",
        nextClaimAt: ipStatus.nextClaimAt,
      },
      429,
    );
  }

  const dripResult = await dripViaSigner(
    env,
    resolved.chain.config.slug,
    resolved.chain,
    addr.address,
  );

  if (!dripResult.ok) {
    if (dripResult.error === "FAUCET_EMPTY") {
      return json(request, env, { error: "Faucet is empty" }, 503);
    }
    if (dripResult.error === "NOT_EOA") {
      return json(
        request,
        env,
        { error: "Recipient must be an EOA wallet" },
        400,
      );
    }
    return json(request, env, { error: "Failed to send drip" }, 500);
  }

  const claimedAt = Date.now();
  await Promise.all([
    writeLastClaim(
      env.COOLDOWN_KV,
      aKey,
      claimedAt,
      resolved.chain.config.cooldownSeconds,
    ),
    writeLastClaim(
      env.COOLDOWN_KV,
      iKey,
      claimedAt,
      resolved.chain.config.cooldownSeconds,
    ),
  ]);

  const nextClaimAt =
    claimedAt + resolved.chain.config.cooldownSeconds * 1000;

  return json(request, env, {
    ok: true,
    chain: resolved.chain.config.slug,
    txHash: dripResult.txHash,
    amount: formatDripAmount(resolved.chain.config),
    symbol: resolved.chain.config.nativeCurrency.symbol,
    explorerTxUrl: explorerTxUrl(resolved.chain.config, dripResult.txHash),
    nextClaimAt,
  });
}
