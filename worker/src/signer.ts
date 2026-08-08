import { sendDrip } from "./chainClient";
import type { ResolvedChain } from "./env";

export type DripRequestMessage = {
  type: "drip";
  resolved: {
    config: {
      slug: string;
      name: string;
      chainId: number;
      dripWei: string;
      cooldownSeconds: number;
      explorerUrl: string;
      nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
      };
      enabled: boolean;
    };
    rpcUrl: string;
    privateKey: `0x${string}`;
    paused: boolean;
  };
  to: `0x${string}`;
};

export type DripResponseMessage =
  | { ok: true; txHash: `0x${string}`; faucetAddress: `0x${string}` }
  | { ok: false; error: string; detail?: string };

function reviveResolved(raw: DripRequestMessage["resolved"]): ResolvedChain {
  return {
    ...raw,
    config: {
      ...raw.config,
      dripWei: BigInt(raw.config.dripWei),
    },
  };
}

/**
 * Serializes drip transactions per chain (one DO instance per slug)
 * so wallet nonces do not collide under concurrency.
 */
export class FaucetSigner implements DurableObject {
  // Queue drips one-at-a-time within this isolate.
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    let body: DripRequestMessage;
    try {
      body = (await request.json()) as DripRequestMessage;
    } catch {
      return Response.json(
        { ok: false, error: "Invalid request" } satisfies DripResponseMessage,
        { status: 400 },
      );
    }

    if (body.type !== "drip") {
      return Response.json(
        { ok: false, error: "Unsupported action" } satisfies DripResponseMessage,
        { status: 400 },
      );
    }

    const result = await this.enqueue(() => this.handleDrip(body));
    const status = result.ok ? 200 : result.error === "FAUCET_EMPTY" ? 503 : 400;
    return Response.json(result, { status });
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.tail.then(fn, fn);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async handleDrip(
    body: DripRequestMessage,
  ): Promise<DripResponseMessage> {
    try {
      const resolved = reviveResolved(body.resolved);
      const { txHash, faucetAddress } = await sendDrip({
        resolved,
        to: body.to,
      });
      return { ok: true, txHash, faucetAddress };
    } catch (err) {
      const message = err instanceof Error ? err.message : "DRIP_FAILED";
      if (message === "FAUCET_EMPTY" || message === "NOT_EOA") {
        return { ok: false, error: message };
      }
      console.error("drip failed", message);
      // Surface RPC/config failures distinctly from unknown bugs.
      if (/fetch|rpc|http|network|timeout|econn|status/i.test(message)) {
        return { ok: false, error: "RPC_ERROR" };
      }
      return { ok: false, error: "DRIP_FAILED", detail: message };
    }
  }
}

export async function dripViaSigner(
  env: { FAUCET_SIGNER: DurableObjectNamespace },
  slug: string,
  resolved: ResolvedChain,
  to: `0x${string}`,
): Promise<DripResponseMessage> {
  const id = env.FAUCET_SIGNER.idFromName(`signer:${slug}`);
  const stub = env.FAUCET_SIGNER.get(id);
  const payload: DripRequestMessage = {
    type: "drip",
    to,
    resolved: {
      ...resolved,
      config: {
        ...resolved.config,
        dripWei: resolved.config.dripWei.toString(),
      },
    },
  };

  const res = await stub.fetch("https://do/drip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as DripResponseMessage;
}
