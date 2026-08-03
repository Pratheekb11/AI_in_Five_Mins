import { BeatThePredictor } from "@/components/games/BeatThePredictor";
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

const lesson = getLesson("what-an-llm-is")!;
const video = videoFor("what-an-llm-is")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "DistilGPT-2",
    publisher: "Hugging Face",
    url: "https://huggingface.co/distilbert/distilgpt2",
    used: "The machine you play against. Every percentage on the board is its own output for that sentence, measured and printed unrounded.",
    licence: "Apache 2.0",
  },
  {
    title: "Alice's Adventures in Wonderland",
    publisher: "Lewis Carroll, via Project Gutenberg",
    url: "https://www.gutenberg.org/ebooks/11",
    used: "Act two. The right answer in those rounds is simply the word Carroll wrote, so the machine can be scored against something it cannot argue with.",
    licence: "Public domain",
  },
  {
    title: "Paris",
    publisher: "Encyclopædia Britannica",
    url: "https://www.britannica.com/place/Paris",
    used: "One of the checkable facts in act three, where the likeliest continuation and the true one come apart.",
  },
  {
    title: "Jupiter",
    publisher: "NASA Science",
    url: "https://science.nasa.gov/jupiter/",
    used: "Another act three fact. The model puts the right answer eighth in its own ranking.",
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
    say: "You just played a real one. In act one it beat you, and it should have. Ordinary sentences are exactly what a next-word guesser is for, and it was ninety-seven per cent sure of some of them.",
    caption:
      "Nothing was rigged in its favour there. Those are its own odds on its own strongest ground.",
  },
  {
    say: "Then act two, and it fell apart. Same machine, same confidence, but the right answer was a specific word a specific author chose — and it does not know the story. It knows what usually follows.",
  },
  {
    say: "Act three is the one worth remembering. Asked where Paris is the capital of, it put thirty per cent on the word 'the' and under two per cent on France. It is not lying and it is not broken. It is finishing a sentence, and the shape of the sentence beat the fact.",
    caption:
      "Watch that it never sounds any less sure when it is wrong. That is the part that costs people money.",
  },
  {
    say: "Now scale it up. Thousands of words of context, more text than a person could read in a thousand lifetimes. The guessing gets good enough to look like knowing — and the failure mode does not change, it just gets harder to spot.",
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
    prompt: "In act three the machine was confident and wrong. What does that tell you?",
    options: [
      "It was a bug in that particular question",
      "Confidence measures how concentrated its guesses are, not whether they are true",
      "Bigger models do not do this",
    ],
    answer: 1,
    because:
      "The two are separate quantities. It was 30% sure of 'the' after 'Paris is the capital of' — a high number, and a wrong answer. That gap does not close as models get bigger; it gets harder to spot, because a bigger model is wrong more fluently.",
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
      <Hook
        claim={
          <>
            You are about to lose to something that has{" "}
            <span className="text-pink-text">never understood a word</span> in
            its life.
          </>
        }
        sting="Nine rounds, head to head against a real language model. It will beat you at ordinary sentences, because guessing what usually comes next is the whole of what it is. Stay for act three, where the likeliest answer and the true one come apart."
        cta="Take it on"
      />

      <div className="py-4" id="game">
        <BeatThePredictor />
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
            You watched that happen. It was 99% sure of the word after
            &ldquo;God created the heaven and the&rdquo; and 30% sure of the
            word after &ldquo;Paris is the capital of&rdquo; &mdash; and the
            second one was wrong. Both numbers came from the same place:
            counting what follows what, over an enormous amount of text. Scale
            changes how often it is right. It does not add a truth check,
            because there isn&rsquo;t one to add.
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
