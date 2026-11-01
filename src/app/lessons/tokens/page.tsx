import { VideoPanel } from "@/components/lesson/VideoPanel";
import { Fold, LessonStageShell, type Beat } from "@/components/lesson/stage";
import { MechanismPanel } from "@/components/lesson/MechanismPanel";
import { PracticeCard } from "@/components/lesson/PracticeCard";
import { Check } from "@/components/lesson/checks/Check";
import { ChunkReel } from "@/components/machines/ChunkReel";
import { TokenChopper } from "@/components/games/TokenChopper";
import { MergeReel } from "@/components/machines/MergeReel";
import { TokenStrip } from "@/components/token-strip/TokenStrip";
import type { CheckBeat } from "@/lib/check";
import { getLesson } from "@/lib/lessons";
import { MERGES, numberSplit, traceFor } from "@/lib/merges";
import type { Source } from "@/lib/sources";
import { TOKEN_EXAMPLES } from "@/lib/tokenExamples";
import { videoFor } from "@/lib/videos";
import { lessonMetadata } from "@/lib/metadata";

const lesson = getLesson("tokens")!;
const video = videoFor("tokens")!;

export const metadata = lessonMetadata(lesson);

const strawberry = TOKEN_EXAMPLES.curiosities.find(
  (c) => c.id === "strawberry",
)!;
const spaced = TOKEN_EXAMPLES.curiosities.find(
  (c) => c.id === "strawberry-spaced",
)!;

/* Everything quoted in the prose below is read out of the generated data rather
   than typed into the sentence, so a regenerated table cannot leave the text
   claiming something the figures no longer show. */
const bare = traceFor("strawberry");
const withSpace = traceFor(" strawberry");
const unbelievable = traceFor("unbelievable");
const rare = traceFor("Ashwatthama");
const million = numberSplit("1000000");
const pi = numberSplit("3141592");
const year = numberSplit("2024");

const english = TOKEN_EXAMPLES.multilingual.find(
  (r) => r.language === "English",
)!;
const hindi = TOKEN_EXAMPLES.multilingual.find((r) => r.language === "Hindi")!;

const SOURCES: Source[] = [
  {
    title: "tiktoken, the BPE tokeniser for OpenAI models",
    publisher: "OpenAI",
    url: "https://github.com/openai/tiktoken",
    used: "The o200k_base encoding behind every split, token id, merge and score on this page.",
    licence: "MIT",
  },
  {
    title: "gpt-tokenizer",
    publisher: "Bane Sesevic",
    url: "https://github.com/niieani/gpt-tokenizer",
    used: "The JavaScript port that runs the tokenizer in your browser, and the published rank table the merge replay is driven from.",
    licence: "MIT",
  },
  {
    title: "Neural Machine Translation of Rare Words with Subword Units",
    publisher: "Sennrich, Haddow & Birch (ACL 2016)",
    url: "https://aclanthology.org/P16-1162/",
    used: "The paper that introduced byte-pair encoding for language models. It is the algorithm replayed in the figure.",
  },
  {
    title: "Language Model Tokenizers Introduce Unfairness Between Languages",
    publisher: "Petrov, La Malfa, Torr & Bibi (NeurIPS 2023)",
    url: "https://arxiv.org/abs/2305.15425",
    used: "Independent measurement of the language cost gap shown in the chart.",
  },
];

const CHECK: CheckBeat[] = [
  {
    kind: "match",
    prompt:
      "Pair each piece of text with the way the tokenizer actually cuts it.",
    pairs: [
      {
        left: `"${strawberry.text}"`,
        right: strawberry.tokens.map((t) => t.text).join(" | "),
      },
      {
        left: `"${spaced.text}"`,
        right:
          spaced.tokens.map((t) => t.text.trim()).join(" | ") +
          " (one token, space and all)",
      },
      { left: '"unbelievable"', right: unbelievable.final.join(" | ") },
      { left: '"1000000"', right: million.pieces.join(" | ") },
    ],
    because:
      "Every split above is o200k_base doing its job, not an illustration of it. Notice what the pairs have in common. Nothing lines up with syllables, meaning or place value. The chunks are whatever turned out to be common in the text the vocabulary was built from. That is also why the same word costs a different amount depending on whether a space came first.",
  },
  {
    kind: "choice",
    prompt:
      "The same sentence in English or in Hindi. Which costs more to send?",
    options: [
      "English, because its words are longer on the page",
      `Hindi, by roughly ${(hindi.tokenCount / english.tokenCount).toFixed(1)} times`,
      "They cost the same, since the sentence means the same thing either way",
    ],
    answer: 1,
    because: `Measured above: ${english.tokenCount} tokens against ${hindi.tokenCount}. Merge tables are built mostly from English, so other scripts get chopped much finer.`,
  },
];

export default function TokensLesson() {
  const beats: Beat[] = [
    {
      id: "game",
      cta: "How it works",
      node: (
        <div className="space-y-4">
          <h1 className="display-md">
            AI does not read letters. It reads{" "}
            <span className="text-pink-text">chunks</span>.
          </h1>
          <TokenChopper />
        </div>
      ),
    },
    {
      id: "how",
      cta: "Got it",
      node: (
        <div className="mx-auto max-w-2xl space-y-4">
          <h2 className="display-md">Why it cannot count the r&rsquo;s</h2>
          <ChunkReel
            word={strawberry.text}
            chunks={strawberry.tokens.map((t) => t.text)}
            hidden="r"
            rows={[
              {
                language: english.language,
                chunks: english.tokens.map((t) => t.text),
              },
              {
                language: hindi.language,
                chunks: hindi.tokens.map((t) => t.text),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const tail = (
    <>
      <div data-section="deeper" className="space-y-4">
        <Fold
          title="Where do the chunks come from?"
          note="Nobody chose them. They were counted into existence."
        >
          <div className="space-y-6">
            <div className="prose-measure text-ink-soft space-y-4 text-lg">
              <p>
                A model has a fixed vocabulary. The encoding used here has{" "}
                {MERGES.vocabularySize.toLocaleString("en-US")} entries, and
                every piece of text you send has to be expressed in them. That
                vocabulary was not written by linguists. It was <em>grown</em>,
                by an algorithm with no notion of words, prefixes or meaning.
              </p>
              <p>
                It starts with raw bytes: no words, not even letters, just{" "}
                {bare.bytes} separate things for a {bare.bytes}-letter word.
                Then it repeats one move. Find the pair of neighbours that
                occurs most often across the whole training corpus, and glue it
                into a single new entry. Do that a couple of hundred thousand
                times and the frequent chunks of English end up as single units.
                Everything rare stays in fragments.
              </p>
            </div>
            <MergeReel />
            <div className="prose-measure text-ink-soft mt-6 space-y-4">
              <p>
                Watch <span className="font-data">unbelievable</span> in
                particular. A human would cut it{" "}
                <span className="font-data">un·believ·able</span>. The tokenizer
                produces{" "}
                <span className="font-data">
                  {unbelievable.final.join("\u00b7")}
                </span>
                , because{" "}
                <span className="font-data">{unbelievable.final[1]}</span>{" "}
                happened to be commoner than the meaningful piece. The split is
                a frequency accident, and the model has to work from it anyway.
              </p>
              <p>
                And <span className="font-data">{rare.word}</span> shatters into{" "}
                {rare.final.length} pieces. Nothing about that name was common
                enough to be worth an entry, so it arrives as debris. Rare
                names, technical terms, new coinages and most of the
                world&rsquo;s languages all arrive this way.
              </p>
            </div>
          </div>
        </Fold>
        <Fold
          title="Three surprises: spaces, numbers, languages"
          note="The same word can cost three times as much."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="plate p-5">
              <p className="label text-ink-faint mb-3">1. The leading space</p>
              <div className="mb-3">
                <TokenStrip
                  items={withSpace.final.map((t) => ({ text: t, ink: "teal" }))}
                  size="md"
                />
              </div>
              <p className="text-ink-soft text-[0.9375rem]">
                <span className="font-data">strawberry</span> costs{" "}
                {bare.final.length} tokens. A <em>space</em> then the same word
                costs {withSpace.final.length}. The space is part of the token
                after it, so the word mid-sentence and the word at the start are
                different objects to the model.
              </p>
            </div>

            <div className="plate p-5">
              <p className="label text-ink-faint mb-3">2. Numbers</p>
              <div className="mb-3 space-y-1.5">
                {[year, pi, million].map((n) => (
                  <div key={n.text} className="flex items-center gap-2">
                    <span className="font-data text-ink-faint w-20 shrink-0 text-sm">
                      {n.text}
                    </span>
                    <TokenStrip
                      items={n.pieces.map((piece) => ({
                        text: piece,
                        ink: "pink",
                      }))}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-ink-soft text-[0.9375rem]">
                Digit runs are cut into groups of at most three, then merged by
                frequency. A million arrives as{" "}
                <span className="font-data">{million.pieces.join("|")}</span>.
                The boundaries have nothing to do with place value.
              </p>
            </div>

            <div className="plate p-5">
              <p className="label text-ink-faint mb-3">3. Your language</p>
              <p className="data mb-2 text-3xl font-bold">
                {(hindi.tokenCount / english.tokenCount).toFixed(1)}&times;
              </p>
              <p className="text-ink-soft text-[0.9375rem]">
                The same sentence costs {english.tokenCount} tokens in English
                and {hindi.tokenCount} in Hindi. You pay per token, your context
                fills per token, and you wait per token. So the same
                conversation is measurably more expensive in most of the
                world&rsquo;s languages.
              </p>
            </div>
          </div>
        </Fold>
        <MechanismPanel
          question="If the split is this crude, how does it ever work?"
          summary="Because the model never needed the letters. It needed something it could count, and chunks are countable."
          deeper="what-an-llm-is"
        >
          <p>
            A tokenizer is not trying to understand the word. It is trying to
            turn unlimited text into a finite alphabet the model can do
            arithmetic on, without ever failing on an input it has not seen.
            Byte-pair encoding does that with one guarantee: since it starts
            from raw bytes, <em>any</em> string can be expressed, worst case one
            token per byte. Emoji, code, a language the model has never met, a
            password. All of it can be represented.
          </p>
          <p>
            The price is that the chunks carry no promise of meaning. Whatever
            structure a word has, the model has to reconstruct from the pieces
            it was handed, using what usually follows what. It mostly manages.
            Where it does not, the failure looks stupid rather than subtle:
            counting letters, spelling backwards, rhyming, and arithmetic on
            long numbers.
          </p>
        </MechanismPanel>
        <MechanismPanel
          question="Why does the same word cost different amounts in different places?"
          summary="Because the token depends on what sits next to it. Spacing, capitals and punctuation all change the split."
          deeper="context-is-everything"
        >
          <p>
            The merge loop runs over the text as written, so anything that
            changes the neighbours changes the outcome.{" "}
            <span className="font-data">strawberry</span>,{" "}
            <span className="font-data">&nbsp;strawberry</span>,{" "}
            <span className="font-data">Strawberry</span> and{" "}
            <span className="font-data">STRAWBERRY</span> are four different
            sequences of ids, not four forms of one word. The model learns to
            treat them similarly because they appear in similar places, not
            because anything told it they were related.
          </p>
          <p>
            This is also why the same paragraph can cost noticeably more after a
            reformat, and why stripping a trailing space from a prompt sometimes
            changes an answer. Nothing mystical is happening. A different split
            is a different input.
          </p>
        </MechanismPanel>
        <Fold title="Watch somebody explain it" note={video.why}>
          <VideoPanel video={video} />
        </Fold>
        <Fold
          title="Go and try this on a real assistant"
          note="Two questions, and it contradicts itself between them."
        >
          <PracticeCard
            title="Make an assistant contradict itself about spelling"
            watchFor="That the confident wrong answer and the correct one arrive in the same tone. Nothing in how it writes tells you which one you are looking at. That is the habit worth taking away, and it is what the next chapters are about."
          >
            <p>
              Ask any assistant: <em>how many r&rsquo;s are in strawberry?</em>{" "}
              Then ask it to spell the word out one letter at a time, numbering
              each, and count again.
            </p>
            <p>
              Most will get it wrong the first way and right the second. Forcing
              the letters onto separate lines forces them into separate tokens.
              You have handed it the thing the tokenizer took away.
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
