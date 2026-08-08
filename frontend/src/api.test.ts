import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchChains, requestDrip } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("api client", () => {
  it("loads chains from the faucet API", async () => {
    vi.stubEnv("VITE_FAUCET_API_URL", "https://faucet.example");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          chains: [
            {
              slug: "sepolia",
              name: "Sepolia",
              chainId: 11155111,
              dripAmount: "0.01",
              cooldownSeconds: 86400,
              symbol: "ETH",
              decimals: 18,
              explorerUrl: "https://sepolia.etherscan.io",
            },
          ],
        }),
      }),
    );

    const chains = await fetchChains();
    expect(chains).toHaveLength(1);
    expect(chains[0].slug).toBe("sepolia");
    expect(fetch).toHaveBeenCalledWith("https://faucet.example/api/chains");
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
});
