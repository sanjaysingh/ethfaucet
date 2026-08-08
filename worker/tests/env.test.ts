import { describe, expect, it } from "vitest";
import {
  parsePausedChains,
  resolveChain,
  type Env,
} from "../src/env";

function baseEnv(extra: Record<string, string> = {}): Env {
  return {
    COOLDOWN_KV: {} as KVNamespace,
    FAUCET_SIGNER: {} as DurableObjectNamespace,
    TURNSTILE_SECRET_KEY: "ts",
    ALLOWED_ORIGINS: "http://localhost:5173",
    IP_HASH_SALT: "salt",
    ...extra,
  };
}

describe("resolveChain", () => {
  it("returns 404 for unknown chains", () => {
    const result = resolveChain(baseEnv(), "nope");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("returns 503 when rpc/key missing", () => {
    const result = resolveChain(baseEnv(), "sepolia");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("resolves configured chain and pause flag", () => {
    const result = resolveChain(
      baseEnv({
        RPC_URL_SEPOLIA: "https://rpc.example",
        PRIVATE_KEY_SEPOLIA:
          "0x1111111111111111111111111111111111111111111111111111111111111111",
        PAUSED_CHAINS: "sepolia",
      }),
      "sepolia",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.chain.config.slug).toBe("sepolia");
      expect(result.chain.paused).toBe(true);
      expect(result.chain.rpcUrl).toBe("https://rpc.example");
    }
  });

  it("parses paused chain list", () => {
    expect([...parsePausedChains("sepolia, holesky")]).toEqual([
      "sepolia",
      "holesky",
    ]);
  });
});
