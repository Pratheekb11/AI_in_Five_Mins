"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CertificateArt,
  type CertificateSpec,
  type Shape,
  drawCertificate,
  fileNameFor,
  lessonsFor,
  scoreFor,
} from "@/lib/certificate";
import { NAME_LIMIT, useLearnerName } from "@/lib/name";
import { useProgress } from "@/lib/progress";

/**
 * The certificate, drawn live, downloadable, and shareable.
 *
 * WHAT SHARING CAN AND CANNOT DO, because the buttons have to be honest about
 * it. None of the four networks accepts an image through a link: an intent URL
 * carries text and a URL and nothing else. So there are two paths.
 *
 * On a phone, `navigator.share` with a file opens the real share sheet and the
 * image goes with it, which covers Instagram and WhatsApp and everything else
 * installed. On a desktop that API mostly does not take files, so the honest
 * flow is: download the image, then open the composer with the words already
 * written and attach it. The buttons say so rather than pretending.
 *
 * The link shared is wherever this page is actually running, read at press
 * time. Hard-coding a domain the site has not moved to yet would put a dead
 * link in somebody's feed.
 */
export function Certificate({ spec }: { spec: CertificateSpec }) {
  const { progress } = useProgress();
  const [storedName, setStoredName] = useLearnerName();
  const [draft, setDraft] = useState("");
  const [shape, setShape] = useState<Shape>("post");
  const [note, setNote] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const lessons = lessonsFor(spec);
  const score = scoreFor(spec, progress);
  const name = storedName;

  /* Today, read once. A clock is not a pure thing to call while rendering,
     and a certificate that redates itself mid-session would be worse than
     one that is a minute stale. `undefined` locale means the reader's own. */
  const [date] = useState(() =>
    new Date().toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  /* One object, rebuilt only when something on the plate changes: it is the
     dependency of the paint, the download and the share sheet alike. */
  const art: CertificateArt = useMemo(
    () => ({
      spec,
      name: name || "Your name",
      date,
      score,
      lessonCount: lessons.length,
      shape,
    }),
    [spec, name, date, score, lessons.length, shape],
  );

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    let cancelled = false;
    /* The fonts are the site's own webfonts, and a canvas drawn before they
       arrive silently prints in Times. */
    const paint = () => {
      if (!cancelled && node) drawCertificate(node, art);
    };
    paint();
    document.fonts?.ready.then(paint).catch(() => {});
    return () => {
      cancelled = true;
    };
    // The art object is rebuilt every render; these are what it is made of.
  }, [art]);

  const blob = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const node = canvas.current;
        if (!node) return resolve(null);
        node.toBlob((b) => resolve(b), "image/png");
      }),
    [],
  );

  const download = useCallback(async () => {
    const file = await blob();
    if (!file) return;
    /* Firefox will not follow a click on an anchor that is not in the
       document, and revoking the object URL in the same tick cancels the
       download it just started. Both are why this used to save nothing there
       and everything in Chrome. */
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameFor(art);
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setNote("Saved. Attach it to your post.");
  }, [art, blob]);

  const shareText = `${spec.shareLine}${
    score !== null ? `, ${score}% on the checks` : ""
  }.`;

  const shareSheet = useCallback(async () => {
    const file = await blob();
    if (!file) return;
    const png = new File([file], fileNameFor(art), { type: "image/png" });
    const payload = {
      files: [png],
      text: `${shareText} ${window.location.origin}`,
      title: spec.title,
    };
    if (navigator.canShare?.(payload)) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // Cancelled, or refused. Fall through to the file.
      }
    }
    await download();
  }, [art, blob, download, shareText, spec.title]);

  const open = useCallback(
    (kind: "linkedin" | "x" | "whatsapp") => {
      const url = window.location.origin;
      const text = `${shareText} ${url}`;
      const to = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
        x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      }[kind];
      window.open(to, "_blank", "noopener,noreferrer");
      setNote("Download the image first, then attach it to the post.");
    },
    [shareText],
  );

  return (
    <div className="plate p-5 md:p-6">
      <p className="label text-ink-faint mb-3">
        {spec.title} · {lessons.length} modules finished
      </p>

      {/* The plate itself, at whatever width there is. */}
      <canvas
        ref={canvas}
        className="border-ink/25 mb-4 block h-auto w-full rounded-[2px] border"
        aria-label={`Certificate: ${spec.title}, awarded to ${art.name}`}
      />

      {name ? (
        <p className="text-ink-soft mb-4 text-[0.9375rem]">
          Printed for <strong>{name}</strong>.{" "}
          <button
            type="button"
            onClick={() => {
              setDraft(name);
              setStoredName("");
            }}
            className="cursor-pointer underline underline-offset-2"
          >
            Change the name
          </button>
        </p>
      ) : (
        <form
          className="mb-4 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setStoredName(draft);
          }}
        >
          <label className="grow">
            <span className="label text-ink-faint mb-1.5 block">
              Your name, as you want it printed
            </span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={NAME_LIMIT}
              placeholder="Your name"
              className="border-ink/30 bg-paper-raised focus:border-ink w-full rounded-[2px] border px-3 py-2 text-[0.9375rem] outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={!draft.trim()}
            className="plate misreg btn-primary font-display cursor-pointer px-4 py-2 font-bold disabled:opacity-40"
          >
            Put it on
          </button>
        </form>
      )}

      <div className="border-ink/20 flex flex-wrap items-center gap-2 border-t pt-4">
        <span className="label text-ink-faint mr-1">Shape</span>
        {(["post", "square"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setShape(option)}
            className={`plate cursor-pointer px-3 py-1.5 text-[0.875rem] ${
              shape === option ? "border-ink bg-teal-wash" : "hover:border-ink"
            }`}
          >
            {option === "post" ? "Wide, for a post" : "Square, for a grid"}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          className="plate misreg btn-primary font-display cursor-pointer px-4 py-2 font-bold"
        >
          Download the image
        </button>
        <button
          type="button"
          onClick={shareSheet}
          className="plate hover:border-ink cursor-pointer px-3 py-2 text-[0.9375rem]"
        >
          Share it
        </button>
        <button
          type="button"
          onClick={() => open("linkedin")}
          className="plate hover:border-ink cursor-pointer px-3 py-2 text-[0.9375rem]"
        >
          LinkedIn
        </button>
        <button
          type="button"
          onClick={() => open("x")}
          className="plate hover:border-ink cursor-pointer px-3 py-2 text-[0.9375rem]"
        >
          X
        </button>
        <button
          type="button"
          onClick={() => open("whatsapp")}
          className="plate hover:border-ink cursor-pointer px-3 py-2 text-[0.9375rem]"
        >
          WhatsApp
        </button>
      </div>

      <p className="text-ink-faint mt-3 text-[0.8125rem]" aria-live="polite">
        {note ??
          "Share it opens your phone's share sheet with the image attached, which is the one that reaches Instagram. On a computer, download it and attach it yourself."}
      </p>
    </div>
  );
}
