# Prototype 8.1: Idea Development Game — extensive-form tree

An idea developed as an **extensive-form game tree**. Each node is a
consideration point two agents argue over; you develop the outcomes you want to
explore and mark one as the winner. Every developed branch is kept, so changing
the winner costs nothing and the road not taken stays on screen.

## Running locally

```
npm install
npm run dev
```

Open Prototype 8 on the home page and pick 8.1 (or go to `/prototype8-1/`), click Agent and
paste a Gemini API key. A sample problem and seed idea are pre-filled.

## The mapping

| Game-theory object | Here |
|---|---|
| Node | A consideration point — a perspective, assumption, tension or improvement |
| Players | Proponent, Skeptic, and you as judge |
| Action | Which way the idea develops: Skeptic wins / Synthesis / Proponent wins |
| Path | The idea's development history and accumulated commitments |

There are deliberately **no payoff scores** in this variant. An earlier version
scored every idea state on feasibility, novelty, desirability and robustness
and ran an engine over them; it pulled attention to the numbers and away from
how the idea was developing. The focus here is the tree itself.

## Setup

Radicality and the debater pair are visible **before**
you start, because they shape the very first consideration and debate — there's
no point offering them only once the game is already underway. They stay
editable afterwards, where they apply to everything generated from then on;
nodes already argued keep what they were argued with, which is what makes
switching a setting partway and comparing the two branches a usable move.

## The loop

1. Enter a problem and a seed idea. The model raises the first consideration
   point.
2. Two agents argue it. The **Proponent** defends the most far-reaching
   defensible reading, scaled by the radicality dial. The **Skeptic** speaks as
   a *named stakeholder* — a manufacturing engineer, a safety assessor, a
   service technician — because a disembodied objection is too easy to wave
   away. Both must state **what would change their mind**, which is the single
   requirement that stops the debate collapsing into two symmetrical paragraphs
   of nothing. The same call also returns a **suggested winner** with a
   one-line reason — a neutral judge's read of which argument held up better.
3. Each of the three outcomes — Skeptic wins, Synthesis, Proponent wins — has
   its own card in the panel. **Develop** any of them into a child node, and
   **mark one as the winner**. The two are separate: you can develop all three
   to compare them before deciding, and marking a winner costs no call. The
   suggestion is only ever shown as a tag; it never marks the winner for you.
4. Each developed node carries the idea forward and raises the next thing
   worth arguing about.

## How the idea actually evolves

Each node carries **a complete restatement of the idea**, not a diff. The root
holds the seed verbatim; every child holds a rewritten version.

When you develop an outcome, the model is given: the problem, the whole chain
of previous versions, the current version in full, the consideration point,
both sides' claims and arguments, which side won, and every consideration
already raised on that path. It returns a new self-contained idea state, a
one-line summary of it, a note on what the move committed to and closed off,
and the next consideration point.

**The hard constraint is continuity.** The child must be recognisably the same
idea as the parent — the central mechanism carries forward unless the move is
specifically about that mechanism. If the model introduces a mechanism that
wasn't in the parent, it has replaced the idea rather than developed it, and
the tree stops meaning anything. The prompt carries a worked example of exactly
this failure:

> Previous: "Enlarge the side glazing and slim the front seat backs."
> **Wrong:** "Add a glass panel that scoops light from the windshield down into
> the back." — the glazing and the seat backs have vanished.
> **Right** (Skeptic won on "thin seats feel unsafe"): "Enlarge the side
> glazing, and slim only the upper third of the front seat backs, keeping a
> visible structural shoulder." — same two moves, one of them bounded.

The three outcomes travel in different directions, but all keep the mechanism:

- **Proponent wins** — the idea goes **further** along the line it's already
  on. Commit harder, take on what it costs.
- **Skeptic wins** — the idea gets **bounded**. Constrain how far the move
  goes, narrow where it applies, add something that answers the objection, or
  accept a cost elsewhere to keep it. Never abandon the move, never swap in a
  different one.
- **Synthesis** — the idea **gains** something that lets it hold the
  Proponent's reach and the Skeptic's constraint at once, without splitting
  the difference into something limp.

High radicality means push *this* idea further, not pick a wilder idea.

Each node also reports **`carriedForward`** — what from the previous version is
still true — written *before* `whatChanged` so the model has to commit to
continuity first. If it can't name anything substantial that survived, it has
replaced the idea, and the prompt tells it to rewrite the state closer to the
parent. Both fields show in the panel, continuity in green and change in
violet, so a branch that has quietly become a different idea is visible rather
than silent.

**The failure mode to watch** is drift. Because each node rewrites the whole
idea rather than patching it, a commitment made three moves back can quietly
evaporate. The mitigation is that the developer sees the entire chain of
versions and is told to keep earlier commitments unless this move explicitly
overturns one — and to say so in `whatChanged` if it does. Showing the idea on
every node is partly so that drift is visible rather than buried in a panel.

## Sketches

Each node has a **Sketch this idea** button in the panel. It asks the image
model for a loose marker-style concept sketch of that node's idea state —
deliberately a sketch rather than a render, so it reads as something to think
with and doesn't overclaim precision.

When the parent already has a sketch, it's passed in as the input image with
an instruction to keep the same subject, viewpoint and style and change only
what the description says is different. So sketching down a branch produces
**one drawing evolving**, not a set of unrelated pictures — the visual
counterpart of the continuity rule in the develop prompt.

**Sketch every node automatically** is on by default (a checkbox in Setup turns
it off). The queue runs **entirely beside** the develop/debate pipeline —
nodes and their arguments never wait on a drawing — and up to three drawings
can be in flight at once. The queue is declarative, watching for nodes that
lack a sketch, which means it picks up nodes however they were made: the root,
the `+` button, or auto-play.

The one ordering rule is that a node only becomes eligible once its parent has
*settled* — has an image, or has failed to get one. A child's sketch is
conditioned on its parent's image to keep a branch visually continuous, and
without the failure case a parent whose sketch errored would strand its entire
subtree.

Nodes appear immediately and the drawing fills in. The thumbnail slot is
**reserved while the sketch is still coming back**, showing a dashed
placeholder and a spinner — if the slot only appeared when the image landed,
the node would change height and reflow the whole tree underneath it.

Nodes without a sketch stay compact, since node height is computed per node.

The image model is chosen in the Agent dialog (shared with prototype 6, which
uses the same plumbing).

## Auto-play

**Auto-play ×3**, in the tree's title bar, develops three plies down from the
**selected** node. At each ply it tries outcomes in order — the winner you
marked, else the debate's suggested winner, then the rest (synthesis first) —
and takes the first one *that hasn't been developed yet*, so every ply creates
a node from where you are rather than walking down branches that already
exist. If all three outcomes already exist it follows the top pick. Auto-play
never marks winners; that stays your call.

Each new node is debated before the next ply, so auto-play leaves every node
argued rather than a bare leaf at the end.

## The call pipeline

Two calls per node, and nothing is ever recomputed.

| Action | Calls |
|---|---|
| Start a game | **2** — root consideration, then its debate |
| `+` on a node, or one auto-play ply | **2** — develop the child, then debate it |
| "Develop this outcome" in the panel | **1** now, +1 when you open that child |
| Selecting any node, marking a winner, switching branches | **0** |
| Sketching a node | **1** — automatic by default, or on demand if you turn that off |

The two calls per node are necessarily sequential: the debate needs the
consideration the develop call produces.

They could be merged into one — develop the child *and* stage its debate in a
single response — halving the cost. That's deliberately not done, for two
reasons. A single response carrying idea state, summary, what-changed, next
consideration *and* a two-sided debate degrades all of them. And more importantly it would lock the debater pair at development
time, breaking the ability to develop a node, change "who is arguing", and
re-argue the same consideration from a different lens.

Debates are cached on the node, so returning to a branch, flipping the winner
back and forth, or comparing abandoned branches is free.

## Two things that make it cheap to change your mind

**Branches are kept.** Developing an outcome never replaces a sibling. If you
marked the Proponent as winner, developed that branch, then changed your mind,
the Proponent branch stays — dimmed, still clickable, still developable.
Switching back costs no model calls.

**Develop from anywhere.** Every node has a `+` on its bottom-right corner that
develops its winner (or the suggested winner if you haven't marked one), and
the panel has a per-outcome button that either develops that outcome or jumps
to the branch if it already exists. You can grow a branch that didn't win
deliberately — that's often the point.

## Who is arguing

Letting the model invent a stakeholder each time produced speakers that felt
arbitrary and drifted between nodes. Instead you pick a **pair** up front —
Designer vs Manufacturing engineer, User advocate vs Business owner, Futurist
vs Pragmatist, and so on, or "let the model choose" for the old behaviour. The
pair is passed into the debate prompt as assigned roles, and each side is told
to stay inside its own concerns.

It applies to debates generated from then on; nodes already argued keep their
speakers. So switching pairs partway through is a way to re-argue the same
idea from a different lens and compare the two branches side by side.

## The canvas

The tree grows downward on a pannable, zoomable canvas: drag the background to
move, scroll to zoom (or use the −/+ buttons), **Recenter** to return to the
root. The view centres on the root when a game starts but never re-centres on
its own afterwards. Node titles wrap and are shown in full rather than
truncated.

**Rows size to their tallest node** rather than using a fixed pitch. Node
height varies a lot — a sketched node is around 90px taller than an un-sketched
one — and a uniform pitch made tall nodes collide with the row below.

**Dragging a node** nudges that node only; its children stay put and the edges
stretch, so nothing is detached and the structure is untouched. Drag deltas are
divided by the zoom level so a node keeps up with the cursor at any scale.
Recenter clears every nudge, so there's always a way back to the clean laid-out
tree.

A nudge is an offset *from where the layout put a node*, so it only means
anything while that base position holds. Developing a new outcome re-flows the
tree, and a nudge is dropped the moment the layout moves its node — otherwise
nudged nodes stay pinned while everything reflows around them and the new node
lands on top of one. Nudges on nodes the layout left alone survive.

**The canvas glides to a node** when you hit "Go to branch", develop a new one,
or auto-play — otherwise the tree keeps growing off the bottom of the viewport
and you lose it.

**The selected node** gets a halo, a drop shadow, a heavier border and a
one-shot pop, and is painted last so it sits above anything it overlaps. A
border alone was too easy to lose on a busy canvas.

Edges are **coloured by outcome** — red for the Skeptic, green for the
Proponent, violet for a synthesis — matching the two debate cards in the
panel. Synthesis gets its own colour rather than a blend, because holding both
positions is a distinct move and not a halfway house. Until you mark a winner
every edge is solid; once you do, the winner's edge is heavier and starred and
the other developed cases go dashed and faded, but stay there.

Each node has **three output dots** on its bottom edge, one per outcome, in the
same left-to-right order the layout places the children, and each connector
starts from its outcome's dot so they fan out without crossing. A filled dot
means that case is developed, a hollow one that it's still open; the winner's
dot is larger.

A note for anyone extending this: panning deliberately tracks pointer moves on
`window` rather than using `setPointerCapture`. Capturing the pointer on the
`<svg>` retargets the following `click` to the capture element, which silently
swallows every click on the nodes inside it.

## Pushing toward radical

The radicality dial sets how deep each consideration cuts and how far the
Proponent pushes. High radicality means push *this* idea further, not swap in a
wilder one.

## Known limits

- **Debate theatre** is the main risk. The named-stakeholder requirement and
  the forced falsifier are the mitigations; if the debates still read as bland,
  that's the first thing to tune in `prompts/debate-system.txt`.
- **The suggested winner is one model's opinion.** It's there to break the
  blank-page moment and to steer `+` and auto-play, not to stand in for your
  judgement — which is why it never marks the winner itself.
- **Cost grows with the tree.** See the pipeline below. Expansion is on demand
  and auto-play is capped at three plies.
- **The tree metaphor quietly implies design decisions are sequential and
  independent**, which they aren't. A real design commitment constrains later
  ones in ways a tree doesn't capture; `whatChanged` on each node is a partial
  answer, not a fix.
