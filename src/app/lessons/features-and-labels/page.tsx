import { FeatureBench } from "@/components/games/FeatureBench";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { FeatureSplitFigure } from "@/components/machines/FeatureSplitFigure";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("features-and-labels")!;

export const metadata = lessonMetadata(lesson);

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "All 5,574 real messages behind every count on this page, split 80/20 with the same seed the rest of the site uses.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title:
      "Contributions to the Study of SMS Spam Filtering: New Collection and Results",
    publisher: "Almeida, Gómez Hidalgo & Yamakami (ACM DOCENG 2011)",
    url: "https://dl.acm.org/doi/10.1145/2034691.2034742",
    used: "How the corpus was collected, and what the authors themselves got out of it.",
  },
  {
    title: "A Mathematical Theory of Communication",
    publisher: "Claude Shannon, Bell System Technical Journal (1948)",
    url: "https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf",
    used: "Where the bit comes from, and why uncertainty can be measured at all. Every 'bits removed' figure on this page is his entropy, applied to two classes.",
  },
  {
    title: "Rules of Machine Learning: Best Practices for ML Engineering",
    publisher: "Martin Zinkevich, Google",
    url: "https://developers.google.com/machine-learning/guides/rules-of-ml",
    used: "A practitioner's account of why the features, not the algorithm, are where the work and most of the mistakes are.",
  },
];

const STEPS: Step[] = [
  {
    say: "Here is every training message in one bar. Pink is spam, blue is ordinary, and about one in seven is pink. A model cannot read any of them. Somebody has to turn each message into answers to questions, and those answers are all it will ever see.",
  },
  {
    say: "So ask a question. Does this message contain a five digit number? The bar cuts in two, and look at what happens to the colours. The yes pile is almost pure spam. That is what a good feature looks like.",
  },
  {
    say: "Now the question everybody reaches for. Does it use the word free? The cut is much worse. Plenty of ordinary messages say free, and most spam does not bother. Being memorable and being informative are not the same thing.",
  },
  {
    say: "Now one that has nothing to do with what the message says. Is it longer than a hundred and twenty characters? That beats the word free, comfortably, on nothing but the size of the thing.",
  },
  {
    say: "And one that works backwards. Does it say I, or me? The yes pile is almost pure ordinary message, because spam does not talk about itself. A feature that reliably says not spam is worth exactly as much as one that says spam.",
  },
  {
    say: "Which is the whole idea. The model never meets your data. It meets whatever survived this translation, and everything you did not ask about is invisible to it forever. Try the rest of the candidates below.",
    caption:
      "Bits removed is Shannon's entropy: how much of the uncertainty about the label disappears once you know the answer to one question.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "sort",
    prompt:
      "You are building a model to predict which customers cancel. Which pile does each column belong in?",
    buckets: [
      { id: "feature", label: "A feature", hint: "something the model reads" },
      { id: "label", label: "The label", hint: "the thing you are predicting" },
      {
        id: "leak",
        label: "Neither, it leaks",
        hint: "you only know it afterwards",
      },
    ],
    items: [
      { id: "months", text: "Months since they signed up", bucket: "feature" },
      {
        id: "logins",
        text: "Logins in the last thirty days",
        bucket: "feature",
      },
      { id: "cancelled", text: "Whether they cancelled", bucket: "label" },
      {
        id: "reason",
        text: "The reason they gave for cancelling",
        bucket: "leak",
      },
      {
        id: "refund",
        text: "Whether a cancellation refund was issued",
        bucket: "leak",
      },
      { id: "plan", text: "Which plan they are on", bucket: "feature" },
    ],
    because:
      "The label is the thing you will not have when it matters. Anything recorded because the label happened is not a feature, it is the label wearing a hat: a model given the refund column will look perfect in testing and be useless in production, because at prediction time nobody has cancelled yet. That mistake has a name, leakage, and it is the commonest way a machine learning project quietly fails.",
  },
  {
    kind: "choice",
    prompt:
      "The word free removed 0.063 bits. Message length removed 0.167. What does that tell you?",
    options: [
      "That the length of a message matters more to what it means than any of the actual words in it do",
      "That on this corpus, length narrows the label down more than the word free does",
      "That the word free hardly ever turns up in the spam messages in this particular collection",
    ],
    answer: 1,
    because:
      "It is a statement about this corpus and these two questions, not about language. Free does appear in spam, and it also appears in perfectly ordinary messages, which is exactly what makes it a weak cut. Bits removed measures separation, not importance, and swapping the corpus can swap the answer.",
  },
];

export default function FeaturesAndLabelsLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            The word &ldquo;free&rdquo; is beaten by{" "}
            <span className="text-blue-text">how long the message is</span>.
          </>
        }
        sting="Everybody picks the word. On 5,574 real text messages, asking whether the message runs past 120 characters separates spam from ordinary post nearly three times better, and it never looks at a single word. Put money on a few of these before you are shown the counts."
        cta="Take the bench"
      />

      <div className="py-4">
        <FeatureBench />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<FeatureSplitFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="What is a bit, and why measure in those?"
          summary="It is one perfect yes-or-no answer. Bits removed says how much of the guessing a feature saves you."
        >
          <p>
            Before you know anything, one message in seven is spam, and Shannon
            gives that uncertainty a size: 0.567 of a bit. If you could ask one
            question whose answer told you the label outright, it would remove
            all of it. Real questions remove a fraction.
          </p>
          <p>
            That is why bits are the right unit for choosing features. Counting
            how much spam a feature catches rewards a feature that fires on
            everything. Counting how pure its pile is rewards one that fires
            almost never. Bits removed balances both, because it weighs each
            pile by how big it is.
          </p>
          <p>
            The same measure, applied over and over, is how a decision tree
            picks what to ask next. That is a later module, and it is not a new
            idea when you get there.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Why is this where the work is, rather than the algorithm?"
          summary="Because no algorithm can recover what the features left out."
        >
          <p>
            A model sees a row of numbers. If the thing that actually explains
            your problem is not in that row, no amount of tuning invents it, and
            the effort goes into squeezing tenths of a per cent out of a set of
            columns that were never going to answer the question.
          </p>
          <p>
            Zinkevich&rsquo;s account of this from inside Google is blunt about
            the ordering: get the features right first, and prefer a simple
            model on good features to a clever one on poor features. It is the
            least glamorous part of the subject and the part that decides
            whether the rest of it was worth doing.
          </p>
          <p>
            It is also where the ethics live. Choosing what to record is
            choosing what the system can ever take into account, and what it
            will be structurally blind to.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Write down the row"
          watchFor="How many of your columns you would actually have at the moment you need the prediction. The ones you would not are leaks, and they are the reason a model can test beautifully and fail in production."
        >
          <p>
            Take a prediction somebody in your work would like to have. Write
            down the label first, in one line: the exact thing you want to know
            before it happens.
          </p>
          <p>
            Then write the row of features you could put in front of it, using
            only things that exist at the moment the prediction is needed.
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
