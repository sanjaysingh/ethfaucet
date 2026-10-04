import { describe, expect, it, vi } from "vitest";
import {
  computeBalanceUsd,
  fetchEthUsdSpot,
  formatEthAmount,
  formatUsdAmount,
  resolveFaucetUsd,
} from "./money";

describe("money helpers", () => {
  it("formats ETH and USD amounts", () => {
    expect(formatEthAmount("0.93986336502859", "ETH")).toBe("0.940 ETH");
    expect(formatUsdAmount(2539.79)).toBe("$2,539.79");
    expect(computeBalanceUsd("0.5", 2700)).toBe(1350);
    expect(
      resolveFaucetUsd({
        balance: "1.5",
        balanceUsd: "3210.50",
        ethUsd: 2000,
      }),
    ).toBe(3210.5);
    expect(
      resolveFaucetUsd({
        balance: "1.5",
        spotUsd: 2000,
      }),
    ).toBe(3000);
  });

  it("returns null for invalid USD calculations", () => {
    expect(computeBalanceUsd("x", 2700)).toBeNull();
    expect(computeBalanceUsd("1", 0)).toBeNull();
  });

  it("reads Coinbase spot quotes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { amount: "2702.335" } }),
    });
    await expect(fetchEthUsdSpot(fetchImpl)).resolves.toBe(2702.335);
  });

  it("returns null when the spot request fails", async () => {
    await expect(
      fetchEthUsdSpot(vi.fn().mockRejectedValue(new Error("offline"))),
    ).resolves.toBeNull();
  });
});
