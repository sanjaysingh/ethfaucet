const PRICE_TTL_MS = 60_000;
const PRICE_TIMEOUT_MS = 4_000;

export const ETH_USD_SPOT_URL = "https://api.coinbase.com/v2/prices/ETH-USD/spot";

type CachedPrice = {
  usd: number;
  fetchedAt: number;
};

let cache: CachedPrice | null = null;

export function resetEthUsdCache(): void {
  cache = null;
}

export function parseCoinbaseSpot(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const amount = (data as { data?: { amount?: unknown } }).data?.amount;
  const usd = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(usd) && usd > 0 ? usd : null;
}

export function usdFromEth(
  ethAmount: string | null,
  ethUsd: number | null,
): string | null {
  if (ethAmount == null || ethUsd == null) return null;
  if (!Number.isFinite(ethUsd) || ethUsd <= 0) return null;
  const eth = Number(ethAmount);
  if (!Number.isFinite(eth)) return null;
  return (eth * ethUsd).toFixed(2);
}

async function fetchSpot(): Promise<number | null> {
  const res = await fetch(ETH_USD_SPOT_URL, {
    signal: AbortSignal.timeout(PRICE_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return parseCoinbaseSpot(await res.json());
}

/** Cached mainnet ETH/USD spot. Failures return the last good price when present. */
export async function fetchEthUsd(): Promise<number | null> {
  if (cache && Date.now() - cache.fetchedAt < PRICE_TTL_MS) {
    return cache.usd;
  }

  try {
    const usd = await fetchSpot();
    if (usd != null) {
      cache = { usd, fetchedAt: Date.now() };
      return usd;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("eth usd price lookup failed", message);
  }

  return cache?.usd ?? null;
}
