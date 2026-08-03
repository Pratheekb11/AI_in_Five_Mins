import { WordMagnet } from "@/components/games/WordMagnet";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { AnalogyBench } from "@/components/machines/AnalogyBench";
import { WordChart } from "@/components/machines/WordChart";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("embeddings")!;
const video = videoFor("embeddings")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

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
    publisher: "Bolukbasi, Chang, Zou, Saligrama & Kalai (arXiv:1607.06520, 2016)",
    url: "https://arxiv.org/abs/1607.06520",
    used: "The measurement that the same arithmetic reproduces the stereotypes present in the training text.",
  },
  {
    title: "Transformers, the tech behind LLMs",
    publisher: "3Blue1Brown",
    url: "https://www.youtube.com/watch?v=wjZofJX0v4M",
    used: "Opens on the same idea — words as directions in space — and then keeps going.",
  },
];

const STEPS: Step[] = [
  {
    say: "A model cannot do arithmetic on the word 'cat'. So before anything else happens, every word is turned into a list of numbers — coordinates for a point in space.",
  },
  {
    say: "Here that list is fifty numbers long. Nobody chose what any of them mean. They came out of counting which words appear near which other words, across six billion words of text.",
    caption:
      "GloVe, trained on Wikipedia and newswire. The vectors in the box are the real published ones.",
  },
  {
    say: "And that counting is enough to put words that mean similar things close together. The pull you were fighting in the box was not a metaphor — it was the actual cosine similarity between two of those fifty-number lists.",
  },
  {
    say: "Which gives you the strangest result in this whole subject. Because directions carry meaning, you can do arithmetic with words. Take king, subtract man, add woman, and look at what is nearest.",
  },
  {
    say: "Try it below on any words you like. And watch how often it does not work — the bench prints the real numbers, including the unimpressive ones, because a demonstration you can only run on four famous examples is not a demonstration.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "What is a word embedding?",
    options: [
      "A dictionary definition stored alongside the word",
      "A list of numbers giving the word a position in space, learnt from which words appear near which",
      "A compressed version of the word's spelling",
    ],
    answer: 1,
    because:
      "Coordinates, not meaning. Nobody wrote down what any single dimension is for. The whole structure came from counting co-occurrence across an enormous amount of text — and it turns out that is enough for nearby positions to mean related things.",
  },
  {
    prompt: "Why were most of the words in the box pushed away rather than pulled in?",
    options: [
      "The game makes them repel to add difficulty",
      "Because most pairs of words genuinely have almost nothing in common, and the force is the real similarity",
      "Because they were words the model had not seen",
    ],
    answer: 1,
    because:
      "Similarity is measured across all fifty dimensions, and for two unrelated words it comes out near zero or below. A crowded magnet is the exception, which is exactly why the crowd is informative when it forms.",
  },
  {
    prompt: "The same arithmetic gives stereotyped answers on some inputs. Why?",
    options: [
      "A bug in how the vectors are stored",
      "The vectors were built by counting real human text, so associations present in that text are present in the geometry",
      "Because the vocabulary is too small",
    ],
    answer: 1,
    because:
      "Bolukbasi and colleagues measured this in 2016. It is not a defect of the method; it is the method working as designed on the text it was given. The same property that makes 'king − man + woman' land near 'queen' also carries every other association in the corpus.",
  },
];

export default function EmbeddingsLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Every word the machine reads is{" "}
            <span className="text-blue-text">a point in space</span>. Meaning is
            which points sit near which.
          </>
        }
        sting="Fifty numbers per word, and nobody decided what any of them stand for — they fell out of counting which words turn up near which, across six billion words of text. In the box below, the pull between two words is that real measurement, not a story about it."
        cta="Switch on the magnet"
      />

      <div className="py-4">
        <WordMagnet />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
      </div>

      <section className="pb-4">
        <h2 className="display-lg mb-2">Do arithmetic with words</h2>
        <p className="prose-measure text-ink-soft mb-5">
          Because direction carries meaning, you can add and subtract words like
          numbers. Every figure below is computed in your browser from the same
          vectors the game just used.
        </p>
        <AnalogyBench />
      </section>

      <section className="pb-4">
        <h2 className="display-lg mb-2">Look up any word&rsquo;s neighbours</h2>
        <p className="prose-measure text-ink-soft mb-5">
          Type a word and see what the numbers put next to it &mdash; including
          the neighbours you would not have guessed, which are the interesting
          ones.
        </p>
        <WordChart />
      </section>

      <div className="space-y-4 pb-4">
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
            has to state that they are related &mdash; the pattern of
            co-occurrence already says so.
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
            arithmetic which lands near <em>queen</em> also produces occupational
            stereotypes along a gender direction. That is not a bug in the
            algorithm. The vectors are a compression of how words are used in
            real text, so associations that exist in the text exist in the
            geometry.
          </p>
          <p>
            Worth carrying forward: this is the raw material every language model
            is built on. When a model produces a stereotyped assumption, the
            first place to look is not its instructions &mdash; it is what the
            arrangement of the text it read already implied.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question="Why can a computer tell that 'cat' and 'dog' are related?"
          answer="Because every word has been turned into a list of numbers — a position in space — and those positions came from counting which words show up near which other words in a huge pile of text. Cat and dog get used in the same kinds of sentences, so their positions end up close together. The machine is not reading a definition. It is measuring a distance between two points that were placed by counting."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Find where the arithmetic falls over"
          watchFor="How often the top answer is one of the inputs' close relatives rather than the analogy you meant. The trick works far less reliably than the famous example suggests, and seeing that is worth more than seeing it succeed."
        >
          <p>
            Use the bench above on relationships from your own field. A tool and
            what it makes. A country and its currency. A verb and its past
            tense.
          </p>
          <p>
            Then try a pair where the relationship is subtle, and see what comes
            back instead.
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
