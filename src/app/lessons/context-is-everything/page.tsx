import { ContextBudget } from "@/components/games/ContextBudget";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { ContextWindowFigure } from "@/components/machines/ContextWindowFigure";
import type { CheckBeat } from "@/lib/check";
import {
  start as dealContext,
  type ContextData,
} from "@/lib/game/budget";
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

const STEPS: Step[] = [
  {
    say: "Here is the part nobody tells you. The model does not remember your conversation. Every time you press send, it is handed a window of text and reads it fresh. Start with that window empty.",
    caption:
      "Watch the window and the meter below rather than waiting for a new picture. Every step from here changes those same two things.",
  },
  {
    say: "Now put the memo in. That single card is the only reason it can answer at all, and the meter says so. Everything the model knows about your situation is in that box and nowhere else.",
    caption:
      "Not your last conversation. Not the file you did not attach. Not the correction you made yesterday.",
  },
  {
    say: "The window has a fixed size. As the chat goes on, more arrives, and when there is no room the oldest is dropped to make it fit. Watch which card leaves.",
    caption:
      "The memo is gone, and with it the only thing in the window that could answer the question. Nothing warned you, and nothing marks the reply.",
  },
  {
    say: "And here is what makes it dangerous. The reply comes back in exactly the same confident voice. It is not lying to you about remembering. From where it sits, that memo was never there.",
  },
  {
    say: "Which tells you the fix. Do not ask it to remember harder. Put the thing back in front of it. Restate the constraint, paste the document again, or start a fresh chat with a short summary you wrote yourself.",
    caption:
      "Now build the window yourself. Every combination of those seven cards was measured, so whatever you assemble has a real number waiting for it.",
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
      cta: "What just happened",
      node: (
        <div className="space-y-4">
          <h2 className="display-md">
            It does not remember your conversation. It{" "}
            <span className="text-teal-text">re-reads all of it</span>, from
            the top, every single time.
          </h2>
          <ContextBudget
            initialData={contextData}
            initialScene={initialScene}
          />
        </div>
      ),
    },
    {
      id: "walkthrough",
      selfAdvance: true,
      node: <Walkthrough steps={STEPS} figure={<ContextWindowFigure />} />,
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
