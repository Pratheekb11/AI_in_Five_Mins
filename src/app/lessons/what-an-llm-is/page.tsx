import { NextWord } from "@/components/games/NextWord";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { getLesson } from "@/lib/lessons";
import { NEXT_WORD } from "@/lib/nextWord";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("what-an-llm-is")!;
const video = videoFor("what-an-llm-is")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Alice's Adventures in Wonderland",
    publisher: "Lewis Carroll, via Project Gutenberg",
    url: "https://www.gutenberg.org/ebooks/11",
    used: `The ${NEXT_WORD.model.trainedOnWords.toLocaleString()} words the guessing machine in the game was counted from.`,
    licence: "Public domain",
  },
  {
    title: "Why Large Language Models Hallucinate",
    publisher: "IBM Technology",
    url: "https://www.youtube.com/watch?v=cfqtFvWOfg0",
    used: "Background on why fluent text and true text are not the same thing.",
  },
  {
    title: "On the Dangers of Stochastic Parrots",
    publisher: "Bender, Gebru, McMillan-Major & Shmitchell (FAccT 2021)",
    url: "https://dl.acm.org/doi/10.1145/3442188.3445922",
    used: "The argument that fluency in these systems does not imply understanding.",
  },
];

const STEPS: Step[] = [
  {
    say: "A large language model does one thing. It looks at the text so far and guesses what comes next. Then it adds that guess to the text and guesses again.",
  },
  {
    say: "You just played against a machine doing exactly that. It only knew which word usually followed which, across one book. It still got some right.",
    caption: `The opponent knew ${NEXT_WORD.model.vocabulary.toLocaleString()} distinct words and nothing about what any of them mean.`,
  },
  {
    say: "Now scale that up. Thousands of words of context instead of one. More text than a person could read in a thousand lifetimes. The guessing gets good enough to look like knowing.",
  },
  {
    say: "But it is still guessing what sounds right. It is not looking anything up. That single fact explains almost every strange thing these tools do.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "When you ask an AI a factual question, what is it doing?",
    options: [
      "Searching a database of facts for the answer",
      "Producing text that sounds like a plausible answer",
      "Asking another computer that knows the answer",
    ],
    answer: 1,
    because:
      "Unless it has been given a search tool, there is no lookup happening. It is continuing your text with something that fits the pattern of a correct answer — which is usually, but not always, a correct answer.",
  },
  {
    prompt: "The machine in the game said a word and was confident. Was it right?",
    options: [
      "Always — confidence means correctness",
      "Sometimes. Its confidence came from counting, not from knowing",
      "Never — simple models are always wrong",
    ],
    answer: 1,
    because:
      "That gap between how sure it sounds and how right it is does not close as models get bigger. It just gets harder to spot, because a bigger model is wrong more fluently.",
  },
  {
    prompt: "Why does it invent details about obscure topics in particular?",
    options: [
      "It is programmed to fill gaps with guesses",
      "It saw little text on that topic, so the most plausible continuation is a pattern rather than a fact",
      "It confuses the topic with a similar one",
    ],
    answer: 1,
    because:
      "It always produces the most plausible continuation. Where it has seen a lot, plausible and true line up. Where it has seen little, plausible is all that is left — and plausible still reads perfectly fluently.",
  },
];

export default function WhatAnLlmIsLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <div className="pb-4">
        <NextWord />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
      </div>

      {/* The mechanism arrives here, straight after watching a guesser be
          confidently wrong — not in a chapter they have to get through first. */}
      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="If it is guessing, what is it guessing about?"
          summary="Not words. It works in chunks of characters called tokens, and it picks one at a time."
          deeper="tokens"
        >
          <p>
            The machine you played against guessed whole words, because a book
            has whole words in it. A real model does not see words at all.
          </p>
          <p>
            Your text is first chopped into <strong>tokens</strong> &mdash;
            chunks of characters the model has memorised. Common words survive
            whole. Rarer ones shatter: <span className="font-data">strawberry</span>{" "}
            arrives as <span className="font-data">st</span> +{" "}
            <span className="font-data">raw</span> +{" "}
            <span className="font-data">berry</span>. The model then guesses the
            next <em>token</em>, adds it to the text, and guesses again. That
            loop is the entire operation.
          </p>
          <p>
            This is also why these tools are strangely bad at counting the
            letters in a word. The letters were never separate things it saw.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Why is it so confident when it is wrong?"
          summary="Nothing inside it measures truth. It only ever ranks what sounds likely to come next."
          deeper="how-llms-answer"
        >
          <p>
            At every step the model produces a score for every possible next
            token, and picks from the top. Notice what is missing from that
            description: any check against the world.
          </p>
          <p>
            The machine in the game was {Math.round(
              NEXT_WORD.rounds[0].modelConfidence * 100,
            )}
            % sure of its first answer for exactly the same reason &mdash;
            confidence came from counting, not from knowing. Scale changes how
            often it is right. It does not add a truth check, because there
            isn&rsquo;t one to add.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="Because it is not looking anything up. It is writing whatever sounds most like a right answer, based on all the text it has read. When it has read a lot about something, sounding right and being right are the same thing. When it has not, it still writes something that sounds right — and there is nothing inside it that notices the difference."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Make it invent something"
          watchFor="How confident it sounds. There is no wobble in the writing when it is making things up — the sentences are just as smooth as when it is right."
        >
          <p>
            Ask any AI assistant a detailed question about something genuinely
            obscure and local. The history of a small street near you. A
            specific dish from your grandmother&rsquo;s region. A minor local
            election result from years ago.
          </p>
          <p>
            Then check one specific detail it gave you against a real source.
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
