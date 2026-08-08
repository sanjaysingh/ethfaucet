export type CooldownRecord = {
  lastClaimAt: number;
};

export type CooldownStatus = {
  canClaim: boolean;
  lastClaimAt: number | null;
  nextClaimAt: number | null;
};

export function addrKey(slug: string, address: string): string {
  return `${slug}:addr:${address.toLowerCase()}`;
}

export function ipKey(slug: string, ipHash: string): string {
  return `${slug}:ip:${ipHash}`;
}

export function computeCooldownStatus(
  lastClaimAt: number | null,
  cooldownSeconds: number,
  nowMs: number = Date.now(),
): CooldownStatus {
  if (lastClaimAt == null) {
    return { canClaim: true, lastClaimAt: null, nextClaimAt: null };
  }
  const nextClaimAt = lastClaimAt + cooldownSeconds * 1000;
  return {
    canClaim: nowMs >= nextClaimAt,
    lastClaimAt,
    nextClaimAt,
  };
}

export async function hashIp(
  ip: string,
  salt: string,
): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function readLastClaim(
  kv: KVNamespace,
  key: string,
): Promise<number | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CooldownRecord;
    return typeof parsed.lastClaimAt === "number" ? parsed.lastClaimAt : null;
  } catch {
    const asNum = Number(raw);
    return Number.isFinite(asNum) ? asNum : null;
  }
}

export async function writeLastClaim(
  kv: KVNamespace,
  key: string,
  lastClaimAt: number,
  cooldownSeconds: number,
): Promise<void> {
  const record: CooldownRecord = { lastClaimAt };
  // Keep a bit longer than cooldown so status endpoints stay accurate.
  const expirationTtl = Math.max(cooldownSeconds * 2, 86_400);
  await kv.put(key, JSON.stringify(record), { expirationTtl });
}
