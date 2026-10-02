import type { ReactNode } from "react";

/**
 * Keeps a board the same height before and after an answer.
 *
 * A round has two faces, the question and the reveal, and the reveal is
 * usually taller. Swapping one for the other changed the beat's height, so
 * the deck rescaled the whole board at the exact moment the reader was
 * looking at it. Here both faces sit in one grid cell: the one on show, and
 * the other drawn invisibly and inert underneath it. The cell is as tall as
 * the taller face from the first frame, so answering moves nothing.
 *
 * `held` is the face not on show. Give it a key that differs from `shown`'s
 * when the same view swaps between the two, or its entrance animation never
 * replays.
 */
export function HoldRoom({
  shown,
  held,
}: {
  shown: ReactNode;
  held?: ReactNode;
}) {
  return (
    <div className="grid">
      <div className="min-w-0 [grid-area:1/1]">{shown}</div>
      {held ? (
        <div
          aria-hidden="true"
          inert
          className="pointer-events-none invisible min-w-0 [grid-area:1/1]"
        >
          {held}
        </div>
      ) : null}
    </div>
  );
}
