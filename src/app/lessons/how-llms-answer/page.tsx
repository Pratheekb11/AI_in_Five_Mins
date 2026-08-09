import { Plinko } from "@/components/games/Plinko";
import { TemperaturePairFigure } from "@/components/machines/TemperaturePairFigure";
import { DeeperRow } from "@/components/lesson/DeeperRow";
import { Hook } from "@/components/lesson/Hook";
import { LessonShell } from "@/components/lesson/LessonShell";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Quiz, type QuizQuestion } from "@/components/lesson/Quiz";
import { Walkthrough, type Step } from "@/components/lesson/Walkthrough";
import { getLesson } from "@/lib/lessons";
import type { Source } from "@/lib/sources";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("how-llms-answer")!;
const video = videoFor("how-llms-answer")!;

export const metadata = lessonMetadata(lesson);

const SOURCES: Source[] = [
  {
    title: "DistilGPT-2",
    publisher: "Hugging Face",
    url: "https://huggingface.co/distilbert/distilgpt2",
    used: "The model whose real next-token probabilities are on this page. Every percentage in the game is its own output, recorded rather than illustrated.",
    licence: "Apache 2.0",
  },
  {
    title: "The Curious Case of Neural Text Degeneration",
    publisher: "Holtzman, Buys, Du, Forbes & Choi (arXiv:1904.09751, 2019)",
    url: "https://arxiv.org/abs/1904.09751",
    used: "Why always taking the most likely token produces flat, repetitive text, and where sampling settings came from.",
  },
  {
    title: "Why Language Models Hallucinate",
    publisher: "Kalai, Nachum, Vempala & Zhang (arXiv:2509.04664, 2025)",
    url: "https://arxiv.org/abs/2509.04664",
    used: "The account of why nothing in this loop checks anything: the training rewards a confident guess over an admission of uncertainty.",
  },
  {
    title: "Large Language Models explained briefly",
    publisher: "3Blue1Brown",
    url: "https://www.youtube.com/watch?v=LPZh9BOjkQs",
    used: "The same loop, end to end, in a few minutes and without the maths.",
  },
];

const STEPS: Step[] = [
  {
    say: "Here is the entire operation. The model reads everything so far, produces a score for every one of fifty thousand possible next tokens, picks one, adds it to the text, and starts again.",
  },
  {
    say: "The scores you were playing with are real. Put the two side by side. Give it the opening of Genesis and one token takes ninety-nine per cent. Give it Once upon a and the most likely token is at seven per cent. Same model, and far less certain than a person would be.",
    caption:
      "Both measured from the same model, on this page, with nothing rounded for effect.",
  },
  {
    say: "Temperature is the only dial in that loop, and it does not know anything. Turn it cold and watch: nothing happens on the left, because there was nothing left to sharpen. On the right it throws almost everything onto one token.",
  },
  {
    say: "Now turn it hot. The weight spreads into the tail on both sides. Which is why you cannot ask for creative and reliable at the same time: those are the same dial pointing in opposite directions, and every assistant you use has already chosen a compromise for you.",
  },
  {
    say: "And notice the thing that is missing from all of it. Nowhere in that loop is there a step that checks anything against the world. Look at the Paris prompt: the model puts thirty per cent on 'the' and under two per cent on 'France'. It is continuing a sentence, not answering a question.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "Where in this loop does the model check whether something is true?",
    options: [
      "Just before it picks the token",
      "At the end, before returning the answer",
      "Nowhere. There is no such step",
    ],
    answer: 2,
    because:
      "Score every token, pick one, repeat. That is the whole loop. Nothing consults a source unless the model has been given a tool that does, which is why 'Paris is the capital of' continues with 'the' rather than 'France'.",
  },
];

export default function HowLlmsAnswerLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            It does not choose a word. It{" "}
            <span className="text-yellow-text">rolls loaded dice</span>, fifty
            thousand sides, once per token.
          </>
        }
        sting="These are a real model's real odds, recorded and printed unrounded. You get one control, the dial that loads the dice, and a target to hit. Finding out that you cannot have both reliable and surprising is the point of the round."
        cta="Load the odds"
      />

      <div className="py-4">
        <Plinko />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<TemperaturePairFigure />} />
      </div>

      <DeeperRow video={video}>
        <MechanismPanel
          question="Why not always take the most likely token?"
          summary="Because the result is flat, repetitive text. That was measured, and it is why sampling exists at all."
          deeper="what-an-llm-is"
        >
          <p>
            Taking the top token every time is called greedy decoding, and it
            sounds like it should be the best possible strategy. Holtzman and
            colleagues showed it is not: the output degenerates, loops and
            repeats itself, because the most likely continuation of a likely
            continuation is likelier still, and the text collapses into a
            groove.
          </p>
          <p>
            So real systems sample instead, and usually cut off the long tail
            first. Only the tokens that make up the top slice of probability are
            eligible at all. The dial in the game is the simple version of that
            machinery.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="So why does the same question give me different answers?"
          summary="Because a token is drawn, not chosen. Run it twice and you drew twice."
          deeper="where-it-breaks"
        >
          <p>
            Any temperature above zero means the reply is one sample from a
            distribution, not the distribution itself. Two runs of the same
            prompt are two rolls of the same dice. Once an early token differs,
            everything after it is built on that difference, so the answers can
            diverge completely.
          </p>
          <p>
            There is a practical habit in that. If an answer matters, ask twice
            in separate chats and compare. Where the two agree, the model was
            confident. Where they diverge is exactly where it was guessing, and
            that is the cheapest uncertainty signal you will ever get out of one
            of these systems.
          </p>
        </MechanismPanel>
        <PracticeCard
          title="Ask the same question in three fresh chats"
          watchFor="Which parts come back identical and which parts move. The stable parts are where the model is confident; the parts that change every time are the parts you need to check yourself."
        >
          <p>
            Take a question from your own work with a factual answer. Ask it in
            three separate new chats. New chats, not follow-ups, so that each
            one starts from the same context.
          </p>
          <p>Line the three answers up and mark everything that differs.</p>
        </PracticeCard>
      </DeeperRow>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </div>
    </LessonShell>
  );
}
