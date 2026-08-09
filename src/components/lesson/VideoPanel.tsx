"use client";

import { useState } from "react";
import type { Video } from "@/lib/videos";

/**
 * An optional video, loaded only if asked for.
 */
export function VideoPanel({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="plate overflow-hidden">
      <div className="border-ink/25 bg-paper-sunk border-b px-4 py-3">
        <p className="label text-ink-faint">
          Optional: watch someone explain it
        </p>
      </div>

      <div className="relative aspect-video bg-paper-sunk">
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 h-full w-full cursor-pointer"
            aria-label={`Play ${video.title} by ${video.channel} on YouTube`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="plate misreg bg-pink flex h-16 w-16 items-center justify-center rounded-full">
                <svg
                  width="20"
                  height="22"
                  viewBox="0 0 20 22"
                  aria-hidden="true"
                >
                  <path d="M2 1 L19 11 L2 21 Z" fill="var(--paper)" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>

      <figcaption className="px-4 py-3">
        <p className="font-display font-bold">{video.title}</p>
        <p className="label text-ink-faint mt-1">{video.channel}</p>
        <p className="text-ink-soft mt-2 text-sm">{video.why}</p>
      </figcaption>
    </figure>
  );
}
