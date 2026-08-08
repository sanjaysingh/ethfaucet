import { describe, expect, it } from "vitest";
import {
  chainEnvSuffix,
  formatDripAmount,
  getChainBySlug,
  getEnabledChains,
} from "../../shared/chains";

describe("chain registry", () => {
  it("exposes sepolia as an enabled chain without hardcoding callers", () => {
    const enabled = getEnabledChains();
    expect(enabled.length).toBeGreaterThan(0);
    expect(enabled.every((c) => c.enabled)).toBe(true);
    expect(getChainBySlug(enabled[0].slug)?.chainId).toBe(enabled[0].chainId);
  });

  it("resolves slugs case-insensitively and rejects unknown chains", () => {
    const first = getEnabledChains()[0];
    expect(getChainBySlug(first.slug.toUpperCase())?.slug).toBe(first.slug);
    expect(getChainBySlug("not-a-real-chain")).toBeUndefined();
  });

  it("formats drip amounts from wei using chain decimals", () => {
    const sepolia = getChainBySlug("sepolia");
    expect(sepolia).toBeDefined();
    expect(formatDripAmount(sepolia!)).toBe("0.01");
  });

  it("maps slug to env suffix", () => {
    expect(chainEnvSuffix("sepolia")).toBe("SEPOLIA");
    expect(chainEnvSuffix("my-chain")).toBe("MY_CHAIN");
  });
});
