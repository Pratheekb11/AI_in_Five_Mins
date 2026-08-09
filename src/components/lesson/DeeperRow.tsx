import type { ReactNode } from "react";
import type { Video } from "@/lib/videos";
import { VideoPanel } from "./VideoPanel";

/**
 * Where to go next, on one row: the optional video, and the ways further down.
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
