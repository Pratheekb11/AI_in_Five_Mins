import { ProvenanceDetective } from "@/components/games/ProvenanceDetective";
import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { ProvenanceFigure } from "@/components/machines/ProvenanceFigure";
import type { CheckBeat } from "@/lib/check";
import {
  start as dealProvenance,
  type ProvenanceData,
} from "@/lib/game/provenance";
import { getLesson } from "@/lib/lessons";
import { readGameData } from "@/lib/server/gameData";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("tools-change-the-game")!;
const video = videoFor("tools-change-the-game")!;

export const metadata = lessonMetadata(lesson);

const provenanceData = readGameData<ProvenanceData>("provenance.json");
const initialScene = dealProvenance(
  provenanceData,
  Array.from({ length: 120 }, () => Math.random()),
);

const SOURCES: Source[] = [
  {
    title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
    publisher: "Schick et al. (arXiv:2302.04761, 2023)",
    url: "https://arxiv.org/abs/2302.04761",
    used: "The statement of the problem this module is about: models struggle at arithmetic and factual lookup, where far simpler programs excel. The fix is to call those programs.",
  },
  {
    title: "ReAct: Synergizing Reasoning and Acting in Language Models",
    publisher: "Yao et al. (arXiv:2210.03629, 2022)",
    url: "https://arxiv.org/abs/2210.03629",
    used: "The interleaved reason-then-act loop that nearly every 'agent' you will meet is built on.",
  },
  {
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
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
    say: "Start with a question this model cannot answer. The capital of the United States. The right word is sitting sixteenth in its own ranking, and the word it actually wants to write is the.",
  },
  {
    say: "Now hand it one sentence of source text and ask again. Nothing was learned. Nothing was trained. The answer it could not reach is now its first choice at ninety eight percent. That is the whole of what a search tool does.",
  },
  {
    say: "It gets much worse than sixteenth. Ask it how plants make food and the word photosynthesis is eight hundred and ten places down the list. There is no hint here that it is stuck. It will write something confident either way.",
  },
  {
    say: "Same trick, same result. One sentence of source in front of it and eight hundred and ten places collapse to first. Watch the marker rather than the percentage. The distance it travels is the point.",
  },
  {
    say: "Then there is the door neither of those opens. Two digit addition, two hundred problems, none right. No sentence fixes this, because a sum was never written down somewhere to be recalled. It needs a calculator, which is exactly why one got bolted on.",
    caption:
      "Looked up · calculated · read · guessed. Only the first three involve anything outside the model being consulted.",
  },
  {
    say: "So the useful question stops being is this right. It becomes which of those four just happened, because that tells you what could have gone wrong. And you can simply ask. Did you look this up, or is it from memory? Show me the source.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "sort",
    prompt: "Which door does each request need?",
    buckets: [
      {
        id: "knows",
        label: "It already knows",
        hint: "written down everywhere",
      },
      { id: "source", label: "Needs a source", hint: "changes, or is private" },
      { id: "tool", label: "Needs a tool", hint: "must be computed or done" },
    ],
    items: [
      { id: "capital", text: "What is the capital of India?", bucket: "knows" },
      {
        id: "boil",
        text: "Why does water boil faster up a mountain?",
        bucket: "knows",
      },
      {
        id: "price",
        text: "What does this laptop cost today?",
        bucket: "source",
      },
      { id: "policy", text: "What is our refund policy?", bucket: "source" },
      { id: "sum", text: "Total these 400 invoice rows", bucket: "tool" },
      { id: "email", text: "Send that summary to the team", bucket: "tool" },
    ],
    because:
      "The first two are in the weights, written down so often that the likeliest continuation is also the right one. The next two are not knowledge, they are lookups. One changes by the week, and the other was never public. The last two are actions. The model can write out what to do, but something outside it has to add the column up or press send. Guessing at any of the bottom four is exactly the failure the game measured.",
  },
  {
    kind: "choice",
    prompt: "What is actually happening when a model 'uses a tool'?",
    options: [
      "The model runs the program inside itself and then reads back whatever that program happened to produce",
      "The model writes out a request to call the tool; a program outside runs it and puts the result back into the context",
      "The model is connected to the internet at all times, and simply fetches whatever it happens to need",
    ],
    answer: 1,
    because:
      "It is still only producing text. The text just happens to be a call, and the surrounding program is what executes it and pastes the answer back in. This is why a tool result lands in the same context window as everything else, and competes for the same room.",
  },
];

export default function ToolsChangeTheGameLesson() {
  const beats: Beat[] = [
    {
      id: "game",
      cta: "What just happened",
      node: (
        <div className="space-y-4">
          <h2 className="display-md">
            Four completely different things can happen behind one reply.{" "}
            <span className="text-blue-text">All four look the same.</span>
          </h2>
          <ProvenanceDetective
            initialData={provenanceData}
            initialScene={initialScene}
          />
        </div>
      ),
    },
    {
      id: "walkthrough",
      selfAdvance: true,
      node: <Walkthrough steps={STEPS} figure={<ProvenanceFigure />} />,
    },
  ];

  const tail = (
    <>
      <div data-section="deeper" className="space-y-4">
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
            model reads its own context again, which now holds a genuine answer,
            and writes your reply.
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
            Retrieval is the idea Lewis and colleagues published in 2020. It
            fetches real passages and puts them in the context before the model
            writes. That genuinely fixes the stale-knowledge failure, and it is
            why a searched answer can carry a link at all.
          </p>
          <p>
            What it does not fix is the sentence the model then writes about
            those passages. It can overstate, merge two sources, or attach a
            real link to a claim the page never made. So the check is not
            &ldquo;is there a citation&rdquo;. It is &ldquo;does the citation
            say this&rdquo;. Open one link. It takes seconds and it catches the
            failure that survives every other precaution.
          </p>
        </MechanismPanel>
        <Fold title="Watch somebody explain it" note={video.why}>
          <VideoPanel video={video} />
        </Fold>
        <Fold
          title="Go and try this on a real assistant"
          note="Ask the same question twice, one with a tool."
        >
          <PracticeCard
            title="Ask the same question twice"
            watchFor="How similar the two answers look. The guessed one is not vaguer or more hesitant. That is the whole problem. Then open the link on the searched one and check it says what the answer claims."
          >
            <p>
              Pick something that has changed recently in your field: a price, a
              version number, a rule. Ask an assistant with search turned off,
              and keep the answer.
            </p>
            <p>
              Now ask the same question with search on, and ask it to name its
              source.
            </p>
          </PracticeCard>
        </Fold>
      </div>

      <Fold
        title="Check yourself"
        note="Two beats. It marks itself, and nothing is sent anywhere."
      >
        <Check slug={lesson.slug} beats={CHECK} />
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
