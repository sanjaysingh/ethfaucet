export type TurnstileResult =
  | { ok: true }
  | { ok: false; error: string };

export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  if (!secret) {
    return { ok: false, error: "Captcha is not configured" };
  }
  if (!token?.trim()) {
    return { ok: false, error: "Captcha token required" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  let data: { success?: boolean; "error-codes"?: string[] };
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, error: "Captcha verification failed" };
  }

  if (!data.success) {
    return { ok: false, error: "Captcha verification failed" };
  }
  return { ok: true };
}
