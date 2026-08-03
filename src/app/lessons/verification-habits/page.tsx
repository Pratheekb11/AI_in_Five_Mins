import { HallucinationHunt } from "@/components/games/HallucinationHunt";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("verification-habits")!;
const video = videoFor("verification-habits")!;

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
    say: "One outcome deserves more attention than the misses: the sentences you read straight past that were fine. Nothing went wrong, you felt fast and competent, and you learnt exactly the wrong lesson.",
  },
  {
    say: "That is how every bad habit forms. It works, and works, and works, and then one Thursday it does not — and the one it does not work on is never the one you would have chosen.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "flag",
    prompt:
      "An assistant drafted this for a client email. Tap what you would check at source before it goes out.",
    instruction: "Three of these pieces need checking. The rest you can judge by reading.",
    parts: [
      { text: "Thanks for waiting —" },
      { text: "here is where we landed." },
      { text: "The regulation came into force on 17 March 2023,", wrong: true },
      { text: "which is why the deadline matters." },
      { text: "Our own turnaround is about a week," },
      { text: "so the timing is comfortable." },
      { text: "The current fee is £4,200 a year,", wrong: true },
      { text: "and I think that is good value." },
      { text: "This is set out in Article 12 of the Act.", wrong: true },
    ],
    because:
      "A date, a figure and a citation. They are the three shapes the machine produces most fluently when it has least to go on, and each is a thirty-second lookup. Everything else in the draft is tone, judgement or a fact about your own company — things you can settle by reading, because you are the source.",
  },
  {
    kind: "choice",
    prompt:
      "You ask the assistant 'are you sure about that?' and it says yes. What have you learnt?",
    options: [
      "That the answer is probably right, since it has now been confirmed a second time",
      "Nothing — its agreement is not independent of your question",
      "That it has gone back and re-checked its sources before agreeing with you",
    ],
    answer: 1,
    because:
      "Sharma and colleagues measured how readily these systems move toward the user's apparent view. A yes after 'are you sure' and a change of answer after 'that's wrong' are the same behaviour. Confirmation has to come from outside the conversation.",
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
        sting="So stop trying to check everything and get good at spotting the thing worth checking. Below is a real encyclopedia paragraph with three things quietly changed in it. Six flags, three errors, and everybody gets the same paragraph today."
        cta="Hunt today's paragraph"
      />

      <div className="py-4">
        <HallucinationHunt />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
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
        <Check slug={lesson.slug} beats={CHECK} />
      </div>
    </LessonShell>
  );
}
