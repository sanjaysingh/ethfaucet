import { getAddress, isAddress } from "viem";

export function normalizeAddress(
  value: unknown,
): { ok: true; address: `0x${string}` } | { ok: false; error: string } {
  if (typeof value !== "string" || !isAddress(value)) {
    return { ok: false, error: "Invalid Ethereum address" };
  }
  try {
    return { ok: true, address: getAddress(value) };
  } catch {
    return { ok: false, error: "Invalid Ethereum address" };
  }
}
