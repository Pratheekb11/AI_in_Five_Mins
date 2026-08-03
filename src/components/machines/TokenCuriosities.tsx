import { TokenStrip } from "@/components/token-strip/TokenStrip";
import type { Curiosity } from "@/lib/tokenExamples";

/**
 * Six short strings, each chosen because its split contradicts something people
 * assume about tokens. The note under each says what to notice — without it the
 * strips are just pretty, and noticing is the whole job.
 */
export function TokenCuriosities({ items }: { items: Curiosity[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="plate flex flex-col p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <code className="font-data text-ink-soft text-sm break-all">
              {item.text.replace(/^ /, "␣")}
            </code>
            <span className="data shrink-0 text-sm font-semibold">
              {item.tokenCount}
              <span className="text-ink-faint ml-1 text-xs font-normal">
                {item.tokenCount === 1 ? "token" : "tokens"}
              </span>
            </span>
          </div>

          <TokenStrip
            items={item.tokens.map((t) => ({ text: t.text }))}
            size="sm"
          />

          <p className="border-ink/20 text-ink-soft mt-auto border-t pt-3 text-sm">
            {item.note}
          </p>
        </li>
      ))}
    </ul>
  );
}
