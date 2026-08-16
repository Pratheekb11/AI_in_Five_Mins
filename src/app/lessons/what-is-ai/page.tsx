import { Hook } from "@/components/lesson/Hook";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { SpamBenchFigure } from "@/components/machines/SpamBenchFigure";
import { SPAM_BENCH } from "@/lib/datasets";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("what-is-ai")!;
const video = videoFor("what-is-ai")!;

export const metadata = lessonMetadata(lesson);

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "All 5,574 real messages behind every figure on this page, and the held-out split both the rules and the model are scored on.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title:
      "Contributions to the Study of SMS Spam Filtering: New Collection and Results",
    publisher: "Almeida, Gómez Hidalgo & Yamakami (ACM DOCENG 2011)",
    url: "https://dl.acm.org/doi/10.1145/2034691.2034742",
    used: "The paper describing how the corpus was collected, and published baselines for it.",
  },
  {
    title: "Some Studies in Machine Learning Using the Game of Checkers",
    publisher: "Arthur Samuel, IBM Journal (1959)",
    url: "https://ieeexplore.ieee.org/document/5392560",
    used: "The origin of the framing this lesson uses: programs that improve from experience rather than from instructions.",
  },
  {
    title: "But what is a neural network?",
    publisher: "3Blue1Brown",
    url: "https://www.youtube.com/watch?v=aircAruvnKk",
    used: "What a network that learns from examples looks like from the inside, once the idea on this page is scaled up.",
  },
];

const STEPS: Step[] = [
  {
    say: `Here is the job. ${SPAM_BENCH.corpus.total.toLocaleString("en-US")} real text messages, ${SPAM_BENCH.corpus.spam.toLocaleString("en-US")} of them spam. Sort them. Every machine below gets scored on the same messages it has never seen.`,
  },
  {
    say: `Start with the number that should worry you. A filter that flags nothing at all scores ${pct(SPAM_BENCH.baseline.accuracy)}, because most messages are not spam. It catches no spam whatsoever. A single accuracy figure can be almost meaningless.`,
  },
  {
    say: `Now ordinary software. A person reads the messages and writes ${SPAM_BENCH.bestSubset.rules.length} rules: if it contains a shortcode, flag it. That is how most computing you use was built, and it needs somebody to know the rule in advance. It reaches ${pct(SPAM_BENCH.bestSubset.accuracy)}.`,
  },
  {
    say: `Now the other approach, the one people call AI. Nobody writes a rule. It is shown labelled examples and finds the pattern itself, and it reaches ${pct(SPAM_BENCH.learned.accuracy)}. That difference, who wrote the rule, is the whole of what the word means here.`,
    caption: `The model was given ${SPAM_BENCH.learned.trainSize.toLocaleString("en-US")} labelled messages and nothing else. No word list, no hints.`,
  },
  {
    say: "So the useful questions are never about the algorithm. What was it shown? What did it miss? What did it wrongly flag? Those three questions carry you through every AI claim you will ever read.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "A spam filter reports 86% accuracy. Should you be impressed?",
    options: [
      "Yes. A score that high means it is catching very nearly all of the spam that arrives",
      "No. Flagging nothing at all scores about that, because most messages are not spam",
      "There is no way to tell without knowing the programming language",
    ],
    answer: 1,
    because: `You saw this above: doing nothing scores ${pct(SPAM_BENCH.baseline.accuracy)}. When one answer is far more common than the other, accuracy flatters useless models. Look at what was caught and what was wrongly flagged instead.`,
  },
];

export default function WhatIsAiLesson() {
  const beats: Beat[] = [
    {
      id: "hook",
      selfAdvance: true,
      node: (
        <Hook
          claim={
            <>
              {SPAM_BENCH.bestSubset.rules.length} rules you could write on a
              napkin get within{" "}
              <span className="text-blue-text">
                {(
                  (SPAM_BENCH.learned.accuracy -
                    SPAM_BENCH.bestSubset.accuracy) *
                  100
                ).toFixed(1)}{" "}
                points
              </span>{" "}
              of the machine-learning model.
            </>
          }
          sting={`On ${SPAM_BENCH.corpus.total.toLocaleString("en-US")} real text messages, scored on the same held-out split. Watch the three of them go up, including the one that does nothing at all and still scores 86%. That is the number that should worry you.`}
          cta="Watch it run"
        />
      ),
    },
    {
      id: "walkthrough",
      selfAdvance: true,
      node: <Walkthrough steps={STEPS} figure={<SpamBenchFigure />} />,
    },
  ];

  const tail = (
    <>
      <div data-section="deeper" className="space-y-4">
        <Fold
          title="Messages worth reading"
          note="The held-out half, and what each rule caught."
        >
          <>
            <p className="prose-measure text-ink-soft mb-5">
              A filter is only as good as its hardest cases. These are real
              messages from the corpus. Obvious spams, ones that slip past
              almost every rule, ordinary messages that trip several, and ones
              that stay clean.
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              {SPAM_BENCH.examples.map((example, i) => (
                <li
                  key={i}
                  className={`plate-flush p-4 ${
                    example.spam ? "bg-pink-wash" : "bg-paper-raised"
                  }`}
                >
                  <p className="label mb-2">
                    <span
                      className={
                        example.spam ? "text-pink-text" : "text-teal-text"
                      }
                    >
                      {example.spam ? "Spam" : "Ordinary"}
                    </span>
                  </p>
                  <p className="text-[0.9375rem] break-words">{example.body}</p>
                </li>
              ))}
            </ul>
          </>
        </Fold>
        <MechanismPanel
          question="How did it find the pattern without being told?"
          summary="It counted. Which words turn up in which kind of message, and how often. Then it multiplied."
          deeper="how-models-learn"
        >
          <p>
            The model here is{" "}
            <span className="font-data">{SPAM_BENCH.learned.method}</span>. For
            every word in the training set it counts how often that word appears
            in spam and how often in ordinary messages. A new message is scored
            by combining the counts for the words it contains.
          </p>
          <p>
            That is genuinely all of it, and it is worth sitting with. There is
            no representation of what spam <em>is</em> anywhere in there. It has
            found that shortcodes and prize language cluster in one pile of
            examples. That is enough to be useful, and nowhere near enough to be
            trusted unsupervised.
          </p>
        </MechanismPanel>
        <MechanismPanel
          question="Why does a single accuracy number mislead?"
          summary="Because when one answer is much more common, guessing that answer every time already looks good."
        >
          <p>
            {SPAM_BENCH.corpus.spam} of the{" "}
            {SPAM_BENCH.corpus.total.toLocaleString("en-US")} messages are spam,
            which is about one in seven. A filter that flags nothing is right
            about everything else, which is {pct(SPAM_BENCH.baseline.accuracy)}{" "}
            of the time.
          </p>
          <p>
            The two numbers that actually matter trade against each other: what
            got through, and what got wrongly flagged. The learned model missed{" "}
            {SPAM_BENCH.learned.missed} and wrongly flagged{" "}
            {SPAM_BENCH.learned.falseAlarms}. Which of those two hurts more
            depends entirely on the job, and nobody can decide that for you from
            an accuracy figure.
          </p>
        </MechanismPanel>
        <Fold title="Watch somebody explain it" note={video.why}>
          <VideoPanel video={video} />
        </Fold>
        <Fold
          title="Go and try this on a real assistant"
          note="Find the rule you would have written first."
        >
          <PracticeCard
            title="Ask the two questions that make AI news readable"
            watchFor="How often neither question is answered anywhere in the article. That absence is usually the story."
          >
            <p>
              Next time you read a claim that an AI system achieves some
              percentage at something, ask two things before anything else. What
              was it shown to learn from? And what does the same score look like
              for the laziest possible answer?
            </p>
            <p>
              Then look for the errors: what it missed, and what it wrongly
              flagged.
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
