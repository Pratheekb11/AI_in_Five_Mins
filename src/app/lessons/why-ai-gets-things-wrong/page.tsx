import { FailureBench } from "@/components/games/FailureBench";
import { OneFaultFigure } from "@/components/machines/OneFaultFigure";
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

const lesson = getLesson("why-ai-gets-things-wrong")!;
const video = videoFor("why-ai-gets-things-wrong")!;

export const metadata = {
  title: lesson.title,
  description: lesson.standfirst,
};

const SOURCES: Source[] = [
  {
    title: "DistilGPT-2",
    publisher: "Hugging Face",
    url: "https://huggingface.co/distilbert/distilgpt2",
    used: "The model behind the fabrication and certainty specimens. Its recorded next-token probabilities are weighed live on the bench.",
    licence: "Apache 2.0",
  },
  {
    title: "GloVe: Global Vectors for Word Representation",
    publisher: "Pennington, Socher & Manning, Stanford NLP",
    url: "https://nlp.stanford.edu/projects/glove/",
    used: "The word vectors behind the inheritance specimens. 6 billion words of Wikipedia 2014 and Gigaword 5. Every distance on the bench is a cosine between two of these.",
    licence: "Public Domain Dedication and Licence v1.0",
  },
  {
    title: "Why Language Models Hallucinate",
    publisher: "Kalai, Nachum, Vempala & Zhang (arXiv:2509.04664, 2025)",
    url: "https://arxiv.org/abs/2509.04664",
    used: "The argument that confident invention is not a bug in the training but a consequence of it: a guess scores better than an admission of not knowing.",
  },
  {
    title:
      "Man is to Computer Programmer as Woman is to Homemaker? Debiasing Word Embeddings",
    publisher:
      "Bolukbasi, Chang, Zou, Saligrama & Kalai (arXiv:1607.06520, 2016)",
    url: "https://arxiv.org/abs/1607.06520",
    used: "The first careful measurement of occupational associations in word vectors, and of how hard they are to remove once they are there.",
  },
  {
    title:
      "Semantics derived automatically from language corpora contain human-like biases",
    publisher: "Caliskan, Bryson & Narayanan (arXiv:1608.07187, 2016)",
    url: "https://arxiv.org/abs/1608.07187",
    used: "The finding that these associations track the text rather than the world. That is why the bench frames every one of them as a measurement of a corpus.",
  },
  {
    title: "Lost in the Middle: How Language Models Use Long Contexts",
    publisher:
      "Liu, Lin, Hewitt, Paranjape, Bevilacqua, Petroni & Liang (arXiv:2307.03172, 2023)",
    url: "https://arxiv.org/abs/2307.03172",
    used: "The measurement behind the forgetting panel: material in the middle of a long context is used least well.",
  },
];

const STEPS: Step[] = [
  {
    say: "People talk about these three as three separate faults. Making things up. Sounding certain when it is wrong. Carrying prejudice. Three bugs, three fixes, three teams working on it.",
  },
  {
    say: "They are one fault. The thing was fitted to text. Not to the world, not to the truth, not to anybody's values. To text. Everything you just weighed follows from that one fact.",
    caption:
      "Which is why they cannot be patched out one at a time. There is no true-or-false module to repair.",
  },
  {
    say: "Watch it in the Paris specimen. Asked for the capital of France, thirty per cent of its weight went on the word 'the' and under two per cent on France. It is not answering a question. It is continuing a sentence, and 'the capital of the …' is a commoner shape in text than the fact is.",
  },
  {
    say: "Then certainty. It was measurably more certain about the prompt it gets wrong than about 'Once upon a', which it gets right. Certainty is about its own guesses about text. Nothing in it is a measure of being right, and none of it reaches you anyway. Both come out as a plain sentence.",
  },
  {
    say: "And the vectors. Nurse sits nearer 'she' and engineer nearer 'he', in six billion words of news and encyclopedia. That is not the model holding an opinion. It is a distance, and it got there because of how the text talked. That is exactly what makes it hard to remove. There is nothing to argue with.",
  },
  {
    say: "But notice what 'secretary' did. It leaned the other way, because half that corpus is newswire and in newswire a secretary is a Secretary of State. The measurement is of a particular pile of text. Change the pile and you change the answer. Anyone who tells you these systems are biased, full stop, without saying what they were trained on, is not measuring anything.",
  },
];

const QUESTIONS: QuizQuestion[] = [
  {
    prompt:
      "The vectors put 'secretary' nearer 'he' than 'she'. What does that show?",
    options: [
      "That the vectors are unbiased after all, and that what you just saw was an error in the measurement itself",
      "That the measurement is of a specific corpus, half of it newswire where 'Secretary of State' is common, and not a fact about the job",
      "That the extraction itself is faulty, and an extraction done correctly would not have produced a result anything like this",
    ],
    answer: 1,
    because:
      "Every one of these numbers is a property of a pile of text. That is what makes the finding real and what limits it: change the text and the number changes. A claim about a model's bias with no account of its training data is not a measurement.",
  },
];

export default function WhyAiGetsThingsWrongLesson() {
  return (
    <LessonShell lesson={lesson} sources={SOURCES}>
      <Hook
        claim={
          <>
            Three famous failures. <span className="text-pink-text">One</span>{" "}
            cause, and you can weigh it.
          </>
        }
        sting="Making things up, sounding sure while wrong, carrying the biases of its training text. All three are treated everywhere as separate bugs. Put them on a balance and they turn out to be the same fact three times over. Every weight below is measured when you press the button, from data already on this site."
        cta="Load the bench"
      />

      <div className="py-4">
        <FailureBench />
      </div>

      <div className="pb-4">
        <Walkthrough steps={STEPS} figure={<OneFaultFigure />} />
      </div>

      <DeeperRow video={video}>
        <MechanismPanel
          question="What about forgetting? That is the failure I actually hit."
          summary="Different mechanism, and the one failure here with a hard limit behind it: everything has to fit in a fixed window."
          deeper="context-is-everything"
        >
          <p>
            Forgetting is not a lapse. The model sees a fixed number of tokens
            and no more, and when a conversation outgrows that window the oldest
            material is simply not there any longer. It does not know it is
            missing, because there is nothing in the machine that could notice.
          </p>
          <p>
            Worse, material inside the window is not used evenly. Liu and
            colleagues measured performance against where a needed fact sat in a
            long context and found it lowest when the fact was in the middle The
            ends of the context are used best. So &ldquo;I gave it the
            document&rdquo; is not the same as &ldquo;it used the
            document&rdquo;.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="Why cannot they just train the confidence out of it?"
          summary="Because the training rewards a confident guess and punishes an admission of not knowing."
          deeper="how-llms-answer"
        >
          <p>
            Kalai and colleagues make the argument plainly: if a model is graded
            on how often it is right, then on a question it is unsure about, a
            guess scores something and &ldquo;I do not know&rdquo; scores zero.
            Over millions of graded examples that pressure only points one way.
          </p>
          <p>
            So the fluent, assured, wrong answer is not the model
            malfunctioning. It is the model doing exactly what it was rewarded
            for. Which means the fix is not a better model so much as a habit on
            your side: treat confident phrasing as carrying no information,
            because it does not.
          </p>
        </MechanismPanel>

        <MechanismPanel
          question="If the bias is in the numbers, can it be subtracted out?"
          summary="People have tried. It moves rather than leaves."
          deeper="embeddings"
        >
          <p>
            Bolukbasi and colleagues tried exactly that on vectors like the ones
            on the bench. Find the direction that encodes the association, and
            project it away. It works on the words you thought of. The
            association survives elsewhere in the geometry, because it is not
            stored in one place; it is distributed across how every word relates
            to every other.
          </p>
          <p>
            The honest position is the one the bench takes. These are measured
            properties of a specific pile of text, they are real, they are
            reported with the corpus named, and they are not evidence about the
            people the words describe.
          </p>
        </MechanismPanel>
        <PracticeCard
          title="Find your own Paris"
          watchFor="Whether the wrong answer arrives in a different tone from the right ones. It will not. That sameness is the thing worth remembering. You cannot hear the difference, so you have to check instead of listen."
        >
          <p>
            Ask an assistant something narrow and checkable from your own field
            A specific figure, a date, a clause number. Something you know cold
            and a general model would have read very little about.
          </p>
          <p>
            Ask it three times in fresh chats, then check each answer against
            the real source.
          </p>
        </PracticeCard>
      </DeeperRow>

      <div className="py-10">
        <h2 className="display-lg mb-5">Check yourself</h2>
        <Quiz slug={lesson.slug} questions={QUESTIONS} />
      </div>
    </LessonShell>
  );
}
