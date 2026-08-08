import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FAUCET_API_URL, fetchChains, requestDrip } from "./api";

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
});
