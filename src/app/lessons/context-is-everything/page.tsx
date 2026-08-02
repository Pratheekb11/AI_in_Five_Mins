import { Conveyor } from "@/components/games/Conveyor";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("context-is-everything")!;
const video = videoFor("context-is-everything")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

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
    say: "Here is the part nobody tells you. The model does not remember your conversation. Every time you press send, it is handed the whole chat from the beginning and reads it fresh.",
  },
  {
    say: "That handful of text it gets is called the context. It is everything the model knows about you at that moment. Your prompt, the earlier messages, anything you attached. Nothing else exists.",
    caption:
      "Not your last conversation. Not your file that was not attached. Not the correction you made yesterday.",
  },
  {
    say: "And the context has a fixed maximum size. That is the belt you just played on. When new text arrives and there is no room, the oldest text is dropped so it fits.",
  },
  {
    say: "Nothing announces this. The reply comes back in the same confident voice as always. It is not lying to you about remembering — from where it is sitting, that message was never there.",
  },
  {
    say: "Which tells you the fix. Do not ask it to remember harder. Put the thing back in front of it. Restate the constraint, re-paste the document, start a fresh chat with a short summary you wrote yourself.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "You correct the assistant in message three. By message sixty it has gone back to the old behaviour. Why?",
    options: [
      "It decided your correction was wrong",
      "Message three has been pushed out of the context, so it is no longer part of what the model reads",
      "It only follows the most recent instruction on purpose",
    ],
    answer: 1,
    because:
      "It is not overruling you. From the model's position that correction was never said — the text it read this time started after message three. Restating the rule puts it back in front of the model, which is why repeating yourself works so well.",
  },
  {
    prompt:
      "You paste a very long report and ask a question about one paragraph in the middle. What is the risk?",
    options: [
      "The model cannot read documents at all",
      "It reads the whole thing equally well, so there is no risk",
      "Material in the middle of a long context is measurably harder for models to use than material at either end",
    ],
    answer: 2,
    because:
      "Liu and colleagues measured exactly this: accuracy is highest when the relevant passage sits at the start or the end, and drops when it sits in the middle. Quoting the paragraph you care about, rather than trusting it to find it, costs you nothing.",
  },
  {
    prompt: "What is the most reliable way to fix a chat that has gone bad?",
    options: [
      "Tell it to try harder and pay attention",
      "Start a fresh chat and paste in a short summary of what matters",
      "Keep going and hope it recovers",
    ],
    answer: 1,
    because:
      "A long, messy chat is a long, messy context — and every wrong turn in it is still being read as input. Starting again with a clean, short context is not giving up. It is the single highest-leverage habit in this whole course.",
  },
];

export default function ContextIsEverythingLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            It does not remember your conversation. It{" "}
            <span className="text-teal-text">re-reads all of it</span>, from the
            top, every single time.
          </>
        }
        sting="And what it re-reads has a fixed maximum length. Once the chat gets longer than that, the oldest part is quietly dropped — with no warning, and no note in the reply. Here is what that feels like from the inside."
        cta="Run the belt"
      />

      <div className="py-4">
        <Conveyor />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
      </div>

      {/* Both panels land after the belt has already dropped something the
          player needed — the question they are asking right now is "why". */}
      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="A fixed length of what, exactly?"
          summary="Not words, and not characters. The window is counted in tokens — the chunks a model actually reads."
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
            unusual proper nouns &mdash; so how much fits depends on what you
            put in. And an attached file is not stored anywhere: it is poured
            into the same window as the conversation, and it competes with it.
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
            sat in the middle &mdash; including for models built specifically
            for long contexts.
          </p>
          <p>
            So &ldquo;it is in the document I gave you&rdquo; is a weaker
            guarantee than it feels like. If one paragraph is what your question
            turns on, quote that paragraph. You are not being rude to the
            machine; you are moving it out of the middle.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="Because it never held on to it in the first place. Each time you send a message, it gets handed the conversation as one long piece of text and reads the whole thing again. That piece of text has a maximum length, so when the chat outgrows it, the oldest part is cut off to make room. Nothing tells you this happened. If you need something from earlier, the fix is to say it again — you are not reminding it, you are putting it back in front of it."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Make it drop something"
          watchFor="That it never says 'I have lost that'. It either answers from what is left or fills the gap with something plausible. Silence about the loss is the whole problem — you have to notice it yourself."
        >
          <p>
            Open a long chat you already have &mdash; one that has run for
            dozens of messages. Near the top, find a specific instruction or
            detail you gave it early on. Now ask about that exact detail without
            repeating it.
          </p>
          <p>
            Then start a fresh chat, paste in four lines summarising what
            matters, and ask the same question. Compare the two answers.
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
