import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeBalanceUsd,
  fetchEthUsd,
  formatBalanceUsd,
  resetEthUsdCache,
} from "../src/price";

afterEach(() => {
  resetEthUsdCache();
  vi.restoreAllMocks();
});

describe("computeBalanceUsd", () => {
  it("multiplies ETH by the spot price", () => {
    expect(computeBalanceUsd("1.5", 2000)).toBe(3000);
    expect(formatBalanceUsd("0.94", 2702.335)).toBe("2540.19");
  });

  it("rejects non-finite or non-positive inputs", () => {
    expect(computeBalanceUsd("nope", 2000)).toBeNull();
    expect(computeBalanceUsd("1", 0)).toBeNull();
    expect(formatBalanceUsd("1", Number.NaN)).toBeNull();
  });
});

describe("fetchEthUsd", () => {
  it("reads Coinbase first and caches the result", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { amount: "2702.335" } }),
      });

    await expect(fetchEthUsd(fetchImpl, 1_000)).resolves.toBe(2702.335);
    await expect(fetchEthUsd(fetchImpl, 1_000 + 10_000)).resolves.toBe(2702.335);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to CoinGecko when Coinbase fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ethereum: { usd: 2500 } }),
      });

    await expect(fetchEthUsd(fetchImpl, 2_000)).resolves.toBe(2500);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns a stale quote when both sources fail", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { amount: "2000" } }),
      })
      .mockRejectedValueOnce(new Error("coinbase down"))
      .mockRejectedValueOnce(new Error("coingecko down"));

    await expect(fetchEthUsd(fetchImpl, 1_000)).resolves.toBe(2000);
    await expect(fetchEthUsd(fetchImpl, 1_000 + 90_000)).resolves.toBe(2000);
  });
});
