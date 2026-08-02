import { PressureTest } from "@/components/games/PressureTest";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { CALLS } from "@/lib/game/pressure";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("where-it-breaks")!;
const video = videoFor("where-it-breaks")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

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
    used: "A vendor publishing a training data cutoff — the fixed date past which a model has seen nothing.",
  },
];

const STEPS: Step[] = [
  {
    say: "These tools fail in four ways, over and over. Once you can name them, you stop being surprised — and you start checking the right thing instead of everything.",
  },
  {
    say: "It invents. Names, citations, section numbers, settings that do not exist. Kalai and colleagues put it plainly: the training rewards a confident guess over an admission of not knowing. A model that says 'I do not know' scores worse on the tests it is graded on.",
    caption:
      "Specificity is not evidence. A fake citation has page numbers because real citations have page numbers.",
  },
  {
    say: "It goes stale. Its knowledge stops at a fixed date and it cannot tell the difference between the newest thing it saw and the newest thing there is. Anything with a price, a version or a leadership team is suspect.",
  },
  {
    say: "It caves. Push back with nothing but confidence and it will often abandon a correct answer. Sharma and colleagues found this across five leading assistants — and found that human raters sometimes prefer the agreeable answer to the right one, which is how it got there.",
  },
  {
    say: "And it cannot really do arithmetic. It produces text that looks like working out. Dziri and colleagues showed the accuracy falls off a cliff as the sums get bigger, because it is matching the shape of a calculation, not carrying one out.",
  },
  {
    say: "Four modes. You have just been graded on all four under a fuse. Whichever one you were slowest on is the one that will get you at work.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "An answer arrives with an author, a year and a page range. What does that specificity tell you?",
    options: [
      "That it came from a real source — it is too detailed to be invented",
      "Nothing about whether it is true. That shape is exactly what an invented citation looks like",
      "That it is probably right but the page number may be off",
    ],
    answer: 1,
    because:
      "Detail is a property of the text, not evidence about the world. A citation-shaped string is easy to produce; a citation that exists is not. The only thing that settles it is looking the reference up.",
  },
  {
    prompt:
      "You tell it 'that's wrong' with no reason, and it immediately agrees and changes the answer. What just happened?",
    options: [
      "It re-checked its work and found the error",
      "It matched your confidence — a documented behaviour called sycophancy",
      "The first answer was definitely wrong",
    ],
    answer: 1,
    because:
      "Nothing was re-checked; there is no separate place to check against. Sharma and colleagues measured this across five leading assistants. It follows that agreement after a push is worth nothing — which is why you should push back on answers you believe as well as ones you doubt.",
  },
  {
    prompt: "Which of these should you trust the least, all else being equal?",
    options: [
      "A confident explanation of a well-known concept",
      "A specific figure about a price, version or ranking",
      "An answer that says it is not sure",
    ],
    answer: 1,
    because:
      "Anything that changes over time was true on a date you cannot see, and is being stated as if it were true today. Meanwhile the answer that admits uncertainty is the rarest and most useful thing on the list — the training pressure runs against producing it.",
  },
];

export default function WhereItBreaksLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            It fails in{" "}
            <span className="text-pink-text">exactly four ways</span>. You have
            probably only ever noticed one of them.
          </>
        }
        sting="Invented, stale, caved, bad sum. Given a minute each, most people can spot any of them. You are not getting a minute — the fuse starts at six seconds and gets shorter. What you miss under pressure is what you miss at work."
        cta="Light the fuse"
      />

      <div className="py-4">
        <PressureTest />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
      </div>

      {/* The named list arrives after the round, not before it. Reading the
          four modes first would have made the game a lookup exercise. */}
      <section className="plate mb-4 p-5 md:p-6">
        <p className="label text-ink-faint mb-4">
          The four modes, and the one honest outcome
        </p>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {CALLS.map((option) => (
            <div key={option.id}>
              <dt className="font-display text-base font-bold">
                {option.name}
                <span className="text-ink-faint ml-2 text-sm font-normal">
                  {option.hint}
                </span>
              </dt>
              <dd className="text-ink-soft mt-1 text-[0.9375rem]">
                {TELLS[option.id]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="space-y-4 pb-4">
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
            way. Models are optimised to do well on benchmarks, and benchmarks
            score a wrong answer and an &ldquo;I do not know&rdquo; identically:
            zero. Under that scoring, guessing is strictly better than
            abstaining. The confident wrong answer is not a bug in the training
            &mdash; it is what the training asked for.
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
            held on small cases and fell away sharply as the problems grew. Their
            conclusion: the models reduce multi-step reasoning to matching
            patterns of previously seen working, rather than carrying out the
            procedure.
          </p>
          <p>
            Which is why the fix is not a better prompt. It is a calculator. Ask
            for the numbers to be computed with a tool, or paste them into a
            spreadsheet yourself &mdash; the next module is about what changes
            when the model can actually run one.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="Pick the claim that would cost me the most if it were wrong, and check that one thing at its source. If it is a citation or a reference, look it up. If it is a price, a version or a ranking, assume it is out of date and check the vendor's own page. If it is a sum, redo it in a calculator. And if I pushed back and it instantly agreed with me, I have learnt nothing — I have to check it the same way I would have anyway."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Push back on an answer you know is right"
          watchFor="Whether it holds. If it folds on something you know to be true, you have just watched it fold on everything else you did not know to check."
        >
          <p>
            Ask an assistant something you are certain about &mdash; a fact from
            your own field where you would bet money on the answer. Let it
            reply correctly.
          </p>
          <p>
            Then say only this: <em>&ldquo;That&rsquo;s not right.&rdquo;</em>{" "}
            No reason, no source, no correction. See what happens next.
          </p>
        </PracticeCard>
      </div>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </div>
    </LessonShell>
  );
}

/** What each call means in practice, printed once the round has been played. */
const TELLS: Record<string, string> = {
  sound: "Right, or honestly unsure. The hedge is not the failure — hedging about the right thing is the correct answer, and it is the one people rate lowest.",
  invented:
    "A specific that was never true: a citation, a section number, a setting, a claim to have checked something. It arrives fully formed because the form is what it learnt.",
  stale:
    "True on some date before training stopped, stated as if it were true today. Watch for prices, versions, rankings, and the words 'still' and 'latest'.",
  sycophantic:
    "It changed its answer because you pushed, not because you gave it anything. Documented across five leading assistants, and traced back to human raters preferring agreement.",
  arithmetic:
    "The prose is immaculate and the number is wrong. Text that looks like working out is not working out.",
};
