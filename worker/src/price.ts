const FRESH_MS = 60_000;
const STALE_MS = 15 * 60_000;

const COINBASE_ETH_USD = "https://api.coinbase.com/v2/prices/ETH-USD/spot";
const COINGECKO_ETH_USD =
  "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";

type CacheEntry = { usd: number; fetchedAt: number };

let cache: CacheEntry | null = null;

export function resetEthUsdCache(): void {
  cache = null;
}

export function computeBalanceUsd(
  ethAmount: string,
  ethUsd: number,
): number | null {
  const eth = Number(ethAmount);
  if (!Number.isFinite(eth) || !Number.isFinite(ethUsd) || ethUsd <= 0) {
    return null;
  }
  return eth * ethUsd;
}

export function formatBalanceUsd(
  ethAmount: string,
  ethUsd: number,
): string | null {
  const value = computeBalanceUsd(ethAmount, ethUsd);
  if (value == null) return null;
  return value.toFixed(2);
}

function parsePositiveUsd(value: unknown): number | null {
  const usd = Number(value);
  return Number.isFinite(usd) && usd > 0 ? usd : null;
}

async function fromCoinbase(res: Response): Promise<number | null> {
  const data = (await res.json()) as { data?: { amount?: unknown } };
  return parsePositiveUsd(data.data?.amount);
}

async function fromCoingecko(res: Response): Promise<number | null> {
  const data = (await res.json()) as { ethereum?: { usd?: unknown } };
  return parsePositiveUsd(data.ethereum?.usd);
}

async function readSpot(
  fetchImpl: typeof fetch,
  url: string,
  parse: (res: Response) => Promise<number | null>,
): Promise<number | null> {
  const res = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return parse(res);
}

/** Mainnet ETH/USD spot. Cached briefly; stale quote is reused if both sources fail. */
export async function fetchEthUsd(
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<number | null> {
  if (cache && now - cache.fetchedAt < FRESH_MS) {
    return cache.usd;
  }

  const sources: Array<{
    url: string;
    parse: (res: Response) => Promise<number | null>;
  }> = [
    { url: COINBASE_ETH_USD, parse: fromCoinbase },
    { url: COINGECKO_ETH_USD, parse: fromCoingecko },
  ];

  for (const source of sources) {
    try {
      const usd = await readSpot(fetchImpl, source.url, source.parse);
      if (usd != null) {
        cache = { usd, fetchedAt: now };
        return usd;
      }
    } catch {
      // try the next source
    }
  }

  if (cache && now - cache.fetchedAt < STALE_MS) {
    return cache.usd;
  }
  return null;
}
