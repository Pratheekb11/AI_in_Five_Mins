/**
 * Would you paste it?, the untimed rebuild.
 *
 * The content is unchanged and comes from `paste.ts`: the four categories, the
 * three doors, and twenty-six things somebody might reasonably consider pasting
 * into an assistant. What has gone is the forty-five second clock and the
 * flying cards. Deciding whether a document may leave your organisation is not
 * a reflex test, and dressing it up as one taught the wrong instinct.
 *
 * HONESTY, and it matters here more than most places. The routing rule this
 * scores against is a policy, not a measurement, you cannot measure whether
 * something ought to be pasted. What is not a policy is the legal category:
 * special category data is defined in Article 9 of the GDPR, and the page links
 * to the text rather than paraphrasing it and hoping.
 *
 * The other half is not policy either. Context Budget measured that whatever
 * you put in the window is most of what comes out, and Pushback measured that
 * it gets copied. "What you paste becomes part of what it produces" is a thing
 * this site demonstrated, not a thing it asserts here.
 */

import { CORRECT, type Door, type Kind, type Payload, PAYLOADS } from "./paste";

export const ROUND_SIZE = 8;

/** Where the legal category actually comes from. Verified, not remembered. */
export const LAW = {
  article: "Article 9, UK and EU GDPR: special categories of personal data",
  url: "https://gdpr-info.eu/art-9-gdpr/",
  guidance: "ICO guidance on special category data",
  guidanceUrl:
    "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/",
};

/** Findings from elsewhere on this site that bear on the decision. */
export const WHY_IT_MATTERS = [
  {
    where: "Context Budget",
    slug: "context-is-everything",
    finding:
      "Whatever goes in the window is most of what comes out. One unhelpful card dropped the right answer from 89.9% to 3.8%.",
  },
  {
    where: "Pushback",
    slug: "where-it-breaks",
    finding:
      "What you put in front of it gets copied back: assert something and it comes out 89.7% in favour of what you asserted.",
  },
];

export type CheckScene = {
  deck: Payload[];
  at: number;
  chosen: Door | null;
  score: number;
  right: number;
  /** Items sent somewhere they should not have gone. */
  leaked: number;
  /** Items kept out that would have been fine. */
  overCautious: number;
  done: boolean;
};

export function newScene(): CheckScene {
  return {
    deck: [],
    at: 0,
    chosen: null,
    score: 0,
    right: 0,
    leaked: 0,
    overCautious: 0,
    done: false,
  };
}

export function shuffledBy<T>(items: readonly T[], rolls: number[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor((rolls[i] ?? 0) * (i + 1)));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

export function start(rolls: number[]): CheckScene {
  return {
    ...newScene(),
    deck: shuffledBy(PAYLOADS, rolls).slice(0, ROUND_SIZE),
  };
}

export function current(scene: CheckScene): Payload | undefined {
  return scene.deck[scene.at];
}

export function answerFor(payload: Payload): Door {
  return CORRECT[payload.kind];
}

/** How wrong a wrong answer was, which is not symmetric. */
export type Verdict = "right" | "leak" | "cautious" | "near";

export function verdictFor(payload: Payload, chosen: Door): Verdict {
  const answer = answerFor(payload);
  if (chosen === answer) return "right";

  const order: Door[] = ["paste", "redact", "never"];
  const wanted = order.indexOf(answer);
  const took = order.indexOf(chosen);

  // Sending something further out than it should go is the expensive mistake.
  if (took < wanted) return "leak";
  // Holding back something that was fine costs you the tool, not the data.
  return payload.kind === "open" ? "cautious" : "near";
}

const POINTS: Record<Verdict, number> = {
  right: 140,
  near: 40,
  cautious: 30,
  leak: 0,
};

export function choose(scene: CheckScene, door: Door): CheckScene {
  const payload = current(scene);
  if (!payload || scene.done || scene.chosen !== null) return scene;

  const verdict = verdictFor(payload, door);

  return {
    ...scene,
    chosen: door,
    score: scene.score + POINTS[verdict],
    right: scene.right + (verdict === "right" ? 1 : 0),
    leaked: scene.leaked + (verdict === "leak" ? 1 : 0),
    overCautious: scene.overCautious + (verdict === "cautious" ? 1 : 0),
  };
}

export function next(scene: CheckScene): CheckScene {
  if (scene.chosen === null) return scene;
  const at = scene.at + 1;
  if (at >= scene.deck.length) return { ...scene, done: true };
  return { ...scene, at, chosen: null };
}

export type { Door, Kind, Payload };
