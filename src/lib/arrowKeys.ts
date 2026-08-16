/* A game that steers with the arrow keys and a deck that turns the page with
   them are both listening on window, and the later listener cannot stop the
   earlier one. So a game claims the keys for as long as it is playing, and the
   deck stands down. */

let claims = 0;

export function claimArrowKeys(): () => void {
  claims += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims -= 1;
  };
}

export function arrowKeysClaimed(): boolean {
  return claims > 0;
}
