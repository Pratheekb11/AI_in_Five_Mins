import Link from "next/link";
import { ProgressPill } from "./ProgressPill";
import { ResetProgress } from "./ResetProgress";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({
  showProgress = true,
}: {
  showProgress?: boolean;
}) {
  return (
    <>
      {/* Every page opens with the same masthead, so a keyboard reader would
          otherwise tab through it on every single one before reaching the
          part they came for. */}
      <a
        href="#content"
        className="skip-link plate misreg btn-primary font-display px-4 py-2.5 font-bold"
      >
        Skip to the page
      </a>

      <header className="border-ink/25 bg-paper/85 sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex min-w-0 items-center gap-4">
          {/* Spaced in the wordmark, closed up in the domain. Set solid, the
              capital I and the lowercase i sit next to each other and the
              whole thing reads as "AlinFive". */}
          <Link
            href="/"
            className="tap font-display shrink-0 text-lg font-extrabold tracking-tight"
          >
            AI in <span className="text-pink-text">Five</span>
          </Link>

          <span className="border-ink/20 label text-ink-faint hidden items-center gap-4 border-l pl-4 sm:flex">
            By Pratheek B
            <Link
              href="/curriculum#ml"
              className="tap text-ink-faint hover:text-ink underline-offset-2 hover:underline"
            >
              ML path
            </Link>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {showProgress ? <ProgressPill /> : null}
          {/* Both render nothing until there is progress to show or wipe. */}
          {showProgress ? <ResetProgress /> : null}
          <ThemeToggle />
        </div>
      </div>
      </header>
    </>
  );
}
