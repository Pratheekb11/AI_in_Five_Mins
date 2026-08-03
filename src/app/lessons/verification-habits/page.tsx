import { HallucinationHunt } from "@/components/games/HallucinationHunt";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("verification-habits")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title:
      "The Impact of Generative AI on Critical Thinking: Self-Reported Reductions in Cognitive Effort and Confidence Effects From a Survey of Knowledge Workers",
    publisher: "Lee, Sarkar, Tankelevitch, Drosos, Rintel, Banks & Wilson (CHI 2025)",
    url: "https://advait.org/files/lee_2025_ai_critical_thinking_survey.pdf",
    used: "The finding that higher confidence in the tool predicts less critical thinking, and that the work of thinking shifts toward verifying what the tool produced.",
    licence: "CC BY 4.0",
  },
  {
    title: "Why Language Models Hallucinate",
    publisher: "Kalai, Nachum, Vempala & Zhang (arXiv:2509.04664, 2025)",
    url: "https://arxiv.org/abs/2509.04664",
    used: "Why a wrong answer arrives sounding exactly like a right one: the training rewards a confident guess over an admission of not knowing.",
  },
  {
    title: "Towards Understanding Sycophancy in Language Models",
    publisher: "Sharma et al. (arXiv:2310.13548, 2023)",
    url: "https://arxiv.org/abs/2310.13548",
    used: "Why asking 'are you sure?' is not a check: agreement after a push was measured across five leading assistants.",
  },
  {
    title: "Faith and Fate: Limits of Transformers on Compositionality",
    publisher: "Dziri et al. (arXiv:2305.18654, 2023)",
    url: "https://arxiv.org/abs/2305.18654",
    used: "Why arithmetic is on the always-recompute list, rather than the read-it-carefully list.",
  },
];

const STEPS: Step[] = [
  {
    say: "Everyone agrees you should check AI output. Almost nobody does it consistently, and the reason is not laziness. It is that checking costs time, and a rule you cannot afford is a rule you will quietly stop following.",
  },
  {
    say: "So the round charged you. Every level of checking took seconds off your own clock. Under that pressure you find out what your real policy is, rather than the one you would say out loud.",
  },
  {
    say: "The rule that survives contact with a real week is simple. Match the check to the damage. What happens if this is wrong, and who finds out?",
    caption:
      "Awkward — skim it. Costly — verify every load-bearing claim at its source. Serious — a second pair of eyes, or do it again independently.",
  },
  {
    say: "One outcome in that game deserves more attention than the failures. The dockets you under-checked that turned out fine. Nothing went wrong, you felt fast and competent, and you learnt exactly the wrong lesson.",
  },
  {
    say: "That is how every bad habit forms. It works, and works, and works, and then one Thursday it does not — and the one it does not work on is never the one you would have chosen.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "Why is 'always verify everything' a bad policy?",
    options: [
      "Because AI output is usually right",
      "Because it costs more than you have, so in practice it degrades into verifying nothing",
      "Because verification is impossible",
    ],
    answer: 1,
    because:
      "A policy has to be affordable to survive. Checking a name in a note as hard as a figure in a board pack is not diligence, it is a plan to run out of time and start skipping — usually on whichever item is most urgent, which is often the one that matters.",
  },
  {
    prompt: "You ask the assistant 'are you sure about that?' and it says yes. What have you learnt?",
    options: [
      "That the answer is probably right",
      "Nothing — its agreement is not independent of your question",
      "That it has re-checked its sources",
    ],
    answer: 1,
    because:
      "Sharma and colleagues measured how readily these systems move toward the user's apparent view. A yes after 'are you sure' and a change of answer after 'that's wrong' are the same behaviour. Confirmation has to come from outside the conversation.",
  },
  {
    prompt:
      "Which of these should be checked at source almost regardless of stakes?",
    options: [
      "The tone of a message",
      "Specific numbers, names, dates and citations",
      "The structure of an argument",
    ],
    answer: 1,
    because:
      "Those are the parts that are cheap to check and expensive to get wrong, and they are the parts these systems produce most confidently when they have least to go on. Tone you can judge by reading. A citation you cannot judge by reading at all.",
  },
];

export default function VerificationHabitsLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            &ldquo;Check everything&rdquo; and &ldquo;check nothing&rdquo; end
            up as <span className="text-yellow-text">the same policy</span>.
          </>
        }
        sting="Because checking costs time you do not have, and a rule you cannot afford is one you will drop — usually on the busiest day, which is exactly when the stakes are highest. So this round makes you pay for every check in seconds off your own clock, and finds out what your real policy is."
        cta="Open the desk"
      />

      <div className="py-4">
        <HallucinationHunt />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} />
      </div>

      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="Why does a wrong answer feel safe to send?"
          summary="Nothing in the writing marks it. And the more you trust the tool, the less of it you read."
          deeper="where-it-breaks"
        >
          <p>
            There is no wobble in the prose when a model is making something up.
            Kalai and colleagues explain why that is structural rather than
            incidental: the training rewards a confident guess over an admission
            of uncertainty, so the confident register is what gets reinforced,
            right or wrong.
          </p>
          <p>
            Lee and colleagues supply the human half. Across 319 knowledge
            workers, higher confidence in the AI predicted less critical
            thinking; higher confidence in one&rsquo;s own ability predicted
            more. Trust and scrutiny trade off directly &mdash; which means the
            tasks you have handed over longest are the ones you are now reading
            least carefully.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="What do I check first, when I only have a minute?"
          summary="The load-bearing specifics: numbers, names, dates, citations, and anything you would be quoted on."
          deeper="tools-change-the-game"
        >
          <p>
            Read the output and ask which single sentence the whole thing rests
            on. That is the one to check at source. Everything downstream of it
            is only as good as it is, and everything else is usually a matter of
            taste you can judge by reading.
          </p>
          <p>
            Three specifics never make the &ldquo;probably fine&rdquo; list.
            Arithmetic gets recomputed, in a calculator or by asking for code
            &mdash; Dziri and colleagues showed accuracy collapses as sums get
            bigger, and prose that looks like working out is not working out.
            Citations get opened, not scanned. And anything with a date, a
            price or a version gets checked against the source that owns it.
          </p>
          <p>
            What none of these are is asking the assistant to check itself.
            Confirmation has to come from outside the conversation, because
            inside it, agreement is the cheapest thing on offer.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="I ask who sees it and what it costs to undo. If it stays with me, a read-through is plenty. If it goes to a customer or a decision, I check every specific claim against the thing it came from. If somebody could be harmed or the money is real, I do not check it — I have somebody qualified check it, or I do it again myself from scratch. And I stay suspicious of the ones I got away with, because nothing going wrong is not the same as nothing being wrong."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Find the load-bearing sentence"
          watchFor="How often the sentence everything rests on is a specific — a figure, a date, a named source — rather than an argument. That is not a coincidence, and it is the shortest route to a check that is actually worth the time."
        >
          <p>
            Take the last substantial thing an assistant produced for you. Read
            it once and underline the single sentence that everything else
            depends on.
          </p>
          <p>
            Check that one sentence at its source. Then decide honestly whether
            you would have caught it if it had been wrong.
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
