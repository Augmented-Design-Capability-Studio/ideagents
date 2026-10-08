# Prototype 8.2: Argue For Your Idea

The sibling of 8.1. Same premise — an idea developed through argument — but
you're **in** the argument instead of judging it.

8.1 casts you as a judge: two agents argue, you rule, your entire input is one
of three verdicts. 8.2 casts you as the idea's advocate: experts raise points
from their own disciplines and you answer them. The path is linear by design —
8.1 explores the space, 8.2 goes deep on one line.

## Running locally

```
npm install
npm run dev
```

Open Prototype 8 on the home page and pick 8.2 (or go to `/prototype8-2/`),
then click Agent and paste a Gemini API key.

## Setup

- **Your idea** — the thing you're defending.
- **Who's in the room** — pick up to five experts from the roster. They take
  turns, so one discipline can't dominate the whole review, and each stays
  inside its own concerns (a manufacturing engineer doesn't make market
  arguments).
- **How you argue** — a few picked traits. Only a hint for the proxy, and
  only matters early; see below.

## The loop

An expert raises one point from their discipline and opens the argument. You
answer, three ways:

- **Pick from suggested replies.** Multi-select; they're drafted in your voice
  and are deliberately different lines of reply rather than three phrasings of
  one.
- **Write your own**, alone or alongside picked points.
- **Let your proxy answer** — see below.

Replying continues the argument; the expert answers back. Once you've replied
at least once you can end it three ways, which are the same three edits as
8.1's outcomes reframed from "a judge ruled" to "you argued":

| | What it does to the idea |
|---|---|
| **Insist** | It goes **further** along the line it's on, and takes the cost |
| **Synthesize** | It **gains** something that holds both your point and theirs |
| **Concede** | It gets **bounded** — constrained, narrowed, or qualified |

The resolve prompt carries 8.1's continuity rules over verbatim: the central
mechanism survives, and introducing one that wasn't there counts as replacing
the idea rather than developing it. The same `carriedForward` / `whatChanged`
pair is reported each time.

## The proxy profile

Three panels in a row: **who you are**, **the argument**, **what came of it**.
The left and right panels hold the two artifacts that evolve in parallel — one
tracks who's designing, the other what's being designed — and both are revised
from the same argument.

The profile has four parts:

| | |
|---|---|
| **How you argue** | Style and register, in a sentence or two |
| **What you optimise for** | What you keep coming back to |
| **Won't give up** | Grows when you **insist** |
| **Negotiable** | Grows when you **concede** or **synthesize** |

How you ended an argument is the strongest signal, which is why the three
endings map onto the last two rows directly. Underneath sits the
self-description you picked at setup, kept visible as the starting point that
observed behaviour then outweighs.

**It revises itself after every argument you finish**, in parallel with the
idea — neither waits on the other. The revision prompt is told to *revise, not
rewrite*: keep what still holds, change only what the new round bears on, and
say plainly when nothing changed. Each revision writes one line about what it
changed, shown at the top of the panel so a change is never silent.

**Everything is editable, and your edits are what it revises from next time** —
the current profile is an input to the next revision, so corrections stick
rather than being overwritten. A turn your proxy wrote is weighted as weaker
evidence than one you wrote yourself.

**The profile is used everywhere**, not just by the proxy:

- **The proxy** writes your turns from it, honouring your commitments — it
  won't give up something the profile says you won't.
- **The talking points** are drafted to sound like your style, so the replies
  offered read like something you'd say.
- **The experts** get it too, and are told to use it to *aim* — to raise the
  point that bites against what you care about and press where you've been
  flexible before. The prompt is explicit that knowing your priorities is a
  reason to test them, not to accommodate them, and that they must never
  mention knowing you. Flattery is the obvious failure of a feature like this;
  the defences are that instruction, a revision prompt told not to flatter, and
  a profile you can see and correct.

## Taking a point up again

Every settled argument in **Argued so far** has a **Take it up again** button.

It is deliberately *not* a rewind. Reopening round 2 and resolving it
differently would invalidate versions 3, 4 and 5 — branching is 8.1's job, and
the whole point of the pair is that this one is linear. So instead the old
objection is **brought forward**: a new round opens with the same expert and
the same consideration, against the idea *as it now stands*.

The expert is given the old transcript and how it ended, and is told to open by
testing whether the change actually addresses the objection — and explicitly
permitted to withdraw it in its own words rather than manufacture a reason to
keep it alive. It can also say which half still stands, or that the change made
things worse.

The original round stays exactly where it was, marked `↩ taken up again later`;
the new one is marked `taken up again` and links back. The trace therefore shows
the idea *circling back*, which is itself the finding — which objections a
designer returns to, and whether their own revisions actually answered them, is
not visible in a transcript that only moves forward.

The round that auto-opened after your last ending is dropped if you hadn't said
anything in it yet. If you *had* started arguing, it stays in the record
unresolved rather than being quietly deleted.

Costs one call, the same as opening any round.

## The idea's sketch

Each version of the idea is sketched in the right panel, **asynchronously** —
the version exists and the next argument can start immediately; the drawing
arrives when it arrives, into a reserved slot so the panel doesn't jump. A
marker-style concept sketch rather than a render, for the same reason as
elsewhere in the suite: it should read as something to think with and not
overclaim precision.

Each version's sketch is conditioned on the previous version's image, so the
series reads as one drawing changing rather than unrelated pictures. The
previous image is read at call time — if that sketch hasn't landed yet, this
one simply goes without the reference rather than waiting, which keeps a slow
image call from stalling the chain.

## Provenance

Every one of your turns is tagged **you wrote this / you picked this / your
proxy**. Picking a model's suggestion is not the same act as having the
thought, and a study that can't tell them apart is measuring the model's
reasoning rather than yours. Typing anything at all alongside picked points
makes the turn count as written.

## Why this variant exists

8.1 studies **selection** — the moment a designer chooses between directions.
8.2 studies **participation** — what happens when they have to articulate and
defend a position.

The risk worth measuring is that it backfires: advocacy is a reliable way to
deepen commitment, so asking someone to argue for their own idea may entrench
it, which runs against the anti-fixation goal of the whole suite. Expect
**Concede to be systematically under-used**. "Let my proxy answer" is the
natural control condition — the same point argued by you versus argued on your
behalf, within one session.

## Call pipeline

| Action | Calls |
|---|---|
| Opening a round | **1** — consideration, the expert's opening, and your first set of talking points together |
| Taking a point up again | **1** — same shape, with the old transcript and ending as context |
| Your reply | **1** — the expert's answer and your next talking points together |
| "Let my proxy answer" | **+1** before the reply call |
| Ending an argument | **1** — the new idea version, **1** to revise the profile, **1** to open the next round |
| Revising the profile | **1**, automatically after each ending (or on demand) |
| Sketching a version | **1**, in the background, never blocking |

Bundling the expert's reply with your next talking points halves the cost per
exchange. The tradeoff is that the same call writes both the argument and the
rebuttals to it, which could soften the argument — worth watching in the
transcripts.

## Known limits

- The experts can't hear each other; each round is a two-person argument.
- No branching. You can take a point up again, but you can't resolve the
  original ending differently and replay from there — that's 8.1's job, and the
  two share a seed so you can run both.
- Debate quality is the same live risk as in 8.1.
