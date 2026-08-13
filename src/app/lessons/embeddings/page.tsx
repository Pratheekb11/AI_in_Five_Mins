import { WordMagnet } from "@/components/games/WordMagnet";
import { Hook } from "@/components/lesson/Hook";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { AnalogyBench } from "@/components/machines/AnalogyBench";
import { AnalogyPlane } from "@/components/machines/AnalogyPlane";
import { VectorStripFigure } from "@/components/machines/VectorStripFigure";
import { WordChart } from "@/components/machines/WordChart";
import { ANALOGY, analogy } from "@/lib/analogy";
import { getLesson } from "@/lib/lessons";
import { ordinal } from "@/lib/ordinal";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("embeddings")!;
const video = videoFor("embeddings")!;

/* Quoted in the prose below, so that regenerating the vectors updates the
   sentences rather than leaving them asserting an old number. */
const royal = analogy("royal");
const comparative = analogy("comparative");
const royalAnswerPoint = royal.points.find(
  (p) => p.word === royal.answer.word,
)!;

export const metadata = lessonMetadata(lesson);

const SOURCES: Source[] = [
  {
    title: "GloVe: Global Vectors for Word Representation",
    publisher: "Pennington, Socher & Manning (EMNLP 2014)",
    url: "https://aclanthology.org/D14-1162/",
    used: "The method behind every vector on this page, and the account of why counting co-occurrence produces directions that mean something.",
  },
  {
    title: "GloVe pre-trained word vectors",
    publisher: "Stanford NLP",
    url: "https://nlp.stanford.edu/projects/glove/",
    used: "The 6B 50-dimensional vectors themselves, trained on Wikipedia 2014 and Gigaword 5. Every similarity in the game and the benches is computed from these.",
    licence: "Public Domain Dedication and Licence v1.0",
  },
  {
    title: "Efficient Estimation of Word Representations in Vector Space",
    publisher: "Mikolov, Chen, Corrado & Dean (arXiv:1301.3781, 2013)",
    url: "https://arxiv.org/abs/1301.3781",
    used: "Where the word-arithmetic result came from, a year before GloVe.",
  },
  {
    title:
      "Man is to Computer Programmer as Woman is to Homemaker? Debiasing Word Embeddings",
    publisher:
      "Bolukbasi, Chang, Zou, Saligrama & Kalai (arXiv:1607.06520, 2016)",
    url: "https://arxiv.org/abs/1607.06520",
    used: "The measurement that the same arithmetic reproduces the stereotypes present in the training text.",
  },
  {
    title: "Transformers, the tech behind LLMs",
    publisher: "3Blue1Brown",
    url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
    used: "Opens on the same idea, words as directions in space, and then keeps going.",
  },
];

const STEPS: Step[] = [
  {
    say: "A model cannot do arithmetic on the word cat. So before anything else happens, every word is turned into a list of numbers. Here is that list, fifty of them, drawn as fifty little bars. Nobody chose what any of them mean.",
  },
  {
    say: "Now put dog underneath it. The two patterns rhyme, and nothing arranged that. It came out of counting which words turn up near which other words, across six billion words of text.",
    caption:
      "GloVe, trained on Wikipedia and newswire. The values in the strips are the real published ones.",
  },
  {
    say: "Now table, which rhymes with neither. The two numbers underneath are the measured angles between those lists. The pull you were fighting in the box was not a metaphor, it was that number.",
  },
  {
    say: "Which gives the strangest result in this whole subject. Because directions carry meaning, you can add and subtract the strips themselves. King, minus man, plus woman.",
  },
  {
    say: "Try it below on any words you like. And watch how often it does not work. The bench prints the real numbers, including the unimpressive ones, because a demonstration you can only run on four famous examples is not a demonstration.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "The same arithmetic gives stereotyped answers on some inputs. Why?",
    options: [
      "A bug in the way the vectors are quantised and stored, which distorts the rarer directions in the space",
      "The vectors were built by counting real human text, so associations present in that text are present in the geometry",
      "Because the vocabulary is too small to hold the words that would give a fairer answer",
    ],
    answer: 1,
    because:
      "Bolukbasi and colleagues measured this in 2016. It is not a defect of the method; it is the method working as designed on the text it was given. The same property that makes 'king − man + woman' land near 'queen' also carries every other association in the corpus.",
  },
];

export default function EmbeddingsLesson() {
  const beats: Beat[] = [
    {
      id: "hook",
      selfAdvance: true,
      node: (
        <Hook
          claim={
            <>
              Every word the machine reads is{" "}
              <span className="text-blue-text">a point in space</span>. Meaning
              is which points sit near which.
            </>
          }
          sting="Fifty numbers per word, and nobody decided what any of them stand for. They fell out of counting which words turn up near which, across six billion words of text. In the box below, the pull between two words is that real measurement, not a story about it."
          cta="Open the space"
          target="#space"
        />
      ),
    },
    {
      id: "analogy-plane",
      cta: "Watch the arrow",
      node: (
        <section id="space" className="py-4 sm:py-10">
          <p className="label text-ink-faint mb-3">What a vector buys you</p>
          <h2 className="display-lg mb-4">
            If meaning is a direction, you can do arithmetic with it.
          </h2>

          <div className="prose-measure text-ink-soft space-y-4 text-base sm:text-lg">
            <p>
              Give every word a list of {ANALOGY.dims} numbers and you have
              given every word a position. Positions on their own would only buy
              you similarity: near means alike, far means unalike. What makes
              this idea powerful is the thing positions have that labels do not:
              the space <em>between</em> them.
            </p>
            <p>
              Subtract one word&rsquo;s position from another&rsquo;s and you
              get a direction: not a word, but a displacement, a &ldquo;whatever
              it is that turns this into that&rdquo;. The startling result is
              that those displacements are reusable. Mikolov and colleagues
              found it in 2013, and you can reproduce it here on vectors anyone
              can download. The step from <span className="font-data">man</span>{" "}
              to <span className="font-data">king</span> is very nearly the same
              step as the one from <span className="font-data">woman</span> to{" "}
              <span className="font-data">queen</span>, even though nothing in
              the training ever compared those two pairs.
            </p>
          </div>
        </section>
      ),
    },
    {
      /* The figure gets the screen to itself. It used to sit between six
         paragraphs, which on a phone put the arrow two scrolls below the
         sentence that promised it. */
      id: "analogy-figure",
      cta: "What it leaves out",
      node: (
        <>
          <p className="prose-measure text-ink-soft mb-4 text-base sm:text-lg">
            Watch it happen. The figure draws one arrow, picks it up, and puts
            it down somewhere else.
          </p>
          <AnalogyPlane />
        </>
      ),
    },
    {
      id: "analogy-caveats",
      cta: "Now you try",
      node: (
        <>
          <h2 className="display-md mb-4">
            Two things this demonstration usually leaves out
          </h2>
          <div className="prose-measure text-ink-soft space-y-4 text-base sm:text-lg">
            <p>Both are worth more than the trick itself.</p>
            <p>
              <strong>The arrow does not land on the word.</strong> It lands
              near it. <span className="font-data">{royal.answer.word}</span> is
              the closest of {ANALOGY.vocabulary.toLocaleString("en-US")} words
              to where the arithmetic points, at a cosine of{" "}
              {royal.answer.similarity.toFixed(3)}. But it also sits{" "}
              {royalAnswerPoint.offPlane.toFixed(2)} units off the plane the
              picture is drawn on. Every published version of this diagram is a
              shadow of something {ANALOGY.dims}-dimensional, and the number,
              not the picture, is the claim.
            </p>
            <p>
              <strong>The inputs have to be excluded by hand.</strong> Ask for
              the nearest word to{" "}
              <span className="font-data">king &minus; man + woman</span>{" "}
              without ruling anything out and the answer is{" "}
              <span className="font-data">{royal.unfiltered.word}</span>, at{" "}
              {royal.unfiltered.similarity.toFixed(3)}, which is higher than{" "}
              {royal.answer.word}. The convention of dropping the three input
              words comes from the original evaluation, and without it most of
              these analogies return one of their own ingredients. That is not a
              scandal, but it is the sort of detail that separates knowing the
              demo from knowing the method.
            </p>
            <p>
              And try the comparative one.{" "}
              <span className="font-data">bigger &minus; big + small</span> does
              not give <span className="font-data">smaller</span>. It gives{" "}
              <span className="font-data">{comparative.answer.word}</span>, with{" "}
              <span className="font-data">smaller</span> only{" "}
              {ordinal(comparative.expectedRank ?? 0)}. The geometry is real,
              and it is approximate, and both of those are true at once.
            </p>
          </div>
        </>
      ),
    },
    {
      id: "word-magnet",
      cta: "Inside the numbers",
      node: (
        <>
          <p className="label text-ink-faint mb-3">Now you try</p>
          <h2 className="display-lg mb-2">Feel the pull between two words.</h2>
          <p className="prose-measure text-ink-soft mb-6">
            You have seen that distance in this space means something. Now guess
            it. The magnet&rsquo;s strength is the real measured similarity
            between the pair. Commit to a guess, then find out how wrong the
            intuition is.
          </p>
          <div id="game">
            <WordMagnet />
          </div>
        </>
      ),
    },
    {
      id: "walkthrough",
      selfAdvance: true,
      node: <Walkthrough steps={STEPS} figure={<VectorStripFigure />} />,
    },
    {
      id: "analogy-bench",
      cta: "Look up any word",
      node: (
        <>
          <h2 className="display-lg mb-2">Do arithmetic with words</h2>
          <p className="prose-measure text-ink-soft mb-5">
            Because direction carries meaning, you can add and subtract words
            like numbers. Every figure below is computed in your browser from
            the same vectors the game just used.
          </p>
          <AnalogyBench />
        </>
      ),
    },
    {
      id: "word-chart",
      cta: "What it is for",
      node: (
        <>
          <h2 className="display-lg mb-2">
            Look up any word&rsquo;s neighbours
          </h2>
          <p className="prose-measure text-ink-soft mb-5">
            Type a word and see what the numbers put next to it, including the
            neighbours you would not have guessed. Those are the interesting
            ones.
          </p>
          <WordChart />
        </>
      ),
    },
  ];

  const tail = (
    <>
      <div data-section="deeper" className="space-y-4">
        <MechanismPanel
          question="How does counting produce meaning?"
          summary="Words that mean similar things get used in similar company. Counting the company is enough."
          deeper="how-models-learn"
        >
          <p>
            The idea is older than the machinery: you shall know a word by the
            company it keeps. <span className="font-data">Coffee</span> and{" "}
            <span className="font-data">tea</span> both show up near{" "}
            <em>cup</em>, <em>morning</em>, <em>drink</em>, <em>hot</em>. Nobody
            has to state that they are related. The pattern of co-occurrence
            already says so.
          </p>
          <p>
            GloVe turns that into arithmetic. It builds the table of how often
            each word appears near each other word across the whole corpus, then
            finds a set of coordinates that reproduces those counts as closely
            as possible. Fifty numbers per word here; production models use
            hundreds or thousands, and learn them as part of training rather
            than in advance.
          </p>
        </MechanismPanel>
        <MechanismPanel
          question="Do these vectors carry human bias?"
          summary="Yes, and it is measurable with the same arithmetic that makes the famous example work."
          deeper="why-ai-gets-things-wrong"
        >
          <p>
            Bolukbasi and colleagues showed in 2016 that the same word
            arithmetic which lands near <em>queen</em> also produces
            occupational stereotypes along a gender direction. That is not a bug
            in the algorithm. The vectors are a compression of how words are
            used in real text, so associations that exist in the text exist in
            the geometry.
          </p>
          <p>
            Worth carrying forward: this is the raw material every language
            model is built on. When a model produces a stereotyped assumption,
            the first place to look is not its instructions. It is what the
            arrangement of the text it read already implied.
          </p>
        </MechanismPanel>
        <Fold title="Watch somebody explain it" note={video.why}>
          <VideoPanel video={video} />
        </Fold>
        <Fold
          title="Go and try this on a real assistant"
          note="Ask for a word that sits between two others."
        >
          <PracticeCard
            title="Find where the arithmetic falls over"
            watchFor="How often the top answer is one of the inputs' close relatives rather than the analogy you meant. The trick works far less reliably than the famous example suggests, and seeing that is worth more than seeing it succeed."
          >
            <p>
              Use the bench above on relationships from your own field. A tool
              and what it makes. A country and its currency. A verb and its past
              tense.
            </p>
            <p>
              Then try a pair where the relationship is subtle, and see what
              comes back instead.
            </p>
          </PracticeCard>
        </Fold>
      </div>

      <Fold
        title="Check yourself"
        note="It marks itself, and nothing is sent anywhere."
      >
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
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
