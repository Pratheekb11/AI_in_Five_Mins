import Link from "next/link";
import { ProgressPill } from "./ProgressPill";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ showProgress = true }: { showProgress?: boolean }) {
  return (
    <header className="border-ink/25 bg-paper/85 sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="font-display shrink-0 text-lg font-extrabold tracking-tight"
          >
            LearnLoop<span className="text-pink-text">AI</span>
          </Link>

          <span className="border-ink/20 label text-ink-faint hidden items-center gap-1.5 border-l pl-4 sm:flex">
            Made with <span aria-label="love">❤️</span> by Pratheek B
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {showProgress ? <ProgressPill /> : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
