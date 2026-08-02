import Link from "next/link";
import { ProgressPill } from "./ProgressPill";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader({ showProgress = true }: { showProgress?: boolean }) {
  return (
    <header className="border-ink/25 bg-paper/85 sticky top-0 z-30 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link
          href="/"
          className="font-display text-lg font-extrabold tracking-tight"
        >
          LearnLoop<span className="text-pink-text">AI</span>
        </Link>

        <div className="flex items-center gap-3">
          {showProgress ? <ProgressPill /> : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
