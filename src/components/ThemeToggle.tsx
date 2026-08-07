"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "llai-theme";
const THEME_EVENT = "llai-theme-change";

/**
 * The theme lives on `<html data-theme>`, not in React state, an inline script
 * in the root layout sets it before first paint so a returning learner never
 * sees the wrong plate flash. This component reads that external source rather
 * than keeping a second copy of the truth.
 */
function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** The server cannot know the preference, so it renders the neutral label. */
function getServerSnapshot(): Theme | null {
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing, the choice just will not persist.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="label border-ink/40 hover:border-ink text-ink-soft hover:text-ink rounded-[2px] border px-2.5 py-2 transition-colors"
      aria-label={
        theme === "dark" ? "Switch to light plate" : "Switch to dark plate"
      }
    >
      {theme === null ? (
        <span className="invisible">Dark</span>
      ) : theme === "dark" ? (
        "Light"
      ) : (
        "Dark"
      )}
    </button>
  );
}
