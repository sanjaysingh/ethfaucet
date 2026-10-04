import { describe, expect, it } from "vitest";
import { formatCountdown, formatUsd, validateAddress } from "./validation";

describe("validateAddress", () => {
  it("requires a non-empty address", () => {
    expect(validateAddress("")).toBe("Enter a wallet address");
    expect(validateAddress("   ")).toBe("Enter a wallet address");
  });

  it("rejects invalid addresses", () => {
    expect(validateAddress("not-an-address")).toBe("Invalid Ethereum address");
  });

  it("accepts valid addresses", () => {
    expect(
      validateAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e"),
    ).toBeNull();
  });
});

describe("formatUsd", () => {
  it("formats a dollar amount with grouping", () => {
    expect(formatUsd("2540.12")).toBe("$2,540.12");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("returns null for missing or invalid values", () => {
    expect(formatUsd(null)).toBeNull();
    expect(formatUsd(undefined)).toBeNull();
    expect(formatUsd("")).toBeNull();
    expect(formatUsd("nope")).toBeNull();
  });
});

describe("formatCountdown", () => {
  it("formats remaining time", () => {
    const now = 1_000_000;
    expect(formatCountdown(now + 65_000, now)).toBe("1m 5s");
    expect(formatCountdown(now + 3_600_000, now)).toBe("1h 0m");
  });
});
