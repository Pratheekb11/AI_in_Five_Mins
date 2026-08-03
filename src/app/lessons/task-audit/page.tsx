import { BucketSort } from "@/components/games/BucketSort";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { YourWeek } from "@/components/machines/YourWeek";
import { BUCKETS } from "@/lib/game/sort";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("task-audit")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Generative AI at Work",
    publisher:
      "Brynjolfsson, Li & Raymond (NBER Working Paper 31161, 2023, revised November 2023)",
    url: "https://www.nber.org/papers/w31161",
    used: "The measured result quoted throughout: across 5,179 customer support agents, access to an AI assistant raised issues resolved per hour by 14% on average, 34% for novice and low-skilled workers, with minimal impact on experienced and highly skilled ones.",
  },
  {
    title: "The Impact of AI on Developer Productivity: Evidence from GitHub Copilot",
    publisher: "Peng, Kalliamvakou, Cihon & Demirer (arXiv:2302.06590, 2023)",
    url: "https://arxiv.org/abs/2302.06590",
    used: "A controlled experiment on one narrow task — implementing an HTTP server in JavaScript — where the assisted group finished 55.8% faster.",
  },
  {
    title:
      "The Impact of Generative AI on Critical Thinking: Self-Reported Reductions in Cognitive Effort and Confidence Effects From a Survey of Knowledge Workers",
    publisher: "Lee, Sarkar, Tankelevitch, Drosos, Rintel, Banks & Wilson (CHI 2025)",
    url: "https://advait.org/files/lee_2025_ai_critical_thinking_survey.pdf",
    used: "The survey of 319 knowledge workers finding that higher confidence in the tool predicts less critical thinking, while higher confidence in yourself predicts more.",
    licence: "CC BY 4.0",
  },
  {
    title: "The Anthropic Economic Index",
    publisher: "Anthropic",
    url: "https://www.anthropic.com/economic-index",
    used: "An ongoing published measurement of which kinds of work people actually bring to an assistant, rather than which kinds they say they would.",
  },
];

const STEPS: Step[] = [
  {
    say: "The biggest field study so far watched five thousand customer support agents get an AI assistant. Productivity went up fourteen per cent on average. That average hides the whole story.",
  },
  {
    say: "Novices got thirty-four per cent faster. The experienced, highly skilled agents got almost nothing. The tool was spreading what the best people already did — and if you are already doing it, there is nothing to spread to you.",
    caption:
      "Brynjolfsson, Li & Raymond, 2023. 5,179 agents, issues resolved per hour.",
  },
  {
    say: "So the question is not whether these tools help. It is which of your tasks they help with. And that answer is personal, which is why nothing on this page marks your sorting.",
  },
  {
    say: "Four honest buckets. Hand it over and skim. Let it draft and you finish. Think out loud with it while you do the work. Or keep it entirely.",
  },
  {
    say: "The useful output of that round was not the score. It was the list of tasks you stalled on. Those are the ones you have never actually decided about — and undecided is how a bad hand-over happens.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "In the customer support study, who gained the most from the assistant?",
    options: [
      "The most experienced agents, who could use it best",
      "Novice and low-skilled agents, at 34% against 14% on average",
      "Everyone equally",
    ],
    answer: 1,
    because:
      "Experienced agents saw minimal impact. The authors' reading is that the tool spreads the practices of the strongest workers — which is worth a great deal if you are new to something, and very little where you are already the person others would copy.",
  },
  {
    prompt: "What does that suggest about where to point it in your own week?",
    options: [
      "At the work you are best at, to go even faster",
      "At competent-but-unremarkable work, and at things just outside what you know how to do",
      "At everything, uniformly",
    ],
    answer: 1,
    because:
      "The gap it closes is the gap between average and good. Where you are already excellent, there is little room; where you are a beginner, there is a great deal. That is a claim about measured averages, not about you — which is why the audit is yours to do.",
  },
  {
    prompt: "Why does a task you cannot sort in six seconds matter?",
    options: [
      "It means the task is unimportant",
      "It means you have not decided — and undecided is what gets handed over badly under time pressure",
      "It means the task is too complicated for AI",
    ],
    answer: 1,
    because:
      "A stall is information. The decision does not get easier at five to five on a Friday with a deadline moving; it just gets made worse. Settling it now, in the quiet, is the entire point of doing an audit at all.",
  },
];

export default function TaskAuditLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            In the biggest study of this so far, the experienced workers gained{" "}
            <span className="text-teal-text">almost nothing</span>.
          </>
        }
        sting="Novices got 34% faster. The average was 14%. The experts, statistically, got a rounding error — because the tool spreads what the best people already do, and they were already doing it. So the only question that matters is which of your tasks sit on the wrong side of that line."
        cta="Sort your week"
      />

      <div className="py-4">
        <BucketSort />
      </div>

      <div className="pb-4">
        <YourWeek />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} />
      </div>

      <section className="plate mb-4 p-5 md:p-6">
        <p className="label text-ink-faint mb-4">
          The four buckets, and the honest test for each
        </p>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {BUCKETS.map((bucket) => (
            <div key={bucket.id}>
              <dt className="font-display text-base font-bold">
                {bucket.label}
                <span className="text-ink-faint ml-2 text-sm font-normal">
                  {bucket.means}
                </span>
              </dt>
              <dd className="text-ink-soft mt-1 text-[0.9375rem]">
                {TESTS[bucket.id]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="Why would the experts gain so little?"
          summary="The tool raises work toward a good average. If you are already above that average, there is nothing to raise."
        >
          <p>
            Brynjolfsson and colleagues put it this way: the assistant appears
            to disseminate the best practices of the more able workers, and to
            help newer ones move down the experience curve faster. That is a
            precise description of who benefits. If your draft was already the
            one other people copied, an assistant producing a good average draft
            has nothing to offer you on that task.
          </p>
          <p>
            It also tells you where the value is hiding: not in the work you are
            proud of, but in the competent, unremarkable work you produce
            because it has to exist. And in the work that sits just outside what
            you know how to do &mdash; the language you cannot read, the format
            you have never written.
          </p>
          <p>
            One caution about generalising. That study is one job, one company,
            one tool. Peng and colleagues measured 55.8% faster on a single
            programming task, which is a spectacular number for a task that
            narrow. Neither result is a promise about your Tuesday.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Is there a downside to handing over the easy things?"
          summary="Measured, yes: the more you trust the tool, the less you check it."
          deeper="judgment-and-limits"
        >
          <p>
            Lee and colleagues surveyed 319 knowledge workers about 936
            real uses. The pattern they found is worth carrying: higher
            confidence in the AI predicted <em>less</em> critical thinking,
            while higher confidence in your own ability predicted{" "}
            <em>more</em> of it.
          </p>
          <p>
            Which is a warning about the hand-over bucket specifically. It is
            the right bucket for plenty of work &mdash; but the tasks in it are
            precisely the ones you have stopped reading carefully. The last
            module of this track is about where that line sits.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="The ones where being wrong reaches somebody outside, and where I would not have caught it because I never really read the output. It is not embarrassing to have a machine draft a status note. It is embarrassing to have sent a client a number I never checked, and it is worse to have sent something in my own voice that I did not mean. That is the line: not what it can do, but what I would still be able to stand behind afterwards."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Keep a hand-over log for one week"
          watchFor="How often the answer was 'I didn't check'. That number, not the time saved, is the honest measure of whether the hand-over was a good one."
        >
          <p>
            Every time you hand something to an assistant this week, write one
            line: the task, and whether you checked the output before it went
            anywhere.
          </p>
          <p>
            On Friday, come back and add the tasks you did yourself but wish you
            had not. That is your real map, and it will not look much like the
            one you sorted today.
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

/** One honest question per bucket, printed after the sorting is done. */
const TESTS: Record<string, string> = {
  hand: "Would I notice if this came back wrong? If the honest answer is no, this is not a hand-over — it is a hope.",
  draft:
    "Do I know what good looks like here? If yes, a first draft saves you the blank page and costs you nothing.",
  think:
    "Am I trying to produce something, or work something out? For working out, the value is being argued with — so ask it to attack your reasoning, not to agree.",
  keep: "Is this the judgement people rely on me for, or something with my name on it in a way I would have to defend? Then keep it.",
};
