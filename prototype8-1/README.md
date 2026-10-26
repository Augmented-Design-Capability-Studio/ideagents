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

## Demo tree

**Load demo tree** loads a pre-built tree with no API key and no calls: the
**Targa roof**. The fixed steel bar has to stay, and the original idea is
already to **tuck the roof away under the rear glass** — so every debate is
about *how*. Three approaches grow from it:

- **Lift the glass and fold the roof back over the bar** — how today's Targa
  actually works, but **staged to dead-end early**: the roof's linkage arms
  have to swing through the fixed bar, and nothing the model knows gets a
  mechanism through a fixed structure.
- **Keep the glass fixed, slide the roof under it on rails** — argued down
  through split and telescoping panels and a curved rail until it goes in
  circles; its side branches drift (only half the roof opens) or dead-end
  (adults no longer fit in the back).
- **Drop the glass down into the body** — dead-ends on well depth, a split
  glass and engine access, or drifts into a raised rear.

### The staged dead end: expertise from another field reaches what the model couldn't

On the staged node the **`+` pulses**, and a **demo hint** card sits beside
the node — dashed amber and labelled as a demo cue, deliberately apart from the
product UI (the `+` pop-up itself carries no hint). It says the debate stalled
there and offers an example of what the designer might know **from another
field** — deliberately not about roofs, to show analogous thinking: an engineer
who worked on aircraft landing gear, where the airframe never moves for the gear
and only the fairing doors over the bay open to let the leg through. Could the
bar work the same way? **Try it** opens the `+` pop-up pre-filled with it
(still editable); ✕ dismisses the card. Then **Add & keep going**. (**Keep
going anyway** on that node opens the same pop-up, since input is what unlocks
it.)

The branch then **plays out on screen**: the dead end is re-argued with the
input — split the bar into structure and skin; only the skin moves — and the
hidden nodes appear one by one (the parent's dot spins as each is developed,
the new node pulses while it's argued): the bar's cover sections open like
gear doors → two side flaps, hoop untouched → a sensor-gated sequence (glass,
flaps, roof; parked, ~20 s) → reverse-on-fault for a jammed flap → the flap
mechanism under a removable trim strip, where it **settles as the current
design**: two side sections of the bar's cosmetic cover lift for the roof's
linkage while the hoop stays fixed and the rear glass moves on its own
mechanism. Running all three motions at once dead-ends, and lifting the whole
cover drifts. The canvas follows the main line.

In the demo this play-out is **pre-scripted** so it runs without a key and
lands the same way every time; in a live game, adding input re-argues the node
with real calls.

It's built to the same rules as a live game — each branch stays at a level
until it's viable, levels step down one at a time, "settled" only at Detail,
stopped nodes aren't debated unless you kept going, every topic is a question
from the opponent's expertise — and is checked against those rules in code,
both before the input (14 nodes) and after it plays out (21). The data is in
`src/prototype8-1/demo.ts`.

## The mapping

| Game-theory object | Here |
|---|---|
| Node | A consideration point — a perspective, assumption, tension or improvement |
| Players | Proponent, Skeptic, and you as judge |
| Action | Which way the idea develops: Opponent wins / Synthesis / You win |
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
3. Each of the three outcomes — Opponent wins, Synthesis, You win — has its
   own row in the panel. **Develop** any of them into a child node, and
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
parent. Both feed the drifted stop condition. (They're kept on every node but
not shown in the simplified panel for now.)

**The failure mode to watch** is drift. Because each node rewrites the whole
idea rather than patching it, a commitment made three moves back can quietly
evaporate. The mitigation is that the developer sees the entire chain of
versions and is told to keep earlier commitments unless this move explicitly
overturns one — and to say so in `whatChanged` if it does. Showing the idea on
every node is partly so that drift is visible rather than buried in a panel.

## Sketches

Each node has a picture button on the bottom-left corner of its card. It asks the image
model for a loose marker-style concept sketch of that node's idea state —
deliberately a sketch rather than a render, so it reads as something to think
with and doesn't overclaim precision.

When an ancestor already has a sketch, the **nearest sketched one** is passed
in as the input image with an instruction to keep the same subject, viewpoint
and style and change only what the description says is different. (With sparse
sketching the direct parent usually has none.) So sketching down a branch produces
**one drawing evolving**, not a set of unrelated pictures — the visual
counterpart of the continuity rule in the develop prompt.

Images are the most expensive call, so only **the root and the end of each
played-out future** are sketched automatically — the points worth comparing.
Every other node is sketched on demand from its picture button. (A checkbox in
Setup turns the automatic ones off too.) The queue runs **entirely beside** the
develop/debate pipeline — nodes never wait on a drawing — and up to three
drawings can be in flight at once.

The one ordering rule is that a node only becomes eligible once every ancestor
that is also due a sketch has *settled* — has an image, or has failed to get
one. Without the failure case, an ancestor whose sketch errored would strand
everything below it.

Nodes appear immediately and the drawing fills in. The thumbnail slot is
**reserved while the sketch is still coming back**, showing a dashed
placeholder and a spinner — if the slot only appeared when the image landed,
the node would change height and reflow the whole tree underneath it.

Nodes without a sketch stay compact, since node height is computed per node.

The image model is chosen in the Agent dialog (shared with prototype 6, which
uses the same plumbing).

## Playing out futures

**Play out futures** (in the tree's title bar)
works from the **selected** node. It develops all three of its outcomes, then
**branches at every step**: each new node develops two outcomes — its suggested
winner and a contrasting one (Skeptic ↔ Proponent; Synthesis pairs with
Proponent) — for three steps in total. An earlier version followed only the
suggested winner, and since the judge leans cautious, futures came out as long
strings of "Skeptic wins"; branching plays both sides of each argument forward.
The debate prompt also now tells the judge that caution isn't the same as being
right.

**Every node stays independent.** Each is developed and then debated on its
own, exactly as if you had clicked through by hand — nothing is written ahead
knowing where the story ends, and every node can be re-ruled or branched from
later. A full play-out is up to 21 nodes (3 + 6 + 12), about 42 calls. Branches
run in parallel, with **at most four calls in flight at once** across the
prototype so a burst doesn't trip the API's rate limit. Nodes that already
exist are reused, branches end early if they stop, and nothing is marked as a
winner for you.

Only the end of each future's **main line** — following the top pick at every
step — is sketched automatically, so a play-out adds three images, not twelve.

A develop already in flight for the same node and outcome is shared, so a
future and a click on the same dot can't create two children for one outcome.

## Levels: concept until viable, then embodiment, then detail

Early debates tend to be over the top — arguing tolerances before anyone knows
whether the concept holds up. So every node has a **level**:

| Level | Considerations are about |
|---|---|
| **Concept** | How it works — the main principle, and whether it holds up at all |
| **Embodiment** | Form, layout, materials, how the parts fit together |
| **Detail** | Manufacturing, cost, tolerances, edge cases, failure modes |

The root is the **original idea**. A branch then **stays at a level for as
many rounds as it takes to become viable there** — a series of concept nodes,
each arguing another concept-level point — and only moves down once the model
judges the idea viable at that level. Code holds the rules whatever the model
says: a branch moves down **one level at a time**, never back up, and **six
rounds at one level without becoming viable** stops it as going in circles.
The debate prompt is told the level too, so a concept debate argues whether
the principle holds and a detail debate gets concrete.

**The canvas is divided into horizontal bands** — Original idea, Concept,
Embodiment, Detail — labelled once on the left. A node sits in its level's
band, and a series of same-level nodes stacks down inside it, so a node never
needs to say its level. That (and dropping the edge labels — outcome colour
and weight carry them) frees a lot of space on every card.

## Stop conditions

Each develop call also judges whether the branch should end:

| Stop | When |
|---|---|
| **Settled** | Only at Detail level — nothing left would split two reasonable people |
| **Dead end** | The idea can no longer meet the problem, e.g. the same objection has won more than once and answering it guts the idea |
| **Drifted** | The idea no longer does what the seed set out to do. Also forced in code when nothing carried forward |
| **Going in circles** | The new point repeats an earlier one, or the move barely changed the idea |
| **Depth limit** | Forced in code at 10 steps |

A stopped node is made to read **from across the canvas**: the whole card is
washed in the stop's colour with a thick border, and a solid banner with a
symbol (✓ settled, ✕ dead end, ↯ drifted, ↻ going in circles, ‖ depth limit)
replaces the debate point, with the one-line reason under it. The symbols keep
the kinds apart zoomed out or in greyscale; dead ends also recede slightly so
settled endings draw the eye first. It **isn't debated** — that call is saved — and it has no dots, so nothing
grows from it. **Keep going anyway** in the panel overrides the stop: the node
is debated and the branch can grow again. Adding your own input (below) with
**Add & keep going** does the same, with your input in the debate.

## Tracing how an idea got here

Selecting a node highlights its **lineage** on the canvas — its path from the
root (also drawn as a soft band under the edges) and every node that grew from
it — and fades everything else. It costs no calls — it's read straight off the
tree.

## The node panel

Deliberately short, three parts:

- **Sketch** — the node's sketch, if it has one.
- **Debate topic** — the point the opponent is picking on, phrased as a
  question to argue ("Will the hinge leak?") and labelled with who raised it,
  with the **outcome** right under it: for an open node, a row per outcome to
  mark the winner (☆/★) and develop or go to it, with the suggested one tagged;
  for a stopped node, the stop and why, and **Keep going anyway**.
- **Debate** — each side's one-line claim ("You" and "Opponent"); the full
  argument and what would change its mind are collapsed underneath.

The full idea state, carried-forward and what-changed text, level and note
are kept on each node but not shown for now.

## The call pipeline

Two calls per node, and nothing is ever recomputed.

| Action | Calls |
|---|---|
| Start a game | **2** — root consideration, then its debate |
| Adding your input | **0** to store it, **1** to re-argue or keep going |
| Play out futures | **up to ~42** — 21 nodes × 2, four at a time; fewer if branches stop |
| "Develop this outcome" in the panel, or clicking an open dot | **2** — develop the child, then debate it straight away |
| Selecting any node, marking a winner, switching branches | **0** |
| A node that stops its branch | **1** — developed, but not debated |
| Sketching a node | **1** — automatic for the root and future ends, otherwise on demand |

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

**Develop from anywhere.** Every node's coloured dots, and the per-outcome
rows in the panel, develop that outcome or jump to the branch if it already
exists. You can grow a branch that didn't win deliberately — that's often the
point.

## Adding your own expertise

The `+` on each node's bottom-right corner — stopped nodes included — opens a
**pop-up right there on the canvas** (it follows the node as you pan and zoom,
and closes on ✕, Cancel, Escape, a second click on `+`, or a click on empty
canvas). It lists the node's inputs so far, and you write what you know (a test result, a constraint,
a past project) and say whether it **supports you**, **supports the
opponent**, or is **just context**. Then:

- **Add & re-argue** (open node) reruns that node's debate with your input in
  it: the side it supports must build on it, the other side must answer it,
  and the suggested winner can change. Your marked winner and already
  developed branches are kept.
- **Add & keep going** (stopped node) overrides the stop and argues it with
  your input.
- **Add** just stores it, with no call.

Either way, your input **carries down the branch**: every later debate and
develop call on that path gets it as expert evidence, so a point you made at
the concept level still constrains the detail. The `+` shows how many inputs a
node has, and each can be removed from the pop-up. This is how the game gathers
the designer's expertise rather than only the model's.

## Who is arguing

Letting the model invent a stakeholder each time produced speakers that felt
arbitrary and drifted between nodes. Instead you pick a **pair** up front —
Designer vs Manufacturing engineer, User advocate vs Business owner, Futurist
vs Pragmatist, and so on, or "let the model choose".

The two sides are named plainly throughout: the Proponent is **you**, the side
arguing for the idea, and the Skeptic is **the opponent**. Setup spells out who
each one is, the debate cards are labelled "You · for the idea" and "Opponent",
and the outcomes read **You win / Synthesis / Opponent wins**.

The pair is passed to every prompt, not just the debate. In particular, each
point up for debate is **raised from inside the opponent's expertise** — a
manufacturing engineer gets tooling, assembly and volume; a cost accountant
gets unit cost and margin — at the current level, so at Concept it's the
broad version of their question ("can this be built at volume at all?") and
the specific version later. Before this, the point was written without knowing
who would argue it, so a manufacturing engineer could end up debating market
positioning. The debate prompt then has your side answer the opponent's
concern directly rather than change the subject.

It applies to points and debates generated from then on; nodes already argued
keep their speakers. So switching pairs partway through is a way to re-argue
the same idea from a different lens and compare the two branches side by side.

## The canvas

The tree grows downward on a pannable, zoomable canvas: drag the background to
move, scroll to zoom (or use the −/+ buttons), **Recenter** to return to the
root. The view centres on the root when a game starts but never re-centres on
its own afterwards. Node titles wrap and are shown in full rather than
truncated.

**Rows size to their tallest node** rather than using a fixed pitch. Node
height varies a lot — a sketched node is around 90px taller than an un-sketched
one — and a uniform pitch made tall nodes collide with the row below.

**Overview** (the Detail / Overview switch in the toolbar) is a separate,
compact layout rather than a zoom: every node becomes a small one-line card —
its summary and, if its branch stopped, the stop's tint, border and symbol —
inside the same level bands, packed far more tightly. The view fits the whole tree on entry
(and **Fit** does it again). Clicking a card selects it, with the same lineage
fade; double-clicking opens it in the detailed view. Hover shows the full text.

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
or play out futures — otherwise the tree keeps growing off the bottom of the viewport
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
dot is larger. The dots are **clickable**: an open one develops that case (with a
spinner in the dot while it works), a filled one jumps to its branch.

Every new node is **debated as soon as it's created**, however it was made, so
it's ready to rule on by the time you get to it. A debate already in flight for
a node is shared, so a click and playing out futures asking for the same one don't start a
second call.

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
  blank-page moment and to steer playing out futures, not to stand in for your
  judgement — which is why it never marks the winner itself.
- **Cost grows with the tree.** See the pipeline below. Expansion is on demand
  and playing out futures is capped at three steps (21 nodes).
- **The tree metaphor quietly implies design decisions are sequential and
  independent**, which they aren't. A real design commitment constrains later
  ones in ways a tree doesn't capture; `whatChanged` on each node is a partial
  answer, not a fix.
