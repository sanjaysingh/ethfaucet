import { isAddress } from "viem";

export function validateAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a wallet address";
  if (!isAddress(trimmed)) return "Invalid Ethereum address";
  return null;
}

export function formatCountdown(nextClaimAt: number, now = Date.now()): string {
  const ms = Math.max(0, nextClaimAt - now);
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
