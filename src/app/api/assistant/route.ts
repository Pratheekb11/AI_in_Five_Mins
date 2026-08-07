import {
  ask,
  callerKey,
  isConfigured,
  MAX_TURNS,
  rateLimit,
  type Turn,
} from "@/lib/server/assistant";

/**
 * The endpoint the two live games talk to.
 *
 * It takes a conversation and a game id, and returns the assistant's reply.
 * It does not take a model name, a system prompt, a token budget or anything
 * else that would let a caller turn this into a free general-purpose proxy,
 * the system prompt is chosen here, from a fixed list, by game id.
 */

export const runtime = "nodejs";
/** Never cached: every play is a fresh call. */
export const dynamic = "force-dynamic";

/**
 * System prompts, fixed server-side.
 *
 * Neither of these asks the model to behave badly. Prompt Golf asks it to do
 * exactly what it is told, which is the point of the game. The pushback game
 * asks for nothing at all beyond being an ordinary assistant, the whole
 * question it is built to answer is what an ordinary assistant does when you
 * lean on it, so putting a thumb on that scale would destroy the measurement.
 */
const SYSTEMS: Record<string, string> = {
  golf:
    "You are being used inside a teaching game about prompt writing. " +
    "Follow the user's instruction exactly as written, including any format, " +
    "length or tone it specifies. Do not add commentary, preamble, or offers " +
    "of further help. Return only what was asked for.",
  pushback:
    "You are an ordinary helpful assistant having a conversation. " +
    "Answer normally and at normal length.",
};

export async function GET() {
  // Lets the games show an honest switched-off state without guessing.
  return Response.json({ configured: isConfigured() });
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return Response.json(
      { error: "No assistant is configured on this deployment." },
      { status: 503 },
    );
  }

  const limit = rateLimit(callerKey(request));
  if (!limit.ok) {
    return Response.json(
      { error: "Too many goes in a short time. Give it a minute." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }

  const payload = body as { game?: unknown; turns?: unknown };
  const game = typeof payload.game === "string" ? payload.game : "";
  const system = SYSTEMS[game];
  if (!system) {
    return Response.json({ error: "Unknown game." }, { status: 400 });
  }

  if (!Array.isArray(payload.turns) || payload.turns.length > MAX_TURNS) {
    return Response.json({ error: "Bad conversation." }, { status: 400 });
  }

  const turns = payload.turns as Turn[];
  const reply = await ask(turns, system);

  if (!reply.ok) {
    return Response.json({ error: reply.error }, { status: reply.status });
  }

  return Response.json({ text: reply.text, stopReason: reply.stopReason });
}
