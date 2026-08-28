import { drawNimo, families, halftone, wrap } from "./certificate";

/**
 * The card a player gets after a game, sized for a LinkedIn feed thumbnail.
 * Deliberately its own look, not the certificate's — dark, high-contrast, big
 * numbers, minimal words, legible small. These are the site's real dark-theme
 * inks (`globals.css`'s `prefers-color-scheme: dark` block), not invented
 * ones.
 */
const INK = {
  paper: "#131319",
  paperRaised: "#1c1c24",
  ink: "#ece9e1",
  inkSoft: "#a9a6a0",
  pink: "#e8477f",
  teal: "#0f9e8d",
  blue: "#5570e8",
} as const;

const WIDTH = 1200;
const HEIGHT = 630;

export type GameShareArt = {
  siteUrl: string;
  gameName: string;
  /** e.g. "3" and "1" — the player's tally and the model's. */
  playerScore: string;
  modelScore: string;
  /** One plain-language line, e.g. "beat a language model 3-1 at guessing
   *  the next word." Written by the game, not this module — every game keeps
   *  its own scoring, so it is the one place that actually knows what
   *  happened. */
  resultLine: string;
};

/** The file this ends up as on somebody's machine. */
export function shareFileNameFor(art: GameShareArt): string {
  const slug = art.gameName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `aiinfive-${slug}-result.png`;
}

export function drawGameShareCard(canvas: HTMLCanvasElement, art: GameShareArt) {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const font = families();
  const pad = 64;

  ctx.fillStyle = INK.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  halftone(ctx, WIDTH, HEIGHT, 26, "#ffffff");

  // A raised plate, offset shadow, matching the site's own print cards.
  const plateX = pad;
  const plateY = pad;
  const plateW = WIDTH - pad * 2;
  const plateH = HEIGHT - pad * 2;
  ctx.fillStyle = "#000000";
  ctx.globalAlpha = 0.35;
  ctx.fillRect(plateX + 8, plateY + 8, plateW, plateH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK.paperRaised;
  ctx.fillRect(plateX, plateY, plateW, plateH);
  ctx.strokeStyle = INK.ink;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 2;
  ctx.strokeRect(plateX, plateY, plateW, plateH);
  ctx.globalAlpha = 1;

  const left = plateX + 48;
  let y = plateY + 74;

  // Wordmark.
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK.inkSoft;
  ctx.font = `700 22px ${font.data}`;
  ctx.fillText("AI IN FIVE", left, y);

  // Game name, top right.
  ctx.textAlign = "right";
  ctx.fillStyle = INK.inkSoft;
  ctx.font = `700 20px ${font.data}`;
  ctx.fillText(art.gameName.toUpperCase(), plateX + plateW - 48, y);
  ctx.textAlign = "left";

  y += 64;

  // The big number: player vs model, the whole point of the card.
  ctx.font = `800 128px ${font.display}`;
  ctx.fillStyle = INK.teal;
  const playerText = art.playerScore;
  ctx.fillText(playerText, left, y + 110);
  const playerWidth = ctx.measureText(playerText).width;

  ctx.font = `700 56px ${font.display}`;
  ctx.fillStyle = INK.inkSoft;
  const dashX = left + playerWidth + 24;
  ctx.fillText("–", dashX, y + 84);
  const dashWidth = ctx.measureText("–").width;

  ctx.font = `800 128px ${font.display}`;
  ctx.fillStyle = INK.pink;
  ctx.fillText(art.modelScore, dashX + dashWidth + 24, y + 110);

  ctx.font = `600 24px ${font.data}`;
  ctx.fillStyle = INK.inkSoft;
  ctx.fillText("YOU", left, y + 150);
  ctx.fillText(
    "MACHINE",
    dashX + dashWidth + 24,
    y + 150,
  );

  y += 210;

  // The result, in plain language, wrapped to the plate.
  ctx.font = `500 34px ${font.body}`;
  ctx.fillStyle = INK.ink;
  const lines = wrap(ctx, art.resultLine, plateW - 96);
  for (const line of lines.slice(0, 3)) {
    y += 44;
    ctx.fillText(line, left, y);
  }

  // Nimo, small, bottom right, and the URL, bottom left.
  drawNimo(ctx, plateX + plateW - 90, plateY + plateH - 86, 90);

  ctx.font = `600 24px ${font.data}`;
  ctx.fillStyle = INK.blue;
  ctx.fillText(art.siteUrl, left, plateY + plateH - 40);
}
