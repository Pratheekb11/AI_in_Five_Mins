import { BeatThePredictor } from "@/components/games/BeatThePredictor";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { NextTokenFigure } from "@/components/machines/NextTokenFigure";
import type { CheckBeat } from "@/lib/check";
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
    used: "The machine you play against, and the model behind the figure in the walkthrough. Every percentage on both is its own output for that sentence, measured and printed unrounded.",
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
    caption:
      "Below is a real sentence, cut into the chunks the model actually reads, with the empty slot it has to fill. Watch that figure rather than replacing it. Every step from here changes it.",
  },
  {
    say: "Now the scores arrive. Give it the opening of Genesis and almost the whole weight lands on one word. This is the ground a next-word guesser is built for, and it is why it beat you in act one.",
    caption:
      "Nothing was rigged in its favour there. Those are its own odds on its own strongest ground.",
  },
  {
    say: "Same machine, different sentence. You know what follows 'Once upon a'. The model's best guess is worth about seven per cent, and the rest is spread thin. Being obvious to a person and being likely to a model are different things.",
    caption:
      "That is act two in one picture. The confidence did not drop, only the odds did, and you cannot hear odds in a sentence.",
  },
  {
    say: "Act three is the one worth remembering. Asked to finish 'Paris is the capital of', it puts thirty per cent on the word 'the' and under two per cent on France. It is not lying and it is not broken. It is finishing a sentence, and the shape of the sentence beat the fact.",
    caption:
      "The true answer is marked in the figure. Notice that it never sounds any less sure when it is wrong. That is the part that costs people money.",
  },
  {
    say: "Then one of them is drawn, added to the text, and the whole thing runs again. Temperature is the only dial in that loop, and it does not know anything. Now scale it up to more text than a person could read in a thousand lifetimes. The guessing gets good enough to look like knowing, and the failure does not go away. It just gets harder to spot.",
    caption:
      "Drag the dial and draw a few. Nothing in the loop ever checks a claim, at any setting.",
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
      "In act three the machine was confident and wrong. What does that tell you?",
    options: [
      "It was a bug in that particular question, and it would not happen on a different one",
      "Confidence measures how concentrated its guesses are, not whether they are true",
      "Bigger models do not do this, because they have seen enough text to know better",
    ],
    answer: 1,
    because:
      "Confidence and truth are separate things. It was 30% sure of 'the' after 'Paris is the capital of': a high number, and a wrong answer. That gap does not close as models get bigger. It gets harder to spot, because a bigger model is wrong more fluently.",
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
        sting="Nine rounds, head to head against a real language model. It will beat you at ordinary sentences, because guessing what comes next is all it does. Stay for act three, where the likeliest answer and the true one come apart."
        cta="Take it on"
      />

      <div className="py-4" id="game">
        <BeatThePredictor />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<NextTokenFigure />} />
      </div>

      {/* The mechanism arrives here, straight after watching a guesser be
          confidently wrong, not in a chapter they have to get through first. */}
      <DeeperRow video={video}>
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
            You watched that happen. It was 99% sure of the word after
            &ldquo;God created the heaven and the&rdquo;, and 30% sure of the
            word after &ldquo;Paris is the capital of&rdquo;. The second one was
            wrong. Both numbers came from the same place: counting what follows
            what, across an enormous amount of text. Scale changes how often it
            is right. It does not add a truth check, because there is not one to
            add.
          </p>
        </MechanismPanel>
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
      </DeeperRow>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Check slug={lesson.slug} beats={CHECK} />
      </div>
    </LessonShell>
  );
}
