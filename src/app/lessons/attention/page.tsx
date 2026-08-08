import { Beam } from "@/components/games/Beam";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { AttentionBeamsFigure } from "@/components/machines/AttentionBeamsFigure";
import { AttentionMap } from "@/components/machines/AttentionMap";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("attention")!;
const video = videoFor("attention")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Attention Is All You Need",
    publisher: "Vaswani et al. (arXiv:1706.03762, 2017)",
    url: "https://arxiv.org/abs/1706.03762",
    used: "The paper that introduced the transformer, and the definition of the attention step this page extracts.",
  },
  {
    title: "DistilGPT-2",
    publisher: "Hugging Face",
    url: "https://huggingface.co/distilbert/distilgpt2",
    used: "The model the attention weights on this page were extracted from. Six layers, twelve heads, 82 million parameters.",
    licence: "Apache 2.0",
  },
  {
    title: "Efficient Streaming Language Models with Attention Sinks",
    publisher: "Xiao, Tian, Chen, Han & Lewis (arXiv:2309.17453, 2023)",
    url: "https://arxiv.org/abs/2309.17453",
    used: "The named account of the effect you can see in the first column of every map here: a large share of attention landing on the initial token regardless of meaning.",
  },
  {
    title: "Attention in transformers, step-by-step",
    publisher: "3Blue1Brown",
    url: "https://www.youtube.com/watch?v=eMlx5fFNoYc",
    used: "The clearest visual account of the same mechanism, with the maths drawn out.",
  },
];

const STEPS: Step[] = [
  {
    say: "Embeddings gave every word a fixed position in space. But a word does not mean the same thing everywhere. Bank in a river sentence and bank in a money sentence need to end up somewhere different.",
  },
  {
    say: "Attention is how that happens. Before deciding what a word means here, every word gets to look back at every earlier word and pull in some of what they carry.",
    caption:
      "Which is why the top-right of every map is empty: nothing may look at its own future.",
  },
  {
    say: "How much it pulls from each one is a weight, and those weights are what you were guessing. They are not fixed rules. They are computed on the spot, from the sentence in front of it.",
  },
  {
    say: "And there is not one set of them. This small model runs twelve heads in every one of six layers, seventy-two in total, all at once. They plainly do not agree with each other, which is the point of having more than one.",
  },
  {
    say: "One thing to notice before you go. That heavy first column is an attention sink. A large share of nearly every head lands on the first token, for no reason to do with meaning. It is a known, named artefact, and it is a good reminder that a heat map is not a mind.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "Why is the top-right of every map empty?",
    options: [
      "Those weights exist but come out too small to be worth drawing at the scale used here",
      "The causal mask. A token is never allowed to attend to anything that comes after it",
      "The sentences are too short to fill the grid, so the corner is left blank",
    ],
    answer: 1,
    because:
      "The model is trained to predict the next token, so letting a position see its own future would let it cheat. The mask enforces that at every layer, which is also why generation runs strictly left to right.",
  },
];

export default function AttentionLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Before it decides what a word means, every word{" "}
            <span className="text-pink-text">looks back at all the others</span>
            .
          </>
        }
        sting="That is the whole invention that made modern AI work, and you can watch it happen. Every weight below was pulled out of a real model by running its published parameters forward. Each one was checked against the reference implementation before it was allowed on this page."
        cta="Watch one word do it"
        target="#looking"
      />

      {/* ------------------------------------------------ the explanation --- */}
      <section id="looking" className="py-10">
        <p className="label text-ink-faint mb-3">
          The problem attention solves
        </p>
        <h2 className="display-lg mb-4">
          A word does not mean the same thing twice.
        </h2>

        <div className="prose-measure text-ink-soft mb-8 space-y-4 text-lg">
          <p>
            The previous module gave every word a fixed position in space. That
            buys a great deal, and it cannot buy this:{" "}
            <span className="font-data">bank</span> in a sentence about a river
            and <span className="font-data">bank</span> in a sentence about
            money have to end up somewhere different, and they start out
            identical. Something has to move them apart, using nothing but the
            rest of the sentence.
          </p>
          <p>
            Attention is that something. Before settling what a word means here,
            every position gets to look back over everything earlier in the text
            and pull in a share of each one. How much it takes from each is a
            weight, and the weights are not rules anybody wrote. They are
            computed on the spot, from the sentence in front of it. That is why
            the same word can resolve two ways in two sentences with no extra
            machinery.
          </p>
          <p>
            One word, one head, five beats, and you set the pace. Then the same
            thing seventy-two times over, further down.
          </p>
        </div>

        <Walkthrough steps={STEPS} figure={<AttentionBeamsFigure />} />

        <div className="prose-measure text-ink-soft mt-8 space-y-4 text-lg">
          <p>
            Three things in that figure are worth carrying: it can only reach
            backwards, the amounts are a share of one, and a great deal of that
            share goes somewhere meaningless. All three are consequences of the
            arithmetic rather than decisions about language, which is a useful
            way to hold the whole subject.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------- the game --- */}
      <section className="border-ink/25 border-t py-10">
        <p className="label text-ink-faint mb-3">Now you try</p>
        <h2 className="display-lg mb-2">Guess where the beam goes.</h2>
        <p className="prose-measure text-ink-soft mb-6">
          You have seen one head resolve one word. Commit to a prediction on a
          head you have not seen, and the real extracted weights will tell you
          how you did.
        </p>
        <div id="game">
          <Beam />
        </div>
      </section>

      <section className="pb-4">
        <h2 className="display-lg mb-2">All seventy-two heads</h2>
        <p className="prose-measure text-ink-soft mb-5">
          Scrub through the layers and heads. What is worth noticing is not any
          single map. It is how little they resemble each other.
        </p>
        <AttentionMap />
      </section>

      <DeeperRow video={video}>
        <MechanismPanel
          question="Where do the weights come from?"
          summary="Each word produces a question and a label. The weight is how well one word's question matches another's label."
          deeper="embeddings"
        >
          <p>
            Every position turns its vector into three others: a{" "}
            <strong>query</strong> (what am I looking for?), a{" "}
            <strong>key</strong> (what am I?) and a <strong>value</strong> (what
            do I pass on?). The weight from one word to another is how strongly
            the first one&rsquo;s query lines up with the second one&rsquo;s
            key. Those weights are then squashed so each row adds up to one, and
            used to mix the values together.
          </p>
          <p>
            Everything here follows from that. The row summing to one is why a
            head with nothing to look for still has to spend its attention
            somewhere. The mask is applied before the squashing, which is why
            the future is not merely unlikely but impossible. And the three
            projections are learnt during training. Nobody assigned a head its
            job.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Is this a small model? Does that matter?"
          summary="Very. It is 82 million parameters, which is thousands of times smaller than a production model."
          deeper="what-an-llm-is"
        >
          <p>
            DistilGPT-2 was chosen so the extraction could be run honestly on a
            laptop and checked line by line. Its mechanism is exactly the one in
            a frontier model; its competence is not. Expect the heads here to
            look messier and to resolve fewer things cleanly than the tidy
            diagrams you may have seen elsewhere.
          </p>
          <p>
            That messiness is worth having. Published attention pictures are
            usually the two or three heads that came out beautifully. This is
            all of them, including the ones doing something nobody has a name
            for. That is the honest state of the art on what attention heads are
            actually for.
          </p>
        </MechanismPanel>
        <PracticeCard
          title="Write a sentence that breaks it"
          watchFor="That you can change the answer by changing only the meaning, not a single word of the structure. Nothing in the grammar tells the model which way to go, so whatever resolves it came out of the training text."
        >
          <p>
            Take the pair of sentences in the map above about the trophy and the
            suitcase. Write your own pair with the same shape, where a single
            adjective flips which noun the pronoun refers to.
          </p>
          <p>
            Then give both to an assistant and ask which thing the pronoun
            means.
          </p>
        </PracticeCard>
      </DeeperRow>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </div>
    </LessonShell>
  );
}
