"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  drawGameShareCard,
  shareFileNameFor,
  type GameShareArt,
} from "@/lib/gameShareCard";

/**
 * The card offered once a game ends: drawn live on a canvas, copyable,
 * downloadable, and shareable through the phone's own sheet where there is
 * one. Mirrors `Certificate.tsx`'s pattern.
 */
export function GameShareCard({
  gameName,
  playerScore,
  modelScore,
  resultLine,
}: {
  gameName: string;
  playerScore: string;
  modelScore: string;
  resultLine: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [note, setNote] = useState<string | null>(null);
  const [origin] = useState(() =>
    typeof window === "undefined"
      ? "aiinfive.vercel.app"
      : window.location.origin.replace(/^https?:\/\//, ""),
  );

  const art: GameShareArt = {
    siteUrl: origin,
    gameName,
    playerScore,
    modelScore,
    resultLine,
  };

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    let cancelled = false;
    /* Same trap as the certificate: a canvas painted before the real
       webfonts arrive silently prints in Times. */
    const paint = () => {
      if (!cancelled && node) drawGameShareCard(node, art);
    };
    paint();
    document.fonts?.ready.then(paint).catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameName, playerScore, modelScore, resultLine, origin]);

  const blob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        canvas.current?.toBlob((b) => resolve(b), "image/png");
      }),
    [],
  );

  const download = useCallback(async () => {
    const file = await blob();
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = shareFileNameFor(art);
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setNote("Saved.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, gameName, playerScore, modelScore, resultLine]);

  const copyImage = useCallback(async () => {
    const file = await blob();
    if (!file) return;
    try {
      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": file }),
        ]);
        setNote("Copied. Paste it into your post.");
        return;
      }
    } catch {
      // Falls through to the message below.
    }
    setNote("Copying isn't supported here. Try Download instead.");
  }, [blob]);

  const shareSheet = useCallback(async () => {
    const file = await blob();
    if (!file) return;
    const png = new File([file], shareFileNameFor(art), {
      type: "image/png",
    });
    const payload = {
      files: [png],
      text: `${resultLine} ${window.location.origin}`,
      title: `${gameName}, AI in Five`,
    };
    if (navigator.canShare?.(payload)) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // Cancelled, or refused. Fall through to a download.
      }
    }
    await download();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob, download, gameName, resultLine]);

  return (
    <div className="border-ink/20 mt-4 border-t pt-4">
      <p className="label text-ink-faint mb-2">Take the result with you</p>
      <canvas
        ref={canvas}
        className="border-ink/25 mb-3 block h-auto w-full max-w-md rounded-[2px] border"
        aria-label={`Result card: ${resultLine}`}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyImage}
          className="tap plate hover:border-ink cursor-pointer px-3 py-2 text-[0.9375rem]"
        >
          Copy image
        </button>
        <button
          type="button"
          onClick={download}
          className="tap plate misreg btn-primary font-display cursor-pointer px-4 py-2 font-bold"
        >
          Download
        </button>
        <button
          type="button"
          onClick={shareSheet}
          className="tap plate hover:border-ink cursor-pointer px-3 py-2 text-[0.9375rem]"
        >
          Share
        </button>
      </div>
      {note ? (
        <p className="text-ink-faint mt-2 text-[0.8125rem]" aria-live="polite">
          {note}
        </p>
      ) : null}
    </div>
  );
}
