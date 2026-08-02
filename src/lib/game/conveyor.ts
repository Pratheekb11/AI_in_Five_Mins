/**
 * The rules of The conveyor, as pure functions.
 *
 * A belt of fixed physical length carries chat messages. New ones are pushed on
 * at the right; everything already there slides left; anything whose middle
 * passes the left edge tips off and is gone. Nothing here knows about React —
 * every frame produces a whole new scene from the old one, and nothing the
 * caller passed in is ever mutated.
 *
 * The belt's length is the point of the whole lesson, so it is a constant here
 * rather than something the player can grow. The only lever they get is which
 * message to push back to the front, and doing that costs everything else a
 * shove toward the edge — which is exactly the trade a real context window
 * makes for you, silently.
 */

/* ------------------------------------------------------------------ types -- */

export type Ask = {
  ask: string;
  /** Three options. `answer` indexes this array before shuffling. */
  options: string[];
  answer: number;
};

export type ConveyorLine = {
  who: string;
  /** Pre-split so a card never has to wrap text at runtime. */
  lines: string[];
  q?: Ask;
};

export type Message = {
  id: number;
  /** Index into the deck, so a fact is only ever asked about once. */
  source: number;
  who: string;
  lines: string[];
  q?: Ask;
  w: number;
  /** Left edge, in view units. */
  x: number;
  vx: number;
  /** The player pushed this one back to the front. */
  resent: boolean;
  flash: number;
  flashInk: string;
};

export type Falling = {
  id: number;
  who: string;
  lines: string[];
  w: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
};

export type Question = {
  /** The message instance the answer is printed on. */
  onId: number;
  ask: string;
  options: string[];
  answer: number;
  remaining: number;
  limit: number;
};

export type Verdict = { text: string; ink: string; life: number };

export type Pop = { x: number; y: number; text: string; life: number; ink: string };

export type ConveyorScene = {
  /** Oldest first. The last one is the newest and sits at the right edge. */
  messages: Message[];
  falling: Falling[];
  question: Question | null;
  /** Which card the player has selected, indexed from the oldest end. */
  cursor: number;
  order: number[];
  orderAt: number;
  nextId: number;
  asked: number[];
  spawnIn: number;
  questionIn: number;
  sendCooldown: number;
  gone: number;
  remaining: number;
  score: number;
  combo: number;
  bestCombo: number;
  recalled: number;
  lost: number;
  wrong: number;
  kept: number;
  verdict: Verdict | null;
  pops: Pop[];
  /** Reduced motion: no tumbling, no drift, stiffer springs. */
  calm: boolean;
};

/* -------------------------------------------------------------- geometry -- */

export const VIEW_W = 380;
/** Just enough room under the belt for a card to tumble out of frame. */
export const VIEW_H = 158;
export const BELT_L = 8;
export const BELT_R = 372;
export const CARD_Y = 36;
export const CARD_H = 76;
export const BELT_Y = 112;
export const GAP = 5;
/** Width of the printed warning band at the falling end. */
export const EDGE_BAND = 26;
export const ROUND_SECONDS = 45;

const SPRING = 130;
const DAMP = 18;
const GRAVITY = 900;
const SEND_COOLDOWN = 0.3;

/* ------------------------------------------------------------------- deck -- */

/**
 * The chat on the belt. Invented for the game: a fictional team planning a
 * fictional trip, written so every fact is short enough to print on a card and
 * distinct enough that guessing does not work. Nothing here is real data.
 */
export const DECK: ConveyorLine[] = [
  {
    who: "Priya",
    lines: ["flight lands", "06:40"],
    q: { ask: "What time does the flight land?", options: ["06:40", "07:40", "06:14"], answer: 0 },
  },
  {
    who: "Sam",
    lines: ["hotel: the", "Marigold"],
    q: {
      ask: "Which hotel is booked?",
      options: ["The Marigold", "The Marlow", "The Meridian"],
      answer: 0,
    },
  },
  {
    who: "Dev",
    lines: ["budget cap", "is 1,200"],
    q: { ask: "What is the budget cap?", options: ["1,200", "1,020", "2,100"], answer: 0 },
  },
  {
    who: "Ruth",
    lines: ["room 4B", "not 4D"],
    q: { ask: "Which room did Ruth give?", options: ["4B", "4D", "4A"], answer: 0 },
  },
  {
    who: "Priya",
    lines: ["deck due", "Thursday"],
    q: { ask: "When is the deck due?", options: ["Thursday", "Friday", "Tuesday"], answer: 0 },
  },
  {
    who: "Sam",
    lines: ["Ana is vegan", "no fish"],
    q: {
      ask: "What does Ana eat?",
      options: ["Vegan, no fish", "Fish is fine", "No preference"],
      answer: 0,
    },
  },
  {
    who: "Dev",
    lines: ["wifi code:", "BLUEHERON"],
    q: {
      ask: "What is the wifi code?",
      options: ["BLUEHERON", "BLUEHERRON", "BLUEHARBOUR"],
      answer: 0,
    },
  },
  {
    who: "Ruth",
    lines: ["train goes", "platform 9"],
    q: { ask: "Which platform?", options: ["9", "6", "19"], answer: 0 },
  },
  {
    who: "Mo",
    lines: ["call moved", "to 15:30"],
    q: { ask: "When was the call moved to?", options: ["15:30", "13:30", "15:13"], answer: 0 },
  },
  {
    who: "Priya",
    lines: ["invoice ref", "QX-4471"],
    q: {
      ask: "What is the invoice reference?",
      options: ["QX-4471", "QX-4417", "QZ-4471"],
      answer: 0,
    },
  },
  {
    who: "Sam",
    lines: ["Lena signs", "not Marcus"],
    q: { ask: "Who signs it off?", options: ["Lena", "Marcus", "Ruth"], answer: 0 },
  },
  {
    who: "Dev",
    lines: ["print 30", "not 13"],
    q: { ask: "How many copies?", options: ["30", "13", "3"], answer: 0 },
  },
  {
    who: "Mo",
    lines: ["seats J14", "and J15"],
    q: {
      ask: "Which seats?",
      options: ["J14 and J15", "J41 and J51", "J4 and J5"],
      answer: 0,
    },
  },
  {
    who: "Ruth",
    lines: ["venue shuts", "at 22:00"],
    q: { ask: "When does the venue shut?", options: ["22:00", "20:00", "22:30"], answer: 0 },
  },

  // Filler. It carries nothing you will be asked about, and it still shoves the
  // belt — which is the part people do not expect.
  { who: "Mo", lines: ["on my way"] },
  { who: "Sam", lines: ["sounds good"] },
  { who: "Priya", lines: ["adding Ana", "to invite"] },
  { who: "Dev", lines: ["I have the", "adapter"] },
  { who: "Ruth", lines: ["five min", "late"] },
  { who: "Mo", lines: ["who has the", "projector?"] },
  { who: "Sam", lines: ["can we start", "at half past"] },
  { who: "Dev", lines: ["done"] },
  { who: "Priya", lines: ["thanks all"] },
  { who: "Mo", lines: ["noted"] },
  { who: "Ruth", lines: ["got it"] },
  { who: "Sam", lines: ["one moment"] },
];

/* --------------------------------------------------------------- helpers -- */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Card widths follow their printed contents, so the belt packs unevenly. */
export function cardWidth(line: ConveyorLine): number {
  let longest = line.who.length * 5.8;
  for (const l of line.lines) longest = Math.max(longest, l.length * 6.4);
  return clamp(Math.round(longest) + 18, 66, 104);
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/**
 * The order messages arrive in: roughly two facts to every bit of chatter, so
 * the belt always has something worth keeping and always has noise pushing it.
 */
function buildOrder(): number[] {
  const facts: number[] = [];
  const chatter: number[] = [];
  DECK.forEach((line, i) => (line.q ? facts : chatter).push(i));

  const f = shuffled(facts);
  const c = shuffled(chatter);
  const out: number[] = [];
  let fi = 0;
  let ci = 0;
  while (fi < f.length || ci < c.length) {
    for (let k = 0; k < 2 && fi < f.length; k++) out.push(f[fi++]);
    if (ci < c.length) out.push(c[ci++]);
  }
  return out;
}

function makeMessage(source: number, id: number): Message {
  const line = DECK[source];
  return {
    id,
    source,
    who: line.who,
    lines: line.lines,
    q: line.q,
    w: cardWidth(line),
    x: VIEW_W + 40,
    vx: 0,
    resent: false,
    flash: 0,
    flashInk: "var(--teal)",
  };
}

/** Where each card wants to be: packed hard against the right-hand end. */
export function targets(messages: Message[]): number[] {
  const out: number[] = new Array(messages.length);
  let right = BELT_R;
  for (let i = messages.length - 1; i >= 0; i--) {
    out[i] = right - messages[i].w;
    right = out[i] - GAP;
  }
  return out;
}

/** 0 at the arrival end, 1 at the edge it falls off. */
export function danger(m: Message): number {
  return clamp(1 - (m.x - BELT_L) / (BELT_R - BELT_L - m.w), 0, 1);
}

/** Rounds get faster in four steps, so a comfortable belt becomes a full one. */
export function levelOf(scene: ConveyorScene): number {
  return clamp(Math.floor((ROUND_SECONDS - scene.remaining) / 9), 0, 4);
}

const SPAWN_EVERY = [3.3, 2.9, 2.5, 2.2, 1.9];
const QUESTION_EVERY = [5.6, 5.0, 4.4, 3.9, 3.4];
const QUESTION_LIMIT = [11, 10, 9, 8, 7];

/** How long until the next message is pushed on, at this level. */
export function spawnInterval(level: number): number {
  return SPAWN_EVERY[clamp(level, 0, SPAWN_EVERY.length - 1)];
}

/**
 * `randomise` is off for the scene rendered before anyone presses play: that
 * one is drawn on the server as well as the client, and a shuffled deck would
 * make the two disagree.
 */
export function newScene(calm: boolean, randomise = true): ConveyorScene {
  const order = randomise ? buildOrder() : DECK.map((_, i) => i);
  const messages: Message[] = [];
  for (let i = 0; i < 3; i++) messages.push(makeMessage(order[i], i + 1));
  const t = targets(messages);
  for (let i = 0; i < messages.length; i++) messages[i].x = t[i];

  return {
    messages,
    falling: [],
    question: null,
    cursor: 0,
    order,
    orderAt: 3,
    nextId: 4,
    asked: [],
    spawnIn: 2.2,
    questionIn: 3.4,
    sendCooldown: 0,
    gone: 0,
    remaining: ROUND_SECONDS,
    score: 0,
    combo: 0,
    bestCombo: 0,
    recalled: 0,
    lost: 0,
    wrong: 0,
    kept: 0,
    verdict: null,
    pops: [],
    calm,
  };
}

function pop(x: number, text: string, ink: string): Pop {
  return { x, y: CARD_Y - 8, text, life: 1, ink };
}

/** Pick the message a question will be about. Older as the round tightens. */
function chooseQuestion(scene: ConveyorScene, level: number): Question | null {
  const pool = scene.messages.filter(
    (m) => m.q !== undefined && !scene.asked.includes(m.source),
  );
  if (pool.length === 0) return null;

  const from = clamp(pool.length - 1 - level, 0, pool.length - 1);
  const target = pool[from];
  const ask = target.q!;

  // Shuffle the options so the answer is never in a learnable position.
  const picks = shuffled([0, 1, 2]);
  return {
    onId: target.id,
    ask: ask.ask,
    options: picks.map((i) => ask.options[i]),
    answer: picks.indexOf(ask.answer),
    remaining: QUESTION_LIMIT[level],
    limit: QUESTION_LIMIT[level],
  };
}

function losing(
  scene: ConveyorScene,
  base: Partial<ConveyorScene>,
  text: string,
  level: number,
): ConveyorScene {
  return {
    ...scene,
    ...base,
    question: null,
    questionIn: QUESTION_EVERY[level],
    combo: 0,
    lost: scene.lost + 1,
    verdict: { text, ink: "var(--pink-text)", life: 3 },
  };
}

/* ----------------------------------------------------------------- frame -- */

/** One frame of sliding, tipping and bookkeeping. */
export function advance(scene: ConveyorScene, delta: number): ConveyorScene {
  const level = levelOf(scene);
  const remaining = Math.max(0, scene.remaining - delta);

  let messages = scene.messages.map((m) => ({ ...m }));
  let orderAt = scene.orderAt;
  let nextId = scene.nextId;
  let spawnIn = scene.spawnIn - delta;

  if (spawnIn <= 0) {
    messages.push(makeMessage(scene.order[orderAt % scene.order.length], nextId));
    orderAt += 1;
    nextId += 1;
    spawnIn += SPAWN_EVERY[level];
  }

  // Slide. Each card is sprung toward the slot the packing gives it, so a new
  // arrival shoves the whole belt rather than teleporting it.
  const t = targets(messages);
  const stiff = scene.calm ? SPRING * 1.8 : SPRING;
  const damp = scene.calm ? DAMP * 1.6 : DAMP;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    m.vx += ((t[i] - m.x) * stiff - m.vx * damp) * delta;
    m.x += m.vx * delta;
    m.flash = Math.max(0, m.flash - delta * 1.6);
  }

  // Tip off the end. A card goes once its middle is past the edge — there is
  // nothing left holding it up.
  const falling = scene.falling.map((f) => ({ ...f }));
  let gone = scene.gone;
  const survivors: Message[] = [];
  for (const m of messages) {
    if (m.x + m.w / 2 >= BELT_L) {
      survivors.push(m);
      continue;
    }
    gone += 1;
    falling.push({
      id: m.id,
      who: m.who,
      lines: m.lines,
      w: m.w,
      x: m.x,
      y: CARD_Y,
      vx: scene.calm ? -20 : -40 - Math.random() * 40,
      vy: -30,
      angle: 0,
      spin: scene.calm ? 0 : -70 - Math.random() * 90,
    });
  }
  messages = survivors;

  for (const f of falling) {
    f.vy += GRAVITY * delta;
    f.x += f.vx * delta;
    f.y += f.vy * delta;
    f.angle += f.spin * delta;
  }
  const stillFalling = falling.filter((f) => f.y < VIEW_H + 60);

  const pops = scene.pops
    .map((p) => ({ ...p, y: p.y - (scene.calm ? 0 : 26) * delta, life: p.life - delta }))
    .filter((p) => p.life > 0);

  const verdict =
    scene.verdict && scene.verdict.life - delta > 0
      ? { ...scene.verdict, life: scene.verdict.life - delta }
      : null;

  const base: Partial<ConveyorScene> = {
    messages,
    falling: stillFalling,
    orderAt,
    nextId,
    spawnIn,
    gone,
    remaining,
    pops,
    verdict,
    cursor: clamp(scene.cursor, 0, Math.max(0, messages.length - 1)),
    sendCooldown: Math.max(0, scene.sendCooldown - delta),
  };

  // The question the player is working on may have just slid into the bin.
  if (scene.question) {
    const alive = messages.some((m) => m.id === scene.question!.onId);
    if (!alive) {
      return losing(
        scene,
        base,
        "Gone. It slid off the end while you were busy.",
        level,
      );
    }
    const left = scene.question.remaining - delta;
    if (left <= 0) {
      return losing(scene, base, "Too slow. It is still there, but not for long.", level);
    }
    return {
      ...scene,
      ...base,
      question: { ...scene.question, remaining: left },
    };
  }

  const questionIn = scene.questionIn - delta;
  if (questionIn <= 0) {
    const next = chooseQuestion({ ...scene, messages }, level);
    if (next) {
      return {
        ...scene,
        ...base,
        question: next,
        questionIn: 0,
        asked: [
          ...scene.asked,
          messages.find((m) => m.id === next.onId)?.source ?? -1,
        ],
        verdict: null,
      };
    }
    return { ...scene, ...base, questionIn: 1.2 };
  }

  return { ...scene, ...base, questionIn };
}

/* --------------------------------------------------------------- actions -- */

export function moveCursor(scene: ConveyorScene, step: number): ConveyorScene {
  if (scene.messages.length === 0) return scene;
  const cursor = clamp(scene.cursor + step, 0, scene.messages.length - 1);
  return cursor === scene.cursor ? scene : { ...scene, cursor };
}

export function selectAt(scene: ConveyorScene, id: number): ConveyorScene {
  const cursor = scene.messages.findIndex((m) => m.id === id);
  return cursor < 0 || cursor === scene.cursor ? scene : { ...scene, cursor };
}

/**
 * Push the selected message back to the front of the belt.
 *
 * It costs nothing directly and everything indirectly: the card leaves its slot
 * and takes the newest one, so every other card on the belt slides its whole
 * width closer to the edge. Saving one thing always spends the others.
 */
export function sendToFront(scene: ConveyorScene): ConveyorScene {
  if (scene.sendCooldown > 0 || scene.messages.length < 2) return scene;
  const at = clamp(scene.cursor, 0, scene.messages.length - 1);
  const picked = scene.messages[at];
  if (at === scene.messages.length - 1) return scene;

  const rest = scene.messages.filter((_, i) => i !== at);
  const moved: Message = {
    ...picked,
    resent: true,
    flash: 1,
    flashInk: "var(--yellow)",
  };

  return {
    ...scene,
    messages: [...rest, moved],
    cursor: rest.length,
    sendCooldown: SEND_COOLDOWN,
    kept: scene.kept + (picked.resent ? 0 : 1),
    pops: [...scene.pops, pop(picked.x + picked.w / 2, "kept", "var(--yellow-text)")],
  };
}

/** The player answered. Score against the message it was actually printed on. */
export function answer(scene: ConveyorScene, choice: number): ConveyorScene {
  const q = scene.question;
  if (!q) return scene;
  const level = levelOf(scene);
  const source = scene.messages.find((m) => m.id === q.onId);
  if (!source) {
    return losing(scene, {}, "Gone. It slid off the end while you were busy.", level);
  }

  const at = danger(source);

  if (choice !== q.answer) {
    return {
      ...scene,
      question: null,
      questionIn: QUESTION_EVERY[level],
      combo: 0,
      wrong: scene.wrong + 1,
      verdict: {
        text: "Not what the message said. It is on the belt — read it.",
        ink: "var(--pink-text)",
        life: 3,
      },
      messages: scene.messages.map((m) =>
        m.id === q.onId ? { ...m, flash: 1, flashInk: "var(--pink)" } : m,
      ),
      pops: [...scene.pops, pop(source.x + source.w / 2, "wrong", "var(--pink-text)")],
    };
  }

  const gained =
    50 + Math.round(60 * at) + scene.combo * 12 + (source.resent ? 40 : 0);
  const combo = scene.combo + 1;

  return {
    ...scene,
    question: null,
    questionIn: QUESTION_EVERY[level],
    score: scene.score + gained,
    combo,
    bestCombo: Math.max(scene.bestCombo, combo),
    recalled: scene.recalled + 1,
    verdict: {
      text: source.resent
        ? "Right. You pushed it back, so it was still there to read."
        : at > 0.66
          ? "Right, with that message one shove from the edge."
          : "Right. It was still on the belt.",
      ink: "var(--teal-text)",
      life: 3,
    },
    messages: scene.messages.map((m) =>
      m.id === q.onId ? { ...m, flash: 1, flashInk: "var(--teal)" } : m,
    ),
    pops: [...scene.pops, pop(source.x + source.w / 2, `+${gained}`, "var(--teal-text)")],
  };
}
