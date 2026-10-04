import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FAUCET_API_URL,
  fetchChains,
  fetchEthUsdPrice,
  requestDrip,
  usdFromEth,
} from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("api client", () => {
  it("falls back to the default API URL when env is unset", async () => {
    vi.stubEnv("VITE_FAUCET_API_URL", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ chains: [] }),
      }),
    );

    await fetchChains();
    expect(fetch).toHaveBeenCalledWith(`${DEFAULT_FAUCET_API_URL}/api/chains`);
  });

  it("surfaces API errors from drip requests", async () => {
    vi.stubEnv("VITE_FAUCET_API_URL", "https://faucet.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          error: "Address is on cooldown",
          nextClaimAt: 123,
        }),
      }),
    );

    await expect(
      requestDrip({
        slug: "sepolia",
        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        turnstileToken: "tok",
      }),
    ).rejects.toMatchObject({
      message: "Address is on cooldown",
      nextClaimAt: 123,
    });
  });

  it("parses the Coinbase ETH/USD spot price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { amount: "2702.285" } }),
      }),
    );

    await expect(fetchEthUsdPrice()).resolves.toBe(2702.285);
  });

  it("returns null when the spot price request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchEthUsdPrice()).resolves.toBeNull();
  });
});

describe("usdFromEth", () => {
  it("values an ETH amount at the given spot", () => {
    expect(usdFromEth("1.5", 3000)).toBe("4500.00");
    expect(usdFromEth(null, 3000)).toBeNull();
  });
});
