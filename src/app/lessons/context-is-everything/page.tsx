import { ContextBudget } from "@/components/games/ContextBudget";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import {
  ContextReel,
  type ContextShot,
} from "@/components/machines/ContextReel";
import type { CheckBeat } from "@/lib/check";
import { start as dealContext, type ContextData } from "@/lib/game/budget";
import { getLesson } from "@/lib/lessons";
import { readGameData } from "@/lib/server/gameData";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("context-is-everything")!;
const video = videoFor("context-is-everything")!;

export const metadata = lessonMetadata(lesson);

const contextData = readGameData<ContextData>("context.json");
const initialScene = dealContext(
  contextData,
  contextData.scenarios.map(() => Math.random()),
);

/* The reel's four shots, all measured: the deadline scenario with nothing in
   the window, with the email, with chat that has pushed the email out, and
   with the email pasted back beside the chat. */
const deadline = contextData.scenarios.find((s) => s.id === "deadline")!;
const shotOf = (cards: string[], dropped?: string): ContextShot => {
  const key = [...cards].sort().join("|");
  const c = deadline.combinations.find(
    (x) => [...x.cards].sort().join("|") === key,
  )!;
  return {
    cards,
    dropped,
    says: (c.says ?? c.topText).trim().replace(/[,.;:]+$/, ""),
    probability: c.probability,
  };
};
const CHAT = ["chat1", "chat2", "policy"];
const SHOTS: [ContextShot, ContextShot, ContextShot, ContextShot] = [
  shotOf([]),
  shotOf(["doc"]),
  shotOf(CHAT, "doc"),
  shotOf([...CHAT, "doc"]),
];
const REEL_CARDS = Object.fromEntries(
  deadline.cards.map((c) => [
    c.id,
    { label: c.label, text: c.text, relevant: c.kind === "relevant" },
  ]),
);

const SOURCES: Source[] = [
  {
    title: "What is a Context Window? Unlocking LLM Secrets",
    publisher: "IBM Technology",
    url: "https://www.youtube.com/watch?v=-QVoIxEpFkM",
    used: "The plain-language account of what a context window is and why it has an end.",
  },
  {
    title: "Lost in the Middle: How Language Models Use Long Contexts",
    publisher:
      "Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni & Liang (arXiv:2307.03172, 2023)",
    url: "https://arxiv.org/abs/2307.03172",
    used: "The measured finding that accuracy is highest when the relevant text sits at the start or the end of the context, and drops when it sits in the middle.",
  },
  {
    title: "Context windows",
    publisher: "Anthropic developer documentation",
    url: "https://docs.claude.com/en/docs/build-with-claude/context-windows",
    used: "A vendor's own description of how the window is counted and what happens to text that no longer fits.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "sort",
    prompt:
      "The right document is already in the context. Which of these extra cards can sit beside it without doing damage?",
    buckets: [
      {
        id: "safe",
        label: "Barely moves the answer",
        hint: "clutter, but harmless",
      },
      {
        id: "bad",
        label: "Wrecks the answer",
        hint: "competes with the right card",
      },
    ],
    items: [
      { id: "chat", text: "Small talk about the weekend", bucket: "safe" },
      { id: "policy", text: "An unrelated policy document", bucket: "safe" },
      {
        id: "stale",
        text: "An instruction you later superseded",
        bucket: "bad",
      },
      {
        id: "decoy",
        text: "A similar memo about a different case",
        bucket: "bad",
      },
      {
        id: "example",
        text: "A worked example with a placeholder in it",
        bucket: "bad",
      },
    ],
    because:
      "This was measured across all five scenarios in the game. Chit-chat and the unrelated policy land between 0.89× and 1.10× of the answer's probability. That is noise, and it is close to free. The other three are not noise. They are rivals. Each one holds something shaped like the answer. The worked example is the worst of them. In the wi-fi scenario it drags the right answer from 89.9% down to 3.8%, because the model copies the placeholder.",
  },
  {
    kind: "choice",
    prompt: "What is the most reliable way to fix a chat that has gone bad?",
    options: [
      "Tell it firmly to try harder and pay closer attention to everything you have already said",
      "Start a fresh chat and paste in a short summary of what matters",
      "Keep going in the same thread and give it a chance to recover on its own",
    ],
    answer: 1,
    because:
      "A long, messy chat is a long, messy context. Every wrong turn in it is still read as input. Starting again with a short, clean context is not giving up. It is the most useful habit on this whole site.",
  },
];

export default function ContextIsEverythingLesson() {
  const beats: Beat[] = [
    {
      id: "game",
      cta: "How it works",
      node: (
        <div className="space-y-4">
          <h1 className="display-md">
            It only knows{" "}
            <span className="text-teal-text">what you give it</span>.
          </h1>
          <ContextBudget
            initialData={contextData}
            initialScene={initialScene}
          />
        </div>
      ),
    },
    {
      id: "how",
      cta: "Got it",
      node: (
        <div className="mx-auto max-w-2xl space-y-4">
          <h2 className="display-md">Why it forgets</h2>
          <ContextReel
            ask={deadline.question}
            answer={deadline.answerLabel}
            cards={REEL_CARDS}
            shots={SHOTS}
          />
        </div>
      ),
    },
  ];

  const tail = (
    <>
      <div data-section="deeper" className="space-y-4">
        <MechanismPanel
          question="A fixed length of what, exactly?"
          summary="Not words, and not characters. The window is counted in tokens, which are the chunks a model actually reads."
          deeper="tokens"
        >
          <p>
            Before anything reaches the model, your text is cut into{" "}
            <strong>tokens</strong>: chunks of characters it has memorised.
            Common words survive whole, rarer ones shatter into pieces. The
            context window is a hard ceiling on how many of those chunks fit at
            once.
          </p>
          <p>
            Two consequences worth carrying around. A page of ordinary English
            costs far fewer tokens than a page of code, chemical names or
            unusual proper nouns. So how much fits depends on what you put in.
            And an attached file is not stored anywhere. It is poured into the
            same window as the conversation, and it competes for the same room.
          </p>
        </MechanismPanel>
        <MechanismPanel
          question="If it is all still in there, why does it miss things?"
          summary="Being inside the window is not the same as being used. Position within it measurably changes the odds."
          deeper="attention"
        >
          <p>
            Liu and colleagues tested this directly. They planted the answer to
            a question at different positions inside a long context and measured
            how often the model found it. Accuracy was highest when the answer
            sat near the beginning or the end, and dropped noticeably when it
            sat in the middle. That held even for models built specifically for
            long contexts.
          </p>
          <p>
            So &ldquo;it is in the document I gave you&rdquo; is a weaker
            guarantee than it feels. If one paragraph is what your question
            turns on, quote that paragraph. You are not being rude to the
            machine. You are moving that paragraph out of the middle.
          </p>
        </MechanismPanel>
        <Fold title="Watch somebody explain it" note={video.why}>
          <VideoPanel video={video} />
        </Fold>
        <Fold
          title="Go and try this on a real assistant"
          note="Make it drop something, in a chat you already have."
        >
          <PracticeCard
            title="Make it drop something"
            watchFor="That it never says 'I have lost that'. It either answers from what is left, or it fills the gap with something plausible. The silence is the whole problem. You have to notice the loss yourself."
          >
            <p>
              Open a long chat you already have, one that has run for dozens of
              messages. Near the top, find a specific instruction or detail you
              gave it early on. Now ask about that exact detail without
              repeating it.
            </p>
            <p>
              Then start a fresh chat, paste in four lines summarising what
              matters, and ask the same question. Compare the two answers.
            </p>
          </PracticeCard>
        </Fold>
      </div>

      <Fold
        title="Check yourself"
        note="Two beats. It marks itself, and nothing is sent anywhere."
      >
        <Check slug={lesson.slug} beats={CHECK} />
      </Fold>
    </>
  );

  return (
    <LessonStageShell
      lesson={lesson}
      sources={SOURCES}
      beats={beats}
      tail={tail}
    />
  );
}
