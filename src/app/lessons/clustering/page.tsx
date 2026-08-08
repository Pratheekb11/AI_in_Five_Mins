import { OddOneIn } from "@/components/games/OddOneIn";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { ClusterFigure } from "@/components/machines/ClusterFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("clustering")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "GloVe: Global Vectors for Word Representation",
    publisher: "Pennington, Socher & Manning (EMNLP 2014)",
    url: "https://nlp.stanford.edu/projects/glove/",
    used: "The 1,851 word vectors every dot and group on this page is computed from, trained on Wikipedia and newswire.",
    licence: "Public Domain Dedication and Licence v1.0",
  },
  {
    title:
      "Some methods for classification and analysis of multivariate observations",
    publisher:
      "J. MacQueen (Berkeley Symposium on Mathematical Statistics and Probability, 1967)",
    url: "https://projecteuclid.org/proceedings/berkeley-symposium-on-mathematical-statistics-and-probability/proceedings-of-the-fifth-berkeley-symposium-on-mathematical-statistics-and/Chapter/Some-methods-for-classification-and-analysis-of-multivariate-observations/bsmsp/1200512992",
    used: "The algorithm this page runs, and the name k-means, from the paper that introduced it.",
  },
  {
    title: "k-means++: The Advantages of Careful Seeding",
    publisher: "Arthur & Vassilvitskii (SODA 2007)",
    url: "https://theory.stanford.edu/~sergei/papers/kMeansPP-soda.pdf",
    used: "How the starting centres are chosen here, and why choosing them at random gives wildly different answers between runs.",
  },
];

const STEPS: Step[] = [
  {
    say: "Every word in the vocabulary, drawn at its own coordinates. There are no labels in this chapter at all. Nobody has told the algorithm what a single one of these words means, and there is no right answer for it to be measured against.",
  },
  {
    say: "It gets one number: eight. Eight centres are placed, and every word is handed to whichever centre it is nearest. This first pass is nearly arbitrary, because the centres were placed before anything was known.",
  },
  {
    say: "Then it repeats. Each centre moves to the middle of whatever it collected, and every word looks again to see whether something else is now nearer. Watch the borders walk across the picture.",
  },
  {
    say: "After thirty five passes, nothing moves. That is the whole of what converged means, and you can scrub back through it: no word changed its mind on the final pass, so there is nothing left for the algorithm to do.",
  },
  {
    say: "And here is what it found. Some of those groups are obviously something, colours and animals in one, military and security language in another. Some are a shrug. Both came out of the same procedure.",
  },
  {
    say: "One last thing, and it is the honest one. Ask for more groups and the fit always improves, all the way to one group per word. Nothing in the data can tell you the right number, because with no labels there is nothing to be right about.",
    caption:
      "MacQueen's algorithm from 1967, with the modern seeding from Arthur and Vassilvitskii.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "choice",
    prompt:
      "You cluster your customers into five groups and the fit improves when you ask for six. What follows?",
    options: [
      "Six is the better answer, since a tighter fit means the groups match the real structure more closely",
      "Nothing. The fit always improves with more groups, right up to one group per customer",
      "Five was wrong, and you should keep increasing until the improvement stops entirely",
    ],
    answer: 1,
    because:
      "Tightness is not evidence. It is guaranteed to improve, exactly as training accuracy is guaranteed to improve with a bigger model, and for the same reason. Choosing k is a judgement about what you will do with the groups, not a measurement, and the honest version of that sentence is what most clustering write-ups leave out.",
  },
  {
    kind: "sort",
    prompt: "Which of these can clustering actually tell you?",
    buckets: [
      {
        id: "yes",
        label: "It can tell you this",
        hint: "falls out of the geometry",
      },
      { id: "no", label: "It cannot", hint: "you brought this with you" },
    ],
    items: [
      {
        id: "near",
        text: "Which items sit near each other in your features",
        bucket: "yes",
      },
      {
        id: "size",
        text: "How many items ended up in each group",
        bucket: "yes",
      },
      {
        id: "outlier",
        text: "Which items sit far from everything",
        bucket: "yes",
      },
      { id: "meaning", text: "What each group means", bucket: "no" },
      { id: "howmany", text: "How many groups there really are", bucket: "no" },
      { id: "why", text: "Why two items ended up together", bucket: "no" },
    ],
    because:
      "The output is a partition and some distances. Everything else, the names, the count, the story about why, is something a person adds afterwards by looking. That is not a flaw to be engineered away. It is what unsupervised means, and the mistake it invites is treating an invented group as a discovered fact.",
  },
];

export default function ClusteringLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Ask for eight groups and you get eight,{" "}
            <span className="text-pink-text">
              whether or not there are eight
            </span>
            .
          </>
        }
        sting="No labels, no answers, nothing to score. 1,851 real word vectors and one number, and it comes back with groups: some of them obviously colours and animals, some of them a shrug. Five rounds, and you say which word the algorithm put where."
        cta="See the first group"
      />

      <div className="py-4">
        <OddOneIn />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<ClusterFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="How does it decide, with nothing to learn from?"
          summary="It alternates two easy steps: put everything with its nearest centre, then move each centre to the middle of what it got."
          deeper="embeddings"
        >
          <p>
            That is the whole algorithm, and it has not changed since MacQueen
            described it in 1967. Each pass can only make the total distance
            smaller, so it always stops eventually, and where it stops depends
            entirely on where the centres started.
          </p>
          <p>
            Which is why the starting positions are chosen carefully here rather
            than at random. Arthur and Vassilvitskii&rsquo;s method spreads the
            first centres out, and without it the same data can produce quite
            different groups on different runs, which is a fact about the
            algorithm rather than about your customers.
          </p>
          <p>
            Note what is never involved: any notion of correct. Nothing in this
            procedure has an opinion about whether the groups it found mean
            anything.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Why do the colours look interleaved in the picture?"
          summary="Because the grouping happened in fifty dimensions and the picture has two. It is a shadow."
          deeper="embeddings"
        >
          <p>
            Every distance the algorithm used was computed across all fifty
            numbers of each word vector. The two coordinates each dot is drawn
            at are a projection, chosen to make an intelligible picture, and
            things far apart in fifty dimensions can land on top of each other
            in two.
          </p>
          <p>
            So a dot of one colour sitting inside a patch of another is usually
            not a mistake by the algorithm. It is the flattening. The embeddings
            module makes the same point about the arrow that does not quite land
            on the word.
          </p>
          <p>
            This matters beyond pictures. Distances behave strangely as
            dimensions pile up, and the everyday intuition that near means
            similar gets weaker the more features you add.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Name the groups before you look at the count"
          watchFor="Whether you can describe a group without using the word cluster. If the best description is these are the ones in group four, the group is an artefact of the number you chose."
        >
          <p>
            If anybody near you has clustered customers, documents or events,
            ask to see the members of each group rather than the summary, and
            try to name each one out loud.
          </p>
          <p>
            Then ask what number they asked for, and what happened when they
            asked for a different one.
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
