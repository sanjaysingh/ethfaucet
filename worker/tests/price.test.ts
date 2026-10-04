import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ETH_USD_SPOT_URL,
  fetchEthUsd,
  parseCoinbaseSpot,
  resetEthUsdCache,
  usdFromEth,
} from "../src/price";

afterEach(() => {
  resetEthUsdCache();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("parseCoinbaseSpot", () => {
  it("reads a positive spot amount", () => {
    expect(parseCoinbaseSpot({ data: { amount: "2702.285" } })).toBe(2702.285);
    expect(parseCoinbaseSpot({ data: { amount: 100 } })).toBe(100);
  });

  it("rejects missing or non-positive amounts", () => {
    expect(parseCoinbaseSpot(null)).toBeNull();
    expect(parseCoinbaseSpot({})).toBeNull();
    expect(parseCoinbaseSpot({ data: { amount: "0" } })).toBeNull();
    expect(parseCoinbaseSpot({ data: { amount: "nope" } })).toBeNull();
  });
});

describe("usdFromEth", () => {
  it("multiplies ETH by the spot price", () => {
    expect(usdFromEth("0.94", 2702.285)).toBe("2540.15");
    expect(usdFromEth("1.5", 3000)).toBe("4500.00");
  });

  it("returns null when either side is unusable", () => {
    expect(usdFromEth(null, 3000)).toBeNull();
    expect(usdFromEth("1", null)).toBeNull();
    expect(usdFromEth("abc", 3000)).toBeNull();
    expect(usdFromEth("1", 0)).toBeNull();
  });
});

describe("fetchEthUsd", () => {
  it("caches a successful spot price", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { amount: "2702.285" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchEthUsd()).resolves.toBe(2702.285);
    await expect(fetchEthUsd()).resolves.toBe(2702.285);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      ETH_USD_SPOT_URL,
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("falls back to the last good price after a later failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { amount: "2000" } }),
      })
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchEthUsd()).resolves.toBe(2000);
    vi.setSystemTime(61_000);
    await expect(fetchEthUsd()).resolves.toBe(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
