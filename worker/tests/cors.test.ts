import { describe, expect, it } from "vitest";
import { getCorsHeaders, isOriginAllowed } from "../src/cors";
import type { Env } from "../src/env";

function env(origins: string): Env {
  return {
    ALLOWED_ORIGINS: origins,
    COOLDOWN_KV: {} as KVNamespace,
    FAUCET_SIGNER: {} as DurableObjectNamespace,
    TURNSTILE_SECRET_KEY: "secret",
    IP_HASH_SALT: "salt",
  };
}

describe("cors allowlist", () => {
  it("allows missing Origin for non-browser clients", () => {
    const request = new Request("https://faucet.example/api/chains");
    expect(isOriginAllowed(request, env("https://app.example"))).toBe(true);
  });

  it("allows listed origins and rejects others", () => {
    const allowed = env("https://a.example,https://b.example");
    const ok = new Request("https://faucet.example/api/chains", {
      headers: { Origin: "https://a.example" },
    });
    const bad = new Request("https://faucet.example/api/chains", {
      headers: { Origin: "https://evil.example" },
    });
    expect(isOriginAllowed(ok, allowed)).toBe(true);
    expect(isOriginAllowed(bad, allowed)).toBe(false);
    expect(getCorsHeaders(ok, allowed)["Access-Control-Allow-Origin"]).toBe(
      "https://a.example",
    );
    expect(
      getCorsHeaders(bad, allowed)["Access-Control-Allow-Origin"],
    ).toBeUndefined();
  });
});
