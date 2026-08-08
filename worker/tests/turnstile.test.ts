import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "../src/turnstile";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("verifyTurnstile", () => {
  it("rejects missing token/secret", async () => {
    expect((await verifyTurnstile("", "tok")).ok).toBe(false);
    expect((await verifyTurnstile("sec", "")).ok).toBe(false);
  });

  it("accepts successful siteverify responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      }),
    );
    const result = await verifyTurnstile("secret", "token", "1.2.3.4");
    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("rejects failed siteverify responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      }),
    );
    const result = await verifyTurnstile("secret", "bad");
    expect(result.ok).toBe(false);
  });
});
