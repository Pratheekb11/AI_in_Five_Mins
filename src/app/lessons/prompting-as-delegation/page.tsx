import { ShowDontAsk } from "@/components/games/ShowDontAsk";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { PhrasingFigure } from "@/components/machines/PhrasingFigure";
import { PromptInspector } from "@/components/machines/PromptInspector";
import type { CheckBeat } from "@/lib/check";
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
    say: "Stop thinking of it as a search box. Think of it as a sharp new colleague on their first morning. They have read enormously widely. They know nothing at all about you, your job, or what good looks like here. Start with the plainest possible version of the ask.",
    caption:
      "Watch the rows below rather than waiting for a new picture. Each step measures one more way of asking for the very same thing.",
  },
  {
    say: "Now the one almost everybody believes in. Tell it that it is an expert. Give it a role to play. Watch what that does to the odds of getting the answer you wanted.",
    caption:
      "Nothing. It is not harmful, and it is not doing any work either. Across all fourteen goals, role-play measured slightly worse than saying nothing at all.",
  },
  {
    say: "Next, actually instruct it. Say how you want the answer to come back. This one does move the number, which is worth knowing, but look at how far it moves it.",
  },
  {
    say: "Now stop describing what you want and show it instead. One worked example of the shape you are after, and then your real question. That is the whole trick, and the bar has to be rescaled to fit it.",
  },
  {
    say: "Five things do the work when you brief somebody. Who they are, what you want done, the limits, the shape the answer should arrive in, and one example of good. The example is the one people leave out, and it is the one that is doing the lifting.",
    caption:
      "Read your prompt back and ask: if I sent only this to a competent stranger, would they produce what I actually want? If not, you already know which part is missing.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "flag",
    prompt:
      "Here is a request as most people write it. Tap the parts that a competent stranger could not act on.",
    instruction: "Four of these eleven pieces are unusable. Tap those four.",
    parts: [
      { text: "Write a" },
      { text: "short", wrong: true },
      { text: "summary of the attached report" },
      { text: "for the board meeting" },
      { text: "on Thursday." },
      { text: "Make it" },
      { text: "professional", wrong: true },
      { text: "and" },
      { text: "punchy", wrong: true },
      { text: "and get it to me" },
      { text: "soon", wrong: true },
    ],
    because:
      "Short, professional, punchy and soon are the four words carrying your standards, and none of them survives leaving your head. Everything else in the request is checkable by someone who has never met you. Replace those four with a number, a shape and a deadline. Under 100 words, five bullets, no adjectives, by 2pm. Now the same request is something a stranger could deliver.",
  },
  {
    kind: "choice",
    prompt:
      "Which of these is the fastest way to tell whether a prompt is good enough?",
    options: [
      "Count how polite the request is, since politeness earns a better reply",
      "Check that it uses enough technical terms for the model to take the request seriously",
      "Ask whether a competent stranger, given only this, would produce what you want",
    ],
    answer: 2,
    because:
      "That single question catches almost everything: unstated audience, unstated length, unstated format, unstated standard of good. It works because the model really is a stranger. Everything that is obvious to you about this job is invisible to it.",
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
        sting="Not the bit you would guess, either. Across fourteen goals, telling it how to answer moved the odds by 1.65 times. Telling it that it is an expert moved them by 1.02, which is to say not at all. Showing it one worked example moved them by 125, and won every single goal. Five phrasings of the same request, and you pick the one that lands."
        cta="Take the first one"
      />

      <div className="py-4">
        <ShowDontAsk />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} figure={<PhrasingFigure />} />
        <VideoPanel video={video} />
      </div>

      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="Does the politeness actually cost me anything?"
          summary="It costs tokens and instructs nobody. That is the honest answer. The game charges you for it so that you have to read it."
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
            mechanism. Brown and colleagues named it few-shot learning and
            measured it in 2020, and nothing is being retrained when it
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
          comprehension. It shows you what it matched on, so that you can
          overrule it. Judging the evidence yourself is the point.
        </p>
        <PromptInspector />
      </section>


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
        <Check slug={lesson.slug} beats={CHECK} />
      </div>
    </LessonShell>
  );
}
