import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import type { ChainConfig } from "../../shared/chains";
import type { ResolvedChain } from "./env";

export function toViemChain(config: ChainConfig) {
  return defineChain({
    id: config.chainId,
    name: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: {
      default: { http: ["http://localhost"] },
    },
  });
}

export function createClients(resolved: ResolvedChain): {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: ReturnType<typeof privateKeyToAccount>;
} {
  const chain = toViemChain(resolved.config);
  const account = privateKeyToAccount(resolved.privateKey);
  const transport = http(resolved.rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });
  return { publicClient, walletClient, account };
}

export async function getFaucetBalanceWei(
  publicClient: PublicClient,
  address: `0x${string}`,
): Promise<bigint> {
  return publicClient.getBalance({ address });
}

export async function isEoa(
  publicClient: PublicClient,
  address: `0x${string}`,
): Promise<boolean> {
  const code = await publicClient.getCode({ address });
  return !code || code === "0x";
}

/** Rough gas buffer: ~21000 gas * 50 gwei */
export const GAS_BUFFER_WEI = 1_050_000_000_000_000n; // 0.00105 ETH

export async function sendDrip(params: {
  resolved: ResolvedChain;
  to: `0x${string}`;
}): Promise<{ txHash: Hex; faucetAddress: `0x${string}` }> {
  const { publicClient, walletClient, account } = createClients(params.resolved);
  const balance = await getFaucetBalanceWei(publicClient, account.address);
  const need = params.resolved.config.dripWei + GAS_BUFFER_WEI;
  if (balance < need) {
    throw new Error("FAUCET_EMPTY");
  }

  const eoa = await isEoa(publicClient, params.to);
  if (!eoa) {
    throw new Error("NOT_EOA");
  }

  const txHash = await walletClient.sendTransaction({
    account,
    chain: toViemChain(params.resolved.config),
    to: params.to,
    value: params.resolved.config.dripWei,
  });

  return { txHash, faucetAddress: account.address };
}

export function formatBalanceEth(wei: bigint): string {
  return formatEther(wei);
}
