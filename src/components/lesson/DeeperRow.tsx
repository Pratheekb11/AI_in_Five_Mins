import type { ReactNode } from "react";
import type { Video } from "@/lib/videos";
import { VideoPanel } from "./VideoPanel";

/**
 * Where to go next, on one row: the optional video, and the ways further down.
 *
 * The video used to sit in a narrow column beside the walkthrough. That was
 * fine when a walkthrough was a paragraph and a small picture. Now that it
 * carries a figure it is much taller, so the video column ended in a long
 * stretch of empty paper, and the walkthrough itself was squeezed into two
 * thirds of the page while the game above it had the full width.
 *
 * So the walkthrough gets the same width as the game, and the video comes down
 * here to share a row with the mechanism panels. Both halves are the same kind
 * of thing: optional, and about going deeper than the chapter needs you to.
 *
 * The column beside the video carries the mechanism panels and the practice
 * card, which is what stops it ending short: two collapsed panels alone are
 * about half the height of a 16:9 video, and the gap that left was the whole
 * complaint. `items-start` keeps the video at its own height rather than
 * stretching it to match whatever is beside it.
 */
export function DeeperRow({
  video,
  children,
}: {
  /** Omitted where a chapter deliberately has no video. */
  video?: Video;
  /** The mechanism panels, and anything else optional. */
  children: ReactNode;
}) {
  if (!video)
    return (
      <div className="space-y-4 pb-4" data-section="deeper">
        {children}
      </div>
    );

  return (
    <div
      className="grid gap-4 pb-4 lg:grid-cols-[1fr_1.15fr] lg:items-start"
      data-section="deeper"
    >
      <VideoPanel video={video} />
      <div className="space-y-4">{children}</div>
    </div>
  );
}
