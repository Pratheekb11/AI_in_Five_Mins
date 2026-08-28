import { WheresTheLine } from "@/components/games/WheresTheLine";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { ThresholdFigure } from "@/components/machines/ThresholdFigure";
import type { CheckBeat } from "@/lib/check";
import {
  start as dealThreshold,
  type ThresholdData,
} from "@/lib/game/threshold";
import { getLesson } from "@/lib/lessons";
import { readGameData } from "@/lib/server/gameData";
import type { Source } from "@/lib/sources";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("accuracy-is-a-liar")!;

export const metadata = lessonMetadata(lesson);

const thresholdData = readGameData<ThresholdData>("threshold.json");
const initialScene = dealThreshold(
  thresholdData,
  Array.from({ length: 20 }, () => Math.random()),
);

const SOURCES: Source[] = [
  {
    title: "SMS Spam Collection v.1",
    publisher: "Almeida, Gómez Hidalgo & Yamakami",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
    used: "The 1,115 held-out messages every dot, count and percentage on this page comes from.",
    licence: "Free to use with attribution to the authors' 2011 paper",
  },
  {
    title: "The Relationship Between Precision-Recall and ROC Curves",
    publisher: "Davis & Goadrich (ICML 2006)",
    url: "https://ftp.cs.wisc.edu/machine-learning/shavlik-group/davis.icml06.pdf",
    used: "Why precision and recall are the pair to look at when one class is much rarer than the other, and how misleading the alternative can be.",
  },
  {
    title: "The Foundations of Cost-Sensitive Learning",
    publisher: "Charles Elkan (IJCAI 2001)",
    url: "https://cseweb.ucsd.edu/~elkan/rescale.pdf",
    used: "The result the game is built on: the optimal threshold follows directly from what each kind of mistake costs.",
  },
];

const STEPS: Step[] = [
  {
    say: "Every dot is one message the model has never seen, placed at the score it gave. Spam above the line, ordinary below. Notice it never said spam or not spam. It said a number, and almost every number is jammed at one end.",
  },
  {
    say: "So somebody has to decide where a number becomes an action. Here is the line most software uses, at one half, chosen by nobody in particular. It catches 145 of 156 spam and wrongly blocks 4 real messages.",
  },
  {
    say: "Slide it left, to flag anything with the faintest smell. Now it catches 155 of the 156. It also blocks 798 perfectly ordinary messages, and its accuracy falls to twenty eight per cent. Recall went up, precision fell through the floor.",
  },
  {
    say: "Slide it right instead. Now everything it flags really is spam, all of it, not one false alarm. And it quietly lets 48 spam messages through. Same model, same day, opposite behaviour.",
  },
  {
    say: "And the number people quote is the one that hides all of this. A filter that flags nothing at all scores eighty six per cent accuracy on these messages, because most messages are not spam. Accuracy alone is not evidence of anything.",
  },
  {
    say: "Which makes this a question for whoever owns the consequences, not for whoever wrote the model. What is worse here: a spam that gets through, or a real message that never arrives? Answer that and the line puts itself.",
    caption:
      "Precision: of what you flagged, how much was right. Recall: of what was there, how much you caught. You do not get both.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "match",
    prompt: "Match each job to what it should be tuned for.",
    pairs: [
      {
        left: "Screening for a disease, before a cheap confirming test",
        right: "Recall. Missing a case is far worse than a second test",
      },
      {
        left: "Auto-deleting suspected spam with no folder to check",
        right: "Precision. Anything you flag is gone, so be sure",
      },
      {
        left: "Flagging transactions for a human reviewer with a queue",
        right: "Whatever keeps the queue at the size the humans can clear",
      },
    ],
    because:
      "None of these is a property of the model. All three could be the same model with the line in three places. The question is always which mistake you can live with, and how many of them per day the people downstream can absorb.",
  },
  {
    kind: "choice",
    prompt:
      "A fraud filter reports 99.9% accuracy. Fraud is one transaction in a thousand. What have you learnt?",
    options: [
      "That it is catching virtually all of the fraud, since it is right on nearly every transaction it sees",
      "Almost nothing. Approving every transaction also scores 99.9%",
      "That the model is very likely overfitting, because a score that high is rarely genuine",
    ],
    answer: 1,
    because:
      "When one class is rare, accuracy is dominated by the common one, and doing nothing scores brilliantly. You saw the mild version here: flagging nothing scores 86% on this corpus. Ask instead how much of the fraud it caught, and how many honest customers it blocked to do it.",
  },
];

export default function AccuracyIsALiarLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            The same model, on the same day, catching{" "}
            <span className="text-pink-text">99% or 69%</span> of the spam.
          </>
        }
        sting="Nothing about it changed. One number moved, the one nobody in the room thinks of as a decision, and it is worth 30 points of catch rate and 798 wrongly blocked messages. You are told what each mistake costs. Put the line somewhere."
        cta="Take the dial"
      />

      <div className="py-4">
        <WheresTheLine
          initialData={thresholdData}
          initialScene={initialScene}
        />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<ThresholdFigure />} />
      </div>

      <DeeperRow>
        <MechanismPanel
          question="Precision and recall, in one sentence each?"
          summary="Precision: of what you flagged, how much was right. Recall: of what was out there, how much you caught."
        >
          <p>
            They answer different questions and they are both about the flagged
            pile. Precision looks at what you did and asks how much of it was
            justified. Recall looks at what existed and asks how much you found.
            A filter that flags one message and gets it right has perfect
            precision and hopeless recall.
          </p>
          <p>
            You cannot raise both by moving the line, only trade one for the
            other, which is why reporting a single number is always a choice
            about what to hide. Davis and Goadrich make the sharper point that
            when one class is rare, a precision and recall pair shows problems
            that other summaries flatter away.
          </p>
          <p>
            Raising both at once takes a better model, or better features, and
            that is the only honest way to get it.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Is there a right threshold, or is it a matter of taste?"
          summary="There is a right one, and it follows from what each mistake costs. Write those two numbers down and the line puts itself."
        >
          <p>
            Elkan set this out plainly: once you say what a false alarm costs
            and what a miss costs, the optimal decision rule is fixed. It is
            arithmetic, not judgement. The judgement is entirely in choosing the
            two costs, and that belongs to whoever lives with the consequences.
          </p>
          <p>
            Which is why the default of one half is so quietly dangerous. It is
            not neutral. It is the assumption that a miss and a false alarm cost
            exactly the same, which is true of almost nothing anybody does.
          </p>
          <p>
            One caveat worth carrying from this page: on this data, several
            quite different cost ratios land on the same line, because past a
            point there are no false alarms left to remove. Optima are often
            flat, and a threshold that is roughly right is usually fine.
          </p>
        </MechanismPanel>

        <PracticeCard
          title="Write down the two costs"
          watchFor="Whether anybody can state the ratio. If a team cannot say whether a miss is worth two false alarms or fifty, then nobody has chosen the threshold, and it is sitting at one half by default."
        >
          <p>
            Take any automated decision near you: a filter, a flag, an alert, an
            approval. Write down what one wrong flag costs, and what one missed
            case costs, in the same unit. Money, minutes, or trust.
          </p>
          <p>
            Then find out where the line actually sits, and who put it there.
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
