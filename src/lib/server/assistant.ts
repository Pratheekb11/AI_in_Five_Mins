import "server-only";

/**
 * The one place this site talks to a real assistant.
 *
 * Everything else on the site runs on measurements recorded offline. Two of the
 * games cannot: writing a prompt and watching what comes back, and pushing back
 * on an answer until it caves, both need a model that follows instructions and
 * holds a conversation. A small base model cannot do either, and pretending
 * otherwise would be inventing data.
 *
 * SECURITY. This module is server-only and the key never leaves it.
 *
 *   - `import "server-only"` makes the build fail rather than let a client
 *     component pull this in by accident.
 *   - The key is read from the environment at call time and is never returned,
 *     logged, or included in an error message.
 *   - Requests are capped: a maximum prompt length, a maximum reply length, a
 *     fixed model, and a hard request timeout.
 *   - Callers are rate limited per IP (see `rateLimit` below).
 *   - Nothing a player types is stored. It goes to the model and is dropped.
 *
 * If no key is configured the site does not break: `isConfigured()` is false,
 * the two games say plainly that they are switched off, and everything else
 * carries on.
 */

/** Kept small. These are teaching exchanges, not a chat product. */
export const MAX_PROMPT_CHARS = 2000;
export const MAX_TURNS = 12;
export const MAX_OUTPUT_TOKENS = 400;
const REQUEST_TIMEOUT_MS = 30_000;

const MODEL = "claude-sonnet-5";
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export type Turn = { role: "user" | "assistant"; content: string };

export type AssistantReply =
  | { ok: true; text: string; stopReason: string | null }
  | { ok: false; error: string; status: number };

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/* ------------------------------------------------------------ rate limit -- */

/**
 * A fixed-window counter, in memory.
 *
 * In memory means it resets on redeploy and is per-instance — fine for a
 * teaching site, and honest about what it is. It exists to stop one person
 * running up a bill, not to survive a determined attacker. If this ever gets
 * real traffic it wants replacing with something shared.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

const seen = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = seen.get(key);

  if (!entry || now >= entry.resetAt) {
    seen.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic sweep, so the map cannot grow without bound.
    if (seen.size > 5000) {
      for (const [k, v] of seen) if (now >= v.resetAt) seen.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Best guess at who is calling, for rate limiting only. Never stored. */
export function callerKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/* ------------------------------------------------------------------ call -- */

export async function ask(
  turns: Turn[],
  system: string,
): Promise<AssistantReply> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return { ok: false, error: "No assistant is configured.", status: 503 };
  }

  if (turns.length === 0 || turns.length > MAX_TURNS) {
    return { ok: false, error: "That conversation is the wrong length.", status: 400 };
  }
  for (const turn of turns) {
    if (turn.role !== "user" && turn.role !== "assistant") {
      return { ok: false, error: "Unknown role.", status: 400 };
    }
    if (typeof turn.content !== "string" || turn.content.length === 0) {
      return { ok: false, error: "Empty message.", status: 400 };
    }
    if (turn.content.length > MAX_PROMPT_CHARS) {
      return {
        ok: false,
        error: `Keep each message under ${MAX_PROMPT_CHARS} characters.`,
        status: 400,
      };
    }
  }

  const abort = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: abort,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages: turns,
      }),
    });

    if (!response.ok) {
      // The upstream body can echo request details, so it is not passed on.
      return {
        ok: false,
        error: "The assistant could not be reached.",
        status: response.status === 429 ? 429 : 502,
      };
    }

    const body = await response.json();
    const text = Array.isArray(body?.content)
      ? body.content
          .filter((part: { type?: string }) => part?.type === "text")
          .map((part: { text?: string }) => part.text ?? "")
          .join("")
      : "";

    if (!text) {
      return { ok: false, error: "The assistant returned nothing.", status: 502 };
    }

    return { ok: true, text, stopReason: body?.stop_reason ?? null };
  } catch {
    return { ok: false, error: "The assistant did not answer in time.", status: 504 };
  }
}
