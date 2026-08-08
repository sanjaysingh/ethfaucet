import { parseAllowedOrigins, type Env } from "./env";

export function getCorsHeaders(
  request: Request,
  env: Env,
): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function isOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  // Non-browser clients (curl, server-to-server) often omit Origin.
  if (!origin) return true;
  return parseAllowedOrigins(env.ALLOWED_ORIGINS).includes(origin);
}

export function corsPreflightResponse(request: Request, env: Env): Response {
  const headers = getCorsHeaders(request, env);
  if (!isOriginAllowed(request, env)) {
    return new Response(null, { status: 403, headers });
  }
  return new Response(null, { status: 204, headers });
}
