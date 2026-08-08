import { Hono } from "hono";
import { corsPreflightResponse } from "./cors";
import type { Env } from "./env";
import {
  handleChains,
  handleCooldown,
  handleDrip,
  handleInfo,
} from "./handlers";

const app = new Hono<{ Bindings: Env }>();

app.options("*", (c) => corsPreflightResponse(c.req.raw, c.env));

app.get("/", (c) =>
  c.json({
    name: "faucet-api",
    endpoints: [
      "GET /api/chains",
      "GET /api/:chain/info",
      "GET /api/:chain/cooldown/:address",
      "POST /api/:chain/drip",
    ],
  }),
);

app.get("/api/chains", (c) => handleChains(c.req.raw, c.env));

app.get("/api/:chain/info", (c) =>
  handleInfo(c.req.raw, c.env, c.req.param("chain")),
);

app.get("/api/:chain/cooldown/:address", (c) =>
  handleCooldown(
    c.req.raw,
    c.env,
    c.req.param("chain"),
    c.req.param("address"),
  ),
);

app.post("/api/:chain/drip", (c) =>
  handleDrip(c.req.raw, c.env, c.req.param("chain")),
);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
export { FaucetSigner } from "./signer";
