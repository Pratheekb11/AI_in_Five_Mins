import { PasteCheck } from "@/components/games/PasteCheck";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { KIND_LABEL, KIND_NOTE, PAYLOADS } from "@/lib/game/paste";
import type { CheckBeat } from "@/lib/check";
import { getLesson, lessonsIn } from "@/lib/lessons";
import type { Source } from "@/lib/sources";

const lesson = getLesson("judgment-and-limits")!;
const track = lessonsIn("chapter");

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Article 9 — Processing of special categories of personal data",
    publisher: "General Data Protection Regulation (EU) 2016/679",
    url: "https://gdpr-info.eu/art-9-gdpr/",
    used: "The definition of special category data used by the game: health, race or ethnic origin, political opinions, religious belief, trade union membership, genetics, biometrics, sex life and sexual orientation.",
  },
  {
    title: "Regulation (EU) 2016/679 (GDPR), consolidated text",
    publisher: "EUR-Lex, Publications Office of the European Union",
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    used: "The regulation itself, including the Article 4 definition of personal data as information relating to an identifiable living person.",
  },
  {
    title: "What is special category data?",
    publisher: "Information Commissioner's Office (UK)",
    url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/",
    used: "A regulator's plain-English account of which data needs more protection and why.",
  },
  {
    title: "Privacy Policy",
    publisher: "Anthropic",
    url: "https://www.anthropic.com/legal/privacy",
    used: "An example of the document that actually governs what happens to what you type. Every vendor has one, they differ, and consumer and business plans are usually not the same.",
  },
  {
    title:
      "The Impact of Generative AI on Critical Thinking: Self-Reported Reductions in Cognitive Effort and Confidence Effects From a Survey of Knowledge Workers",
    publisher: "Lee, Sarkar, Tankelevitch, Drosos, Rintel, Banks & Wilson (CHI 2025)",
    url: "https://advait.org/files/lee_2025_ai_critical_thinking_survey.pdf",
    used: "319 knowledge workers, 936 first-hand examples: confidence in the tool predicts less critical thinking, confidence in yourself predicts more.",
    licence: "CC BY 4.0",
  },
  {
    title:
      "Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task",
    publisher: "Kosmyna et al. (arXiv:2506.08872, 2025)",
    url: "https://arxiv.org/abs/2506.08872",
    used: "An EEG study of 54 participants writing essays with an LLM, a search engine or nothing. Cited with its limits stated: one task, small sample, and a preprint.",
  },
];

const STEPS: Step[] = [
  {
    say: "Two things are left, and they are the two nobody puts in a tutorial. What you are allowed to type into it, and what happens to you if you type everything into it.",
  },
  {
    say: "Start with the first. When you paste, you are making a decision on somebody else's behalf. The customer whose complaint you pasted did not agree to that. Neither did the colleague in the screenshot.",
    caption:
      "The law already draws these lines: personal data, and a stricter category for health, beliefs, politics, union membership and the rest.",
  },
  {
    say: "Which is why the useful habit is smaller than a policy. Before pasting, ask: is any of this somebody else's to give away? Usually the identifiers were not the part you needed anyway — strip them and paste the substance.",
  },
  {
    say: "Now the second thing. Lee and colleagues surveyed three hundred knowledge workers and found that the more confidence people had in the tool, the less critical thinking they did. Confidence in themselves ran the other way.",
  },
  {
    say: "There is early evidence the effect is not only about attention. Kosmyna and colleagues put people in EEG caps to write essays; the group using an LLM showed the weakest brain connectivity, the lowest sense of ownership of their own work, and struggled to quote back what they had just written. Small study, one task, still a preprint — but the direction is worth taking seriously.",
  },
  {
    say: "So the closing question of this whole track is not whether to use it. It is which of your abilities you are willing to let go rusty — and to answer that on purpose, rather than by drift.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "sort",
    prompt: "Into a general-purpose chat window, at work. Which pile?",
    buckets: [
      { id: "fine", label: "Paste it", hint: "nothing at stake but your time" },
      { id: "strip", label: "Strip it first", hint: "the details were never the hard part" },
      { id: "no", label: "Keep it out", hint: "not yours to disclose" },
    ],
    items: [
      { id: "draft", text: "A blog post you wrote, for a tidy-up", bucket: "fine" },
      { id: "public", text: "A published annual report you want summarised", bucket: "fine" },
      { id: "complaint", text: "A customer complaint, with their name and address", bucket: "strip" },
      { id: "cv", text: "Three job applications you are comparing", bucket: "strip" },
      { id: "sick", text: "A colleague's sick note", bucket: "no" },
      { id: "creds", text: "A config file with a live API key in it", bucket: "no" },
    ],
    because:
      "The middle pile is the one people get wrong. The identifiers in a complaint or an application are almost never the part you needed help with, so removing them costs ten seconds and buys you the same answer without making a disclosure decision on someone else's behalf. The last pile is different in kind: health is special category data under Article 9, and a live key is a key — neither becomes safe by being anonymised.",
  },
  {
    kind: "choice",
    prompt: "Why is a colleague's sick note different from their home address?",
    options: [
      "It is not different at all — under the law both are simply personal data about someone",
      "Health data is special category data, which carries a higher bar than ordinary personal data",
      "Sick notes count as public documents once they have been handed to an employer",
    ],
    answer: 1,
    because:
      "Article 9 singles out health, race, politics, religion, union membership, genetics, biometrics and sex life for stricter treatment. In practice that means it does not belong in a general-purpose chat window unless your organisation has approved tooling and a lawful basis.",
  },
];

export default function JudgmentAndLimitsLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Every paste is a decision you make{" "}
            <span className="text-pink-text">on somebody else&rsquo;s behalf</span>
            .
          </>
        }
        sting="The customer whose complaint you pasted was not asked. Neither was the colleague in the screenshot. Here are things you might reasonably consider pasting, one at a time and with no clock on it — because refusing all of them is not the answer either, and a tool nobody may use is not a safe tool."
        cta="Open the first one"
      />

      <div className="py-4">
        <PasteCheck />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} />
      </div>

      <section className="plate mb-4 p-5 md:p-6">
        <p className="label text-ink-faint mb-4">
          The four kinds, in the words of the people who define them
        </p>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map(
            (kind) => (
              <div key={kind}>
                <dt className="font-display text-base font-bold">
                  {KIND_LABEL[kind]}
                </dt>
                <dd className="text-ink-soft mt-1 text-[0.9375rem]">
                  {KIND_NOTE[kind]}
                </dd>
              </div>
            ),
          )}
        </dl>
        <p className="prose-measure text-ink-soft border-ink/20 mt-5 border-t pt-4 text-[0.9375rem]">
          The categories are the legal ones, cited below. What to do about them
          is this module&rsquo;s rule and a sensible default, not legal advice
          &mdash; the binding answer is your employer&rsquo;s policy plus the
          terms of the specific tool, and those two differ more than people
          expect. The deck is {PAYLOADS.length}{" "}
          written examples; none is
          anybody&rsquo;s real data.
        </p>
      </section>

      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="What actually happens to what I type?"
          summary="It depends entirely on which plan you are on, and the answer is in a document you can read in five minutes."
          deeper="context-is-everything"
        >
          <p>
            There is no universal answer, which is exactly why this is worth
            checking once rather than assuming. Consumer plans and business or
            API plans usually differ on whether inputs may be used to improve
            models, how long conversations are retained, and who inside the
            vendor can see them under what circumstances.
          </p>
          <p>
            So do the boring thing once: open the privacy policy for the tool
            you actually use, and find the two paragraphs about training on
            inputs and about retention. Then check whether your organisation has
            a sanctioned tool with different terms &mdash; many do, and people
            paste into the consumer one out of habit.
          </p>
          <p>
            And keep one thing in view from the second module: what you paste
            goes into the context window, which is also where every tool result
            and attached file lands. There is no separate private compartment
            inside the conversation.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Is using it constantly making me worse at this?"
          summary="The honest answer is: there are two suggestive findings and no proof. Both point the same way."
          deeper="why-ai-gets-things-wrong"
        >
          <p>
            Lee and colleagues surveyed 319 knowledge workers about 936 real
            uses. Higher confidence in the AI predicted less critical thinking;
            higher confidence in one&rsquo;s own ability predicted more. That is
            a correlation in self-reported data &mdash; it does not establish
            that the tool caused anything.
          </p>
          <p>
            Kosmyna and colleagues went further and measured. Fifty-four people
            wrote essays under three conditions across four months, wearing EEG
            caps. The LLM group showed the weakest brain connectivity, reported
            the lowest ownership of their own essays, and struggled to quote
            work they had produced minutes earlier. It is a small preprint about
            one task, and it should be read as a warning rather than a
            conclusion.
          </p>
          <p>
            What both justify is modest and practical. Keep doing some of the
            work yourself &mdash; specifically the part you would be embarrassed
            to have lost. Write the first draft of the thing you care about
            being good at. Use the tool to attack it afterwards.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="For most of what I hand over, yes — it would be slower and duller, and I would manage. The honest answer is that there are one or two things I have started letting it do entirely, and I would be shaky on those now. That is the list worth watching. Not because using the tool is wrong, but because I would rather choose which abilities I let go rusty than find out by accident on a day when the tool is down and the work is due."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Read the two paragraphs, then write the one rule"
          watchFor="Whether the tool you actually use every day is the one your employer approved. For most people it is not, and that gap is where the real risk sits — not in the technology."
        >
          <p>
            Open the privacy policy of the assistant you use most. Find what it
            says about training on your inputs, and about how long conversations
            are kept. Five minutes, once.
          </p>
          <p>
            Then write yourself one sentence about what you will never paste,
            and stick it somewhere you will see it on a busy Thursday.
          </p>
        </PracticeCard>
      </div>

      {/* The end of the track. Eight modules, eight questions worth keeping. */}
      <section className="plate bg-teal-wash mb-4 p-5 md:p-6">
        <p className="label text-teal-text mb-3">That is the track</p>
        <h2 className="display-lg mb-3">Eight questions, and you are done</h2>
        <p className="prose-measure text-ink-soft mb-5">
          None of this was about the technology. It was about eight questions
          worth asking in front of a chat window &mdash; and if you can answer
          them in plain words, you understand these tools better than most
          people who use them daily.
        </p>
        <ol className="grid gap-3 sm:grid-cols-2">
          {track.map((entry) => (
            <li key={entry.slug} className="flex gap-3">
              <span className="data text-ink-faint shrink-0 text-sm">
                {String(entry.number).padStart(2, "0")}
              </span>
              <span>
                <a
                  href={`/lessons/${entry.slug}`}
                  className="font-display decoration-ink/30 hover:decoration-ink font-bold underline underline-offset-4"
                >
                  {entry.title}
                </a>
                {entry.feynman ? (
                  <span className="text-ink-soft block text-[0.9375rem]">
                    {entry.feynman}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Check slug={lesson.slug} beats={CHECK} />
      </div>
    </LessonShell>
  );
}
