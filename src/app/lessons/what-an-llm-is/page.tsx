import { BeatThePredictor } from "@/components/games/BeatThePredictor";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import {
  HowItAnswers,
  type AnswerExample,
} from "@/components/machines/HowItAnswers";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import {
  start as dealPredictor,
  type PredictorData,
} from "@/lib/game/predictor";
import { readGameData } from "@/lib/server/gameData";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("what-an-llm-is")!;
const video = videoFor("what-an-llm-is")!;

export const metadata = lessonMetadata(lesson);

/* Read once, server-side, and dealt server-side too, so the very first HTML
   this route sends already has round one playable: no fetch, no client
   Math.random needed before anyone can tap an option. Between deploys this
   fixes which round opens the game for everyone, every round after it, and
   every "Go again", still deals fresh client-side. */
const predictorData = readGameData<PredictorData>("predictor.json");
const initialScene = dealPredictor(
  predictorData,
  Array.from({ length: 120 }, () => Math.random()),
);

/* The infographic's three examples, straight out of the game's measured data:
   one it gets right, then two it gets wrong. */
const EXAMPLES: AnswerExample[] = ["paris", "delhi", "ottawa"].map((id) => {
  const round = predictorData.rounds.find((r) => r.id === id)!;
  return {
    prefix: round.prefix,
    options: round.options.map((o) => ({
      text: o.label ?? o.text,
      probability: o.probability,
    })),
    modelPick: round.modelPick,
    truth: round.truth,
  };
});

const SOURCES: Source[] = [
  {
    title: "DistilGPT-2",
    publisher: "Hugging Face",
    url: "https://huggingface.co/distilbert/distilgpt2",
    used: "The AI you play against, and the one in the animation. Every bar is its own measured rating of each answer.",
    licence: "Apache 2.0",
  },
  {
    title: "Wikipedia",
    publisher: "Wikimedia Foundation",
    url: "https://en.wikipedia.org/",
    used: "Every fact in the game is checked against a named Wikipedia article, linked under the round, with the revision it was checked against.",
    licence: "CC BY-SA 4.0",
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

const CHECK: CheckBeat[] = [
  {
    kind: "fill",
    prompt: "Finish the sentence the whole chapter rests on.",
    segments: [
      "Given the words so far, it produces the ",
      { blank: "likeliest" },
      " continuation. Where it has read a great deal, that is usually also the ",
      { blank: "true" },
      " one. Where it has read little, ",
      { blank: "plausible" },
      " is all that is left, and it still reads perfectly fluently.",
    ],
    options: [
      { id: "likeliest", text: "likeliest" },
      { id: "true", text: "true" },
      { id: "plausible", text: "plausible" },
      { id: "verified", text: "verified" },
      { id: "shortest", text: "shortest" },
    ],
    because:
      "Two of those words are doing all the work. Likeliest is what the machine aims for, true is what you wanted, and they come apart exactly where the training text ran thin. Nothing in the loop ever checks a claim, so there is no verified option to pick.",
  },
  {
    kind: "sort",
    prompt: "Which of these tell you an answer is true?",
    buckets: [
      {
        id: "no",
        label: "Tells you nothing about truth",
        hint: "a property of the text",
      },
      {
        id: "yes",
        label: "Actually settles it",
        hint: "a check against the world",
      },
    ],
    items: [
      { id: "fluent", text: "It reads fluently and confidently", bucket: "no" },
      {
        id: "prob",
        text: "The model put a high probability on it",
        bucket: "no",
      },
      {
        id: "detail",
        text: "It gives a precise figure and a date",
        bucket: "no",
      },
      {
        id: "again",
        text: "You asked again and got the same answer",
        bucket: "no",
      },
      {
        id: "source",
        text: "You found the claim in a named source",
        bucket: "yes",
      },
      { id: "run", text: "You ran the calculation yourself", bucket: "yes" },
    ],
    because:
      "Only the last two leave the conversation. Everything above them comes out of the same process that produced the answer, so none of it can be evidence about the answer. That includes asking twice, which just runs the same machine on nearly the same text.",
  },
  {
    kind: "choice",
    prompt:
      "Asked for India's capital, the AI put most of its vote on Mumbai. What does that tell you?",
    options: [
      "It was a one-off bug in that one question, nothing more",
      "How sure it is says nothing about whether it is right",
      "Bigger models have read enough to never do this",
    ],
    answer: 1,
    because:
      "Confidence and truth are separate things. Out of four answers it gave Mumbai 75% and New Delhi 5%: a strong preference, for the wrong one. Bigger models are wrong less often, but when they are, they sound just as sure.",
  },
];

export default function WhatAnLlmIsLesson() {
  /* The spine, and only the spine. Everything optional waits under a fold on
     the last screen, below the way into chapter two. */
  const beats: Beat[] = [
    {
      id: "game",
      cta: "How it works",
      node: (
        <div className="space-y-4">
          {/* The deck has no masthead headline of its own, so the premise on
              the first board is this page's top heading. `h1` rather than `h2`
              for that reason only: `.display-md` carries every pixel of the
              type, and `h1` to `h4` share one base rule, so the tag is the
              whole change. */}
          <h1 className="display-md">
            Can you beat an AI at{" "}
            <span className="text-pink-text">finishing a sentence</span>?
          </h1>
          <p className="text-ink-soft text-[0.9375rem] leading-snug">
            Six short chapters. Each ends with one tip for using ChatGPT better.
          </p>
          <BeatThePredictor
            initialData={predictorData}
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
          <h2 className="display-md">How it answers you, in three moves</h2>
          <HowItAnswers examples={EXAMPLES} />
        </div>
      ),
    },
  ];

  const tail = (
    <>
      <div data-section="deeper" className="space-y-4">
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
            Your text is first chopped into <strong>tokens</strong>, which are
            chunks of characters the model has memorised. Common words survive
            whole. Rarer ones shatter:{" "}
            <span className="font-data">strawberry</span> arrives as{" "}
            <span className="font-data">st</span> +{" "}
            <span className="font-data">raw</span> +{" "}
            <span className="font-data">berry</span>. The model then guesses the
            next <em>token</em>, adds it to the text, and guesses again. That
            loop is the whole operation.
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
            You watched that happen. Asked for India&rsquo;s capital, it gave
            Mumbai 75% of its vote and New Delhi 5%. Right answers and wrong
            ones come out of the same process, so they sound the same. Bigger
            models are right more often. None of them add a truth check.
          </p>
        </MechanismPanel>
        <Fold title="Watch somebody explain it" note={video.why}>
          <VideoPanel video={video} />
        </Fold>
        <Fold
          title="Go and try this on a real assistant"
          note="Five minutes, and it is the part that actually sticks."
        >
          <PracticeCard
            title="Make it invent something"
            watchFor="How confident it sounds. There is no wobble in the writing when it is making things up. The sentences are just as smooth as when it is right."
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
