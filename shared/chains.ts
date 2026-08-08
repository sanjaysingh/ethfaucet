export type NativeCurrency = {
  name: string;
  symbol: string;
  decimals: number;
};

export type ChainConfig = {
  slug: string;
  name: string;
  chainId: number;
  /** Drip amount in wei (native token smallest unit). */
  dripWei: bigint;
  cooldownSeconds: number;
  explorerUrl: string;
  nativeCurrency: NativeCurrency;
  enabled: boolean;
};

/**
 * Static chain registry. Add new networks here, then set
 * RPC_URL_<SLUG> and PRIVATE_KEY_<SLUG> Worker secrets.
 */
export const CHAINS: readonly ChainConfig[] = [
  {
    slug: "sepolia",
    name: "Sepolia",
    chainId: 11155111,
    dripWei: 10_000_000_000_000_000n, // 0.01 ETH
    cooldownSeconds: 86_400,
    explorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    enabled: true,
  },
] as const;

export function getEnabledChains(): ChainConfig[] {
  return CHAINS.filter((c) => c.enabled);
}

export function getChainBySlug(slug: string): ChainConfig | undefined {
  const normalized = slug.trim().toLowerCase();
  return CHAINS.find((c) => c.slug === normalized && c.enabled);
}

export function formatDripAmount(chain: ChainConfig): string {
  const base = 10n ** BigInt(chain.nativeCurrency.decimals);
  const whole = chain.dripWei / base;
  const frac = chain.dripWei % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac
    .toString()
    .padStart(chain.nativeCurrency.decimals, "0")
    .replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export function explorerTxUrl(chain: ChainConfig, txHash: string): string {
  return `${chain.explorerUrl.replace(/\/$/, "")}/tx/${txHash}`;
}

export function explorerAddressUrl(chain: ChainConfig, address: string): string {
  return `${chain.explorerUrl.replace(/\/$/, "")}/address/${address}`;
}

/** Env / secret suffix for a chain slug: sepolia -> SEPOLIA, my-chain -> MY_CHAIN */
export function chainEnvSuffix(slug: string): string {
  return slug.trim().toUpperCase().replace(/-/g, "_");
}
