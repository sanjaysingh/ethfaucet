import { describe, expect, it } from "vitest";
import { normalizeAddress } from "../src/address";

describe("normalizeAddress", () => {
  it("rejects invalid values", () => {
    expect(normalizeAddress("").ok).toBe(false);
    expect(normalizeAddress("0x123").ok).toBe(false);
    expect(normalizeAddress(123).ok).toBe(false);
  });

  it("checksums valid addresses", () => {
    const result = normalizeAddress(
      "0x742d35cc6634c0532925a3b844bc454e4438f44e",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.address.startsWith("0x")).toBe(true);
      expect(result.address.length).toBe(42);
    }
  });
});
