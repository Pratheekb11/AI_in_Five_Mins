# AIinFive

Twenty-five short lessons that let you operate the machinery behind AI instead of reading about it. Six chapters on using it well, three habits to take to work, six on the mechanism underneath, and ten on building the things from scratch.

Each lesson is one game you play before anything is explained, and one figure that moves, a live tokenizer, a decision boundary swinging into place, a threshold sliding through 1,115 real messages, built for someone who keeps hearing *token*, *embedding* and *overfitting* at work and wants a mental model they can actually use.

## The rule this project is built on

**Nothing is simulated.** Every token, vector, weight and probability a learner sees is either computed live in their browser by a real model, or precomputed from a real model or published dataset by a script committed to this repository. Where a figure is precomputed, `data/PROVENANCE.md` records the source, its licence, and the script that produced it. Every lesson ends with the sources it drew on.

If a number can't be traced, it doesn't ship.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build   # production build
npm run lint    # eslint
```

## How it's put together

```
src/
  app/                  routes, home, and one renderer for all eight lessons
  components/
    token-strip/        the spine element: Slug and TokenStrip
    machines/           one interactive per lesson
  lib/
    ink.ts              the four spot inks and what each one means
    lessons.ts          lesson registry, order, timing, status
    tokenizer.ts        real o200k_base BPE, lazy-loaded
data/
  scripts/              generators for everything in public/data
  PROVENANCE.md         source, licence and script for each generated file
```

### Design

The site is styled as a risograph print of a technical manual: flat spot inks, halftone grain, hard rules, and no gradients. The four inks carry fixed meanings across all eight lessons, blue is structure, pink is where the model is looking, yellow is the learner's own input, teal is something resolved, so intuitions built in lesson 3 still read correctly in lesson 8.

The token strip is the same component everywhere. It starts as tokens, then becomes points on a chart, then nodes in a wiring diagram, then probability bars. Watching one object become each concept is the point.

### Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · `gpt-tokenizer` for real BPE · Transformers.js for the opt-in in-browser models.

Progress is kept in `localStorage`. There is no account system and no server; the `useProgress` hook and the lesson content layer are where a backend attaches later.

## Status

Early. The design system, the token strip and the live tokenizer are in place; the eight lessons are being built in order.

## Deploying

```bash
npm run build && npm start          # a Next server, which serves the
                                    # security headers in next.config.ts
STATIC_EXPORT=1 npm run build       # writes out/, for any static host
```

The site has no server-side code, so either works. If you take the static
route, the headers in `next.config.ts` are **not** applied, a static export
has nothing to apply them, and the host has to send them instead, through
`vercel.json`, a Netlify `_headers` file or an nginx block. Skipping that
quietly drops the content security policy, the frame refusal and HSTS.

Set `NEXT_PUBLIC_SITE_URL` once there is a real domain; see `.env.example`.
Regenerate the social card with `node data/scripts/build-og.mjs`.

## Rights

Copyright © Pratheek B. All rights reserved. No licence is granted to copy,
modify, redistribute or host this code or the lesson text.

The material the lessons are built on is a different matter and keeps its own
terms: the SMS Spam Collection, GloVe vectors, Project Gutenberg texts and the
Wikipedia paragraphs each carry their own licence, and each is named with its
source, licence and revision both in `data/PROVENANCE.md` and at the foot of
the page that uses it.

## Privacy

There are no accounts and no database. Progress lives in the reader's own
browser and never leaves it; the analytics are cookieless page counts plus four
events carrying nothing but a lesson slug and a number the site produced. The
`/privacy` page says all of this to a reader in full.
