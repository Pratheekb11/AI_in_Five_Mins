import { ShowDontAsk } from "@/components/games/ShowDontAsk";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { PromptInspector } from "@/components/machines/PromptInspector";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { ENCODING_NAME } from "@/lib/tokenizer";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("prompting-as-delegation")!;
const video = videoFor("prompting-as-delegation")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Prompt Engineering Overview",
    publisher: "Elvis Saravia",
    url: "https://www.youtube.com/watch?v=dOxUroR57xs",
    used: "A tour of the named techniques, for anyone who wants more than the five parts.",
  },
  {
    title: "Language Models are Few-Shot Learners",
    publisher: "Brown et al. (arXiv:2005.14165, 2020)",
    url: "https://arxiv.org/abs/2005.14165",
    used: "The measured result that examples placed in the prompt itself change what a model produces, with no retraining.",
  },
  {
    title:
      "Principled Instructions Are All You Need for Questioning LLaMA-1/2, GPT-3.5/4",
    publisher: "Bsharat, Myrzakhan & Shen (arXiv:2312.16171, 2023)",
    url: "https://arxiv.org/abs/2312.16171",
    used: "A tested set of instruction principles, including the finding that stated audience, explicit format and worked examples move output quality.",
  },
  {
    title: "Prompt engineering overview",
    publisher: "Anthropic developer documentation",
    url: "https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview",
    used: "A vendor's own guidance, which lands on much the same short list of parts.",
  },
  {
    title: "gpt-tokenizer",
    publisher: "npm package, o200k_base encoding",
    url: "https://www.npmjs.com/package/gpt-tokenizer",
    used: `Counting the real ${ENCODING_NAME} tokens in the prompt you assemble, and in anything you paste into the inspector.`,
    licence: "MIT",
  },
];

const STEPS: Step[] = [
  {
    say: "Stop thinking of it as a search box. Think of it as a sharp new colleague on their first morning. They have read enormously widely. They know nothing at all about you, your job, or what good looks like here.",
  },
  {
    say: "So write what you would have to write if you were handing the job to that person and then leaving the building. Not a question. A brief.",
  },
  {
    say: "Five things do the work. Who they are. What you want done. The limits. The shape the answer should arrive in. And one example of good.",
    caption:
      "Role · Goal · Constraints · Format · Example. You rarely need all five — you need to know which one you left out.",
  },
  {
    say: "Everything else you typed is manners. Please, thanks, urgent, you're brilliant. None of it is harmful and none of it is doing any work — the role-play phrasing measured slightly worse than saying nothing at all.",
  },
  {
    say: "Here is the test that replaces all of this advice. Read your prompt back and ask: if I sent only this to a competent stranger, would they produce what I actually want? If the answer is no, you already know which part is missing.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "You ask for 'a short summary' and get four dense paragraphs. Which part was missing?",
    options: [
      "The goal — nothing in the request told it that a summary was what you were after",
      "Constraints and format — 'short' is your idea of short, not a stated limit",
      "The role — it was never told to act as a summariser, so it answered as a generalist",
    ],
    answer: 1,
    because:
      "The goal was perfectly clear. 'Short' is the problem: it means nothing until you attach a number and a shape. 'Under 100 words, as five bullets' cannot be misread. Vague adjectives are where most disappointing output comes from.",
  },
  {
    prompt: "Why does pasting in one example of a good answer work so well?",
    options: [
      "It retrains the model on your preference, so the next reply is fitted to your taste",
      "It gives the model a concrete pattern to continue, in the same input it is already reading",
      "It signals that the task matters, which makes the model apply more effort to it",
    ],
    answer: 1,
    because:
      "Nothing is retrained — the example sits in the context, and the model continues the pattern it can see. Brown and colleagues measured this effect directly. It is also why one real example beats three paragraphs describing what you want.",
  },
  {
    prompt:
      "Which of these is the fastest way to tell whether a prompt is good enough?",
    options: [
      "Count how polite the request is, since politeness earns a better reply",
      "Check that it uses enough technical terms for the model to take the request seriously",
      "Ask whether a competent stranger, given only this, would produce what you want",
    ],
    answer: 2,
    because:
      "That single question catches almost everything: unstated audience, unstated length, unstated format, unstated standard of good. It works because the model genuinely is a stranger — everything obvious to you about this job is invisible to it.",
  },
];

export default function PromptingAsDelegationLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Most of what you type into it{" "}
            <span className="text-yellow-text">does no work at all</span>.
          </>
        }
        sting="Not the bit you would guess, either. Across fourteen goals, telling it how to answer moved the odds by 1.65 times and telling it that it is an expert by 1.02 — which is to say, not at all. Showing it one worked example moved them by 125, and won every single goal. Five phrasings of the same request, and you pick the one that actually lands."
        cta="Take the first one"
      />

      <div className="py-4">
        <ShowDontAsk />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
      </div>

      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="Does the politeness actually cost me anything?"
          summary="It costs tokens and instructs nobody. That is the honest answer — the game charges you for it to force you to read."
          deeper="tokens"
        >
          <p>
            Every word you send is cut into <strong>tokens</strong> and takes up
            room in the context window, which has a hard limit. So filler has a
            real price, and you can watch it: the sheet under the game counts
            your assembled prompt with the same{" "}
            <span className="font-data">{ENCODING_NAME}</span> tokenizer a real
            model uses.
          </p>
          <p>
            But be clear about the size of that price. On a short prompt it is
            trivial, and there is no evidence that being courteous makes answers
            worse. The reason the game penalises filler is not that
            &ldquo;please&rdquo; is dangerous. It is that people type a hundred
            words of throat-clearing, feel like they have written a lot, and
            never notice that they never said how long the answer should be.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Why does an example beat describing what I want?"
          summary="The model is continuing a pattern it can see. An example is the pattern; an adjective is a hope."
          deeper="how-llms-answer"
        >
          <p>
            The model produces text that plausibly continues its input. If its
            input contains a worked example of the thing you want, the most
            plausible continuation is another one of those. That is the whole
            mechanism &mdash; Brown and colleagues named it few-shot learning
            and measured it in 2020, and nothing is being retrained when it
            happens.
          </p>
          <p>
            Which explains a habit worth building: keep the two or three best
            outputs you ever got and paste one in next time. &ldquo;Punchy but
            not salesy&rdquo; means whatever the model already thought it meant.
            A paragraph you actually approved of does not.
          </p>
        </MechanismPanel>
      </div>

      <section className="pb-4">
        <h2 className="display-lg mb-2">Now check one of your own</h2>
        <p className="prose-measure text-ink-soft mb-5">
          Paste in a prompt you have really sent. This is a keyword check, not
          comprehension &mdash; it shows you what it matched on so you can
          overrule it. Judging the evidence yourself is the point.
        </p>
        <PromptInspector />
      </section>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="Ask it the way you would ask a capable person who has just joined and knows nothing about your world. Say who they should be, what you want done, what the limits are, what shape the answer should come in, and show one example of a good one. Then read it back and ask whether a stranger given only that would produce what you want. If not, you have found the missing part — and it is almost never the politeness."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Send the bad one first, on purpose"
          watchFor="How much of the gap between the two answers came from adding an example, rather than from adding more description. That ratio surprises most people."
        >
          <p>
            Take a real task from this week. Ask for it in one lazy line, the
            way you normally would, and keep the answer.
          </p>
          <p>
            Now, in a fresh chat, write the same request as a brief: role, goal,
            constraints, format, and one example of good. Put the two answers
            side by side.
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
