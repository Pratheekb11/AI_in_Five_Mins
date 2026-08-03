import { ProvenanceDetective } from "@/components/games/ProvenanceDetective";
import { FeynmanCheck } from "@/components/lesson/FeynmanCheck";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";

const lesson = getLesson("tools-change-the-game")!;
const video = videoFor("tools-change-the-game")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
    publisher: "Schick et al. (arXiv:2302.04761, 2023)",
    url: "https://arxiv.org/abs/2302.04761",
    used: "The statement of the problem this module is about: models struggle at arithmetic and factual lookup, where far simpler programs excel — and the fix is to call those programs.",
  },
  {
    title: "ReAct: Synergizing Reasoning and Acting in Language Models",
    publisher: "Yao et al. (arXiv:2210.03629, 2022)",
    url: "https://arxiv.org/abs/2210.03629",
    used: "The interleaved reason-then-act loop that nearly every 'agent' you will meet is built on.",
  },
  {
    title:
      "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    publisher: "Lewis et al. (arXiv:2005.11401, 2020)",
    url: "https://arxiv.org/abs/2005.11401",
    used: "The method behind 'it searched and then answered', and the reason a retrieved answer can be attributed to a source.",
  },
  {
    title: "Tool use overview",
    publisher: "Anthropic developer documentation",
    url: "https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview",
    used: "A vendor's own description of the mechanics: the model emits a request to call a tool, and something outside it runs the tool.",
  },
  {
    title: "[1hr Talk] Intro to Large Language Models",
    publisher: "Andrej Karpathy",
    url: "https://www.youtube.com/watch?v=zjkBMFhNj_g",
    used: "A long talk, and the clearest account of what tools add to a model.",
  },
];

const STEPS: Step[] = [
  {
    say: "Everything so far has described a model on its own: a guesser with a fixed slab of text in front of it. Modern assistants are usually not that. They have been given tools.",
  },
  {
    say: "A tool is a small program the model can ask for. Search the web. Run this code. Open this file. Four things can now happen behind a single reply, and the reply looks identical in all four cases.",
    caption:
      "Looked up · calculated · read · guessed. Only the first three involve anything outside the model being consulted.",
  },
  {
    say: "This matters because it changes what the failures are. A model with a search tool is no longer stale — but it can still summarise the page wrongly. A model that ran code did not guess the number — but it may have written the wrong code.",
  },
  {
    say: "So the useful question stops being 'is this right' and becomes 'which of the four just happened'. That tells you what could have gone wrong, which tells you what to check.",
  },
  {
    say: "And you can simply ask. Did you look this up, or is it from memory? Show me the source. Any decent assistant will tell you, and if it will not, treat the answer as guessed.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt: "What is actually happening when a model 'uses a tool'?",
    options: [
      "The model runs the program inside itself",
      "The model writes out a request to call the tool; a program outside runs it and puts the result back into the context",
      "The model is connected to the internet at all times",
    ],
    answer: 1,
    because:
      "It is still only producing text. The text just happens to be a call, and the surrounding program is what executes it and pastes the answer back in. This is why a tool result lands in the same context window as everything else — and competes for the same space.",
  },
  {
    prompt:
      "An assistant with web search gives you a figure and a link. What is still worth checking?",
    options: [
      "Nothing — a link means it was looked up",
      "That the link actually says what the answer says it says",
      "Only whether the site is well known",
    ],
    answer: 1,
    because:
      "Search fixes the staleness, not the summarising. Retrieval puts real text into the context; the model still writes the sentence about it, and that sentence can drift from the source. Clicking the link is a two-second check that catches most of it.",
  },
  {
    prompt: "You need a total from a 400-row spreadsheet. What is safest?",
    options: [
      "Ask for the total in plain language and read the answer",
      "Ask it to compute it by running code, and check the code",
      "Paste the rows and ask it to add carefully",
    ],
    answer: 1,
    because:
      "Asking it to add carefully is asking a text predictor to be an adding machine. Running code moves the arithmetic to something that actually does arithmetic — and the code is short enough to read, which is the part you can verify.",
  },
];

export default function ToolsChangeTheGameLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Four completely different things can happen behind one reply.{" "}
            <span className="text-blue-text">All four look the same.</span>
          </>
        }
        sting="It looked it up. It ran code. It opened your file. Or it just wrote something. The confidence, the tone and the formatting are identical in every case — so knowing which one you asked for is the whole of knowing how far to trust the answer."
        cta="Work the sorter"
      />

      <div className="py-4">
        <ProvenanceDetective />
      </div>

      <div className="grid gap-4 pb-4 lg:grid-cols-[1.35fr_1fr]">
        <Walkthrough steps={STEPS} />
        <VideoPanel video={video} />
      </div>

      <div className="space-y-4 pb-4">
        <MechanismPanel
          question="How does a text predictor 'run' anything?"
          summary="It does not. It writes out a request to call a tool, and a program around it does the running."
          deeper="how-llms-answer"
        >
          <p>
            The model still only produces text. What changed is that some of
            that text is addressed to a program rather than to you: a call, with
            arguments. The surrounding system spots it, runs the real search or
            the real code, and pastes the result back into the context. Then the
            model reads its own context again &mdash; now containing a genuine
            answer &mdash; and writes your reply.
          </p>
          <p>
            Yao and colleagues formalised the loop as reason, act, observe,
            repeat, which is the skeleton of nearly every &ldquo;agent&rdquo; on
            the market. Schick and colleagues made the case for why you would
            bother: models are weak at arithmetic and lookup, and those are
            exactly the jobs tiny ordinary programs have always done perfectly.
          </p>
          <p>
            One consequence people miss: the tool&rsquo;s output lands in the
            same context window as your conversation, and takes up the same
            room. Attaching a huge file does not give the model more space. It
            spends the space you had.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="If it searched, is the answer safe?"
          summary="Safer, and not safe. Retrieval fixes staleness. It does not fix summarising."
          deeper="context-is-everything"
        >
          <p>
            Retrieval &mdash; the idea Lewis and colleagues published in 2020
            &mdash; fetches real passages and puts them in the context before
            the model writes. That genuinely fixes the stale-knowledge failure,
            and it is why a searched answer can carry a link at all.
          </p>
          <p>
            What it does not fix is the sentence the model then writes about
            those passages. It can overstate, merge two sources, or attach a
            real link to a claim the page never made. So the check is not
            &ldquo;is there a citation&rdquo; &mdash; it is &ldquo;does the
            citation say this&rdquo;. Open one link. It takes seconds and it
            catches the failure that survives every other precaution.
          </p>
        </MechanismPanel>
      </div>

      <div className="pb-4">
        <FeynmanCheck
          question={lesson.feynman!}
          answer="I can usually tell from what I asked. If it needed today's news, a live price or my own file, then it had to use a tool — and if it did not have one, the answer was written from memory no matter how specific it sounds. If it needed a real number, it had to run a calculation, not describe one. And if I cannot tell, I can ask it directly: did you look this up, and show me where."
        />
      </div>

      <div className="pb-4">
        <PracticeCard
          title="Ask the same question twice"
          watchFor="How similar the two answers look. The guessed one is not vaguer or more hesitant — that is the entire problem. Then open the link on the searched one and check it says what the answer claims."
        >
          <p>
            Pick something that has changed recently in your field: a price, a
            version number, a rule. Ask an assistant with search turned off, and
            keep the answer.
          </p>
          <p>
            Now ask the same question with search on, and ask it to name its
            source.
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
