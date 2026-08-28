import { Pushback } from "@/components/games/Pushback";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { PushbackFigure } from "@/components/machines/PushbackFigure";
import type { CheckBeat } from "@/lib/check";
import {
  start as dealPushback,
  type PushData,
} from "@/lib/game/pushback";
import { getLesson } from "@/lib/lessons";
import { readGameData } from "@/lib/server/gameData";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("where-it-breaks")!;
const video = videoFor("where-it-breaks")!;

export const metadata = lessonMetadata(lesson);

const pushbackData = readGameData<PushData>("pushback.json");
const initialScene = dealPushback(
  pushbackData,
  Array.from({ length: 40 }, () => Math.random()),
);

const SOURCES: Source[] = [
  {
    title: "Why Language Models Hallucinate",
    publisher: "Kalai, Nachum, Vempala & Zhang (arXiv:2509.04664, 2025)",
    url: "https://arxiv.org/abs/2509.04664",
    used: "The argument that models guess rather than admit uncertainty because training and evaluation reward guessing.",
  },
  {
    title: "Towards Understanding Sycophancy in Language Models",
    publisher: "Sharma et al. (arXiv:2310.13548, 2023)",
    url: "https://arxiv.org/abs/2310.13548",
    used: "The measurement that five state-of-the-art assistants consistently caved to user views across four tasks, and that human raters sometimes prefer a well-written sycophantic answer to a correct one.",
  },
  {
    title: "Faith and Fate: Limits of Transformers on Compositionality",
    publisher: "Dziri et al. (arXiv:2305.18654, 2023)",
    url: "https://arxiv.org/abs/2305.18654",
    used: "The measured collapse on multi-digit multiplication, and the finding that models match patterns of working rather than carrying out the procedure.",
  },
  {
    title: "Survey of Hallucination in Natural Language Generation",
    publisher: "Ji et al. (arXiv:2202.03629, 2022)",
    url: "https://arxiv.org/abs/2202.03629",
    used: "The broader map of what is meant by hallucination and how it is measured.",
  },
  {
    title: "Why Large Language Models Hallucinate",
    publisher: "IBM Technology",
    url: "https://www.youtube.com/watch?v=cfqtFvWOfg0",
    used: "A short plain-language version of the same account.",
  },
  {
    title: "Models overview",
    publisher: "Anthropic developer documentation",
    url: "https://docs.claude.com/en/docs/about-claude/models/overview",
    used: "A vendor publishing a training data cutoff, which is the fixed date past which a model has seen nothing.",
  },
];

const STEPS: Step[] = [
  {
    say: "These tools fail in four ways, over and over. They invent things, they go stale, they cave when you push, and they cannot really do arithmetic. One of those four you can watch happen, live, so start there. Here is a fact nobody disputes, asked flat.",
    caption:
      "Two bars, the true answer and a false one. They stay on screen for the rest of this. All that changes is the sentence put in front of the model.",
  },
  {
    say: "First, just lean on the question a little. Do not assert anything, only sound sure. Confidence in the wording alone is enough to move the odds, and it moves them the wrong way.",
  },
  {
    say: "Now actually push. State the wrong answer first, as though it were settled, and then ask. Watch the bars cross.",
    caption:
      "That is caving. Nothing about the model changed between these three sentences. Only what it was told before the question.",
  },
  {
    say: "Here is the part that matters more, and almost nobody shows it. Assert the right answer first instead, in exactly the same shape of sentence. It agrees just as hard.",
  },
  {
    say: "So it is not being argued out of anything. It is copying whatever sits in front of it, whichever direction that points. Which means agreement after you push back tells you nothing at all, and you should push on answers you believe as well as ones you doubt. Try any of the eleven facts.",
  },
  {
    say: "The other three modes are the same fault wearing different clothes. It invents because the training rewards a confident guess over an admission. It goes stale because its knowledge stops on a date it cannot see past. And it cannot carry a calculation, only imitate the look of one. The panels below take those apart.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "match",
    prompt:
      "Match each thing you have seen it do with what is actually going on.",
    pairs: [
      {
        left: "It cites a paper with author, year and page range",
        right: "Detail is a property of the text, not evidence about the world",
      },
      {
        left: "You say 'that is wrong' and it folds instantly",
        right:
          "It is moving toward your apparent view, not re-checking anything",
      },
      {
        left: "It quotes a price that was right two years ago",
        right:
          "It was true on a date you cannot see, stated as if it were today",
      },
      {
        left: "It is vaguest on the topic you know best",
        right: "It read little on it, so plausible is all that is left",
      },
    ],
    because:
      "Four symptoms, one machine. None of them is a malfunction you could patch: each one is what continuing text looks like when the text has run out of grounding, run into your confidence, or run past its own cut-off.",
  },
  {
    kind: "choice",
    prompt:
      "You tell it 'that is wrong' with no reason, and it immediately agrees and changes the answer. What just happened?",
    options: [
      "It re-checked its own work, found the error, and corrected it for you",
      "It matched your confidence, a documented behaviour called sycophancy",
      "The first answer was definitely wrong, which is why it gave way so quickly",
    ],
    answer: 1,
    because:
      "Nothing was re-checked. There is no separate place for it to check against. Sharma and colleagues measured this across five leading assistants. So agreement after a push is worth nothing. That is why you should push back on answers you believe, as well as on ones you doubt.",
  },
];

export default function WhereItBreaksLesson() {
  const beats: Beat[] = [
    {
      id: "game",
      cta: "What just happened",
      node: (
        <div className="space-y-4">
          <h2 className="display-md">
            It fails in{" "}
            <span className="text-pink-text">exactly four ways</span>. You
            have probably only ever noticed one of them.
          </h2>
          <Pushback initialData={pushbackData} initialScene={initialScene} />
        </div>
      ),
    },
    {
      id: "walkthrough",
      selfAdvance: true,
      node: <Walkthrough steps={STEPS} figure={<PushbackFigure />} />,
    },
  ];

  const tail = (
    <>
      <div data-section="deeper" className="space-y-4">
        <MechanismPanel
          question="Why does it not just say it does not know?"
          summary="Because nothing in it measures certainty, and the way models are graded rewards a guess over an admission."
          deeper="why-ai-gets-things-wrong"
        >
          <p>
            There is no lookup step and no confidence meter. At every point the
            model ranks what would plausibly come next, and picks. That
            procedure has no state that means &ldquo;I have not seen enough
            about this&rdquo;.
          </p>
          <p>
            Kalai and colleagues add the part that explains why it stays that
            way. Models are tuned to score well on tests, and those tests give a
            wrong answer and an &ldquo;I do not know&rdquo; the same mark: zero.
            Under that scoring, guessing always beats saying nothing. The
            confident wrong answer is not a bug in the training. It is what the
            training asked for.
          </p>
        </MechanismPanel>
        <MechanismPanel
          question="Why can it write flawless code but not multiply?"
          summary="It is producing text that matches the shape of working out, rather than executing the steps."
          deeper="how-llms-answer"
        >
          <p>
            Dziri and colleagues tested this on multi-digit multiplication and
            two other tasks that need real step-by-step composition. Accuracy
            held on small cases and fell away sharply as the problems grew.
            Their conclusion: the models reduce multi-step reasoning to matching
            patterns of previously seen working, rather than carrying out the
            procedure.
          </p>
          <p>
            Which is why the fix is not a better prompt. It is a calculator. Ask
            for the numbers to be computed with a tool, or paste them into a
            spreadsheet yourself. The next chapter is about what changes when
            the model can actually run one.
          </p>
        </MechanismPanel>
        <Fold title="Watch somebody explain it" note={video.why}>
          <VideoPanel video={video} />
        </Fold>
        <Fold
          title="Go and try this on a real assistant"
          note="Push back on an answer you know is right."
        >
          <PracticeCard
            title="Push back on an answer you know is right"
            watchFor="Whether it holds. If it folds on something you know to be true, you have just watched it fold on everything else you did not know to check."
          >
            <p>
              Ask an assistant something you are certain about. Pick a fact from
              your own field where you would bet money on the answer. Let it
              reply correctly.
            </p>
            <p>
              Then say only this: <em>&ldquo;That is not right.&rdquo;</em> No
              reason, no source, no correction. See what happens next.
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
