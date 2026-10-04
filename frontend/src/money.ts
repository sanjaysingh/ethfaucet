const COINBASE_ETH_USD = "https://api.coinbase.com/v2/prices/ETH-USD/spot";

export function formatEthAmount(balance: string, symbol: string): string {
  const n = Number(balance);
  if (!Number.isFinite(n)) return `— ${symbol}`;
  return `${n.toFixed(3)} ${symbol}`;
}

export function formatUsdAmount(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
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

export function resolveFaucetUsd(params: {
  balance: string | null;
  balanceUsd?: string | null;
  ethUsd?: number | null;
  spotUsd?: number | null;
}): number | null {
  if (params.balanceUsd != null) {
    const quoted = Number(params.balanceUsd);
    if (Number.isFinite(quoted)) return quoted;
  }
  const quote = params.ethUsd ?? params.spotUsd ?? null;
  if (params.balance != null && quote != null) {
    return computeBalanceUsd(params.balance, quote);
  }
  return null;
}

/** Browser fallback when the faucet API does not yet include a USD quote. */
export async function fetchEthUsdSpot(
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  try {
    const res = await fetchImpl(COINBASE_ETH_USD, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { amount?: unknown } };
    const usd = Number(data.data?.amount);
    return Number.isFinite(usd) && usd > 0 ? usd : null;
  } catch {
    return null;
  }
}
