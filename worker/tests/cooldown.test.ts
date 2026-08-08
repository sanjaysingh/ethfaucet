import { describe, expect, it } from "vitest";
import {
  addrKey,
  computeCooldownStatus,
  ipKey,
} from "../src/cooldown";

describe("cooldown", () => {
  it("namespaces keys by chain slug", () => {
    expect(addrKey("sepolia", "0xABC")).toBe("sepolia:addr:0xabc");
    expect(ipKey("holesky", "deadbeef")).toBe("holesky:ip:deadbeef");
  });

  it("allows claim when no prior claim", () => {
    expect(computeCooldownStatus(null, 86400).canClaim).toBe(true);
  });

  it("blocks until cooldown elapses", () => {
    const last = 1_700_000_000_000;
    const cooldownSeconds = 86_400;
    const during = last + 1_000;
    const after = last + cooldownSeconds * 1000;
    expect(computeCooldownStatus(last, cooldownSeconds, during).canClaim).toBe(
      false,
    );
    expect(computeCooldownStatus(last, cooldownSeconds, after).canClaim).toBe(
      true,
    );
    expect(
      computeCooldownStatus(last, cooldownSeconds, during).nextClaimAt,
    ).toBe(after);
  });
});
