import type { NodeMap } from "./tree";
import type {
  Consideration,
  Debate,
  IdeaNode,
  InputSide,
  Level,
  Outcome,
  StopReason,
} from "./types";

// A pre-built tree for demos: no API key, no calls, and the same shape a real
// game produces — a branch stays at a level until it's viable there, then moves
// down one step; "settled" only at detail; stopped nodes aren't debated
// (unless the designer chose to keep going); every point is raised from the
// opponent's expertise.
//
// The case: a Targa keeps its fixed steel bar, and the idea is already to tuck
// the roof away under the rear glass — the debates are about how.
//
// One branch is STAGED. "Fold the roof back over the bar" is how today's Targa
// works, but here it dead-ends early: the roof's linkage arms have to swing
// through the fixed bar, and nothing the model knows gets past that. The
// designer brings in an idea from ANOTHER field through "+" — landing-gear
// doors: the airframe stays, only the fairings open — and the branch plays out
// (pre-scripted, so the demo needs no key) to the actual design, where two side
// sections of the bar's cosmetic cover lift for the arms while the hoop stays
// fixed and the rear glass moves on its own mechanism. The point of the demo:
// the designer's expertise, transferred by analogy, reaches the outcome the
// model couldn't.

export const DEMO_PAIR_ID = "designer-packaging";

export const DEMO_PROBLEM =
  "A Targa's fixed steel roll bar is its signature and part of its rollover protection, so it has to stay. The roof between the windshield and the bar still has to disappear for open-air driving — in a rear-engine 2+2 with almost no spare space.";

export const DEMO_SEED =
  "Keep the fixed Targa bar and tuck the roof away under the rear glass when it's open, so the seats, the trunk and the engine bay all stay untouched.";

const DESIGNER = "Designer";
const PACKAGING = "Vehicle packaging engineer";
const SERVICE = "Service technician";
const MANUFACTURING = "Manufacturing engineer";
const SAFETY = "Safety and compliance assessor";

interface Spec {
  id: string;
  parent: string | null;
  from: Outcome | null;
  level: Level;
  idea: string;
  summary: string;
  carried?: string;
  changed?: string;
  // Who raised it is filled in by buildDemoTree unless given here.
  point: Omit<Consideration, "raisedBy">;
  by?: string;
  debate?: Debate;
  winner?: Outcome;
  stop?: { reason: StopReason; note: string };
  futureEnd?: boolean;
  note?: string;
  // Hidden until the staged dead end above it gets the designer's input.
  staged?: boolean;
  // On the staged dead end: what unlocks it.
  unlock?: Unlock;
}

interface Unlock {
  // Offered in the "+" pop-up — the presenter can use it or say it their way.
  suggestedInput: { text: string; side: InputSide };
  // The debate this node gets once it's re-argued with the input.
  debate: Debate;
  winner: Outcome;
}

const SPECS: Spec[] = [
  // ── The original idea ───────────────────────────────────────────────────
  {
    id: "t0",
    parent: null,
    from: null,
    level: "concept",
    idea: DEMO_SEED,
    summary: "Roof tucks away under the rear glass",
    point: {
      title: "How does the roof get past the bar?",
      text: "The roof sits ahead of the fixed bar and has to end up behind it, under the rear glass — and both the bar and the glass are in the way.",
      kind: "tension",
    },
    debate: debate(
      [
        "Lift the glass out of the way and fold the roof back over the bar.",
        "The bar is the identity and the safety structure; it can't move. The rear glass can lift on its own, and the roof can travel over the bar into the space it leaves.",
        "A roof path that can't get over the bar.",
      ],
      [
        PACKAGING,
        "Moving the glass is a second big mechanism; move the roof around it instead.",
        "Every mechanism behind the seats fights for the same few litres. A roof that slides under a fixed glass needs one drive, not two.",
        "A glass motion that needs no more space than the roof's own.",
      ],
      "synthesis",
      "Both have a case — try moving the glass, keeping it fixed, and moving it differently."
    ),
  },

  // ── You win: fold the roof back over the bar (STAGED — dead-ends until the
  //    designer brings in an idea from another field)
  {
    id: "a",
    parent: "t0",
    from: "proponent",
    level: "concept",
    idea: "The rear glass lifts on its own mechanism to open the well, and the roof's linkage folds the roof back over the bar into the well under the glass.",
    summary: "Glass lifts; roof's linkage folds it back over the bar",
    carried: "The roof still tucks under the rear glass; the bar stays fixed.",
    changed: "Gave the glass its own mechanism and sent the roof back over the bar on a linkage.",
    point: {
      title: "Can the roof's arms get past the bar?",
      text: "The roof's linkage arms pivot behind the bar, so as they swing the roof back their path runs straight through the bar itself — and the bar can't move.",
      kind: "tension",
    },
    by: PACKAGING,
    stop: {
      reason: "dead_end",
      note: "The arms' path runs through the fixed bar, and nothing on this path lets a mechanism pass through a fixed structure.",
    },
    unlock: {
      // Deliberately from another field: the point is analogous thinking, not
      // a roof expert handing over the answer.
      suggestedInput: {
        side: "pro",
        text: "I worked on landing gear for regional aircraft. The airframe never moves for the gear — only the fairing doors over the bay open to let the leg swing through, then close to restore the skin. Could the bar work the same way: the structure stays put, and only its cover opens where the arms pass?",
      },
      debate: debate(
        [
          "Split the bar into structure and skin — only the skin has to move.",
          "Like landing-gear doors: the airframe stays, the fairing doors open for the leg and close behind it. The hoop stays fixed; only its cosmetic cover opens where the arms cross it.",
          "Arm paths that cut through the hoop's structure, not just its cover.",
        ],
        [
          PACKAGING,
          "Then the question is how much of the cover has to move.",
          "If the arms only cross the bar near its outer ends, two small sections of cover are enough. If they cross the middle, it's the whole bar — and that's not a fixed bar any more.",
          "Arm paths that cross the bar across its full width.",
        ],
        "proponent",
        "The designer's analogy separates what must stay fixed (the hoop) from what can move (its cover), which answers the objection."
      ),
      winner: "proponent",
    },
  },
  {
    id: "a1",
    parent: "a",
    from: "proponent",
    level: "concept",
    staged: true,
    idea: "The bar's structural hoop stays fixed; two side sections of its cosmetic cover lift, like landing-gear doors, to let the roof's linkage arms pass, then close behind them. The rear glass lifts on its own mechanism.",
    summary: "Bar's cover sections open so the roof's arms can pass",
    carried: "Same fixed hoop, lifting glass and over-the-bar roof path.",
    changed: "Split the bar into a fixed structure and a cover that opens where the arms cross it.",
    point: {
      title: "Does a moving cover weaken the bar?",
      text: "The bar is rollover protection. Opening parts of it can look — to a regulator or an owner — like opening up the safety structure.",
      kind: "tension",
    },
    debate: debate(
      [
        "Only the skin moves; the hoop underneath is untouched.",
        "The load path runs through the hoop, not its trim. The cover sections are cosmetic, exactly like gear doors on an airframe.",
        "Crash analysis showing the cover carries rollover load.",
      ],
      [
        SAFETY,
        "Then prove the flaps carry no load and can't trap anyone.",
        "Moving parts on a safety structure get scrutinised. The flaps must be shown to carry nothing, and they open right next to occupants' hands.",
        "A cover that's demonstrably non-structural, with pinch protection on the flaps.",
      ],
      "synthesis",
      "Viable as a concept: keep the hoop fixed and the flaps purely cosmetic, and treat their motion as a safety requirement."
    ),
    winner: "synthesis",
  },
  {
    id: "a1a",
    parent: "a1",
    from: "synthesis",
    level: "embodiment",
    staged: true,
    idea: "Two rectangular flaps at the outer ends of the bar's cover, hinged at their front edge, lift as the roof's arms approach and close after them. The hoop's load path runs underneath, untouched.",
    summary: "Two side flaps on the bar's cover, hoop untouched",
    carried: "Same fixed hoop, opening cover and separate glass mechanism.",
    changed: "Limited the moving cover to two small flaps where the arms actually cross.",
    point: {
      title: "Can three motions stay in sync?",
      text: "The glass, the flaps and the roof's arms all move through the same space — if their timing slips, parts collide.",
      kind: "tension",
    },
    debate: debate(
      [
        "One controller sequences them: glass, flaps, roof — then back in reverse.",
        "Each motion waits for the one before it to finish. Sequenced, they never share the space at the same moment.",
        "Timing tests where the motions overlap despite sequencing.",
      ],
      [
        MANUFACTURING,
        "Each mechanism has its own tolerances, and timing alone drifts.",
        "Motors slow with age and temperature. If the sequence runs on timing, a slow flap meets a fast arm sooner or later.",
        "Each step confirmed by position, not by time.",
      ],
      "synthesis",
      "Sequence them, but gate each step on a position sensor rather than a timer."
    ),
    winner: "synthesis",
  },
  {
    id: "a1a1",
    parent: "a1a",
    from: "synthesis",
    level: "detail",
    staged: true,
    idea: "A single controller runs the sequence — glass up, flaps up, roof over the bar, flaps down, glass down — with position sensors gating each step. Parked only, about 20 seconds.",
    summary: "Sensor-gated sequence: glass, flaps, roof (~20 s)",
    carried: "Same flaps, hoop, glass and roof path.",
    changed: "Gated every step on a confirmed position, and bounded it to a parked car.",
    point: {
      title: "What if a flap jams open?",
      text: "A flap that sticks open leaves a gap in the bar's cover — and the roof can't close over it.",
      kind: "tension",
    },
    debate: debate(
      [
        "The sequence stops and reverses if a sensor doesn't confirm.",
        "If a flap doesn't report closed, the roof goes back to where it started and the owner is told. Nothing moves into a space that isn't clear.",
        "A jam the sensors can't detect.",
      ],
      [
        SAFETY,
        "A car that can be driven with a flap stuck open isn't finished.",
        "Reversing the roof is fine, but the owner also has to know before driving off, and the open flap mustn't catch anyone.",
        "A warning that stops the car leaving with a flap open.",
      ],
      "proponent",
      "Reverse-on-fault plus a warning before driving answers the jam case."
    ),
    winner: "proponent",
  },
  {
    id: "a1a1a",
    parent: "a1a1",
    from: "proponent",
    level: "detail",
    staged: true,
    idea: "If any flap doesn't confirm closed, the roof reverses and the car warns the driver before it can be driven off.",
    summary: "Unconfirmed flap reverses the roof and warns",
    carried: "Same sensor-gated sequence.",
    changed: "Added reverse-on-fault and a pre-drive warning.",
    point: {
      title: "Can a dealer reset a flap?",
      text: "Flap hinges and sensors sit inside the bar's cover — fixing one could mean taking the bar trim apart.",
      kind: "tension",
    },
    debate: debate(
      [
        "Put the hinges and sensors under a strip that comes off on its own.",
        "If the flap mechanism sits under a removable trim strip, a dealer reaches it without touching the hoop or the rest of the cover.",
        "Hinges that can't be reached without removing the whole bar cover.",
      ],
      [
        SERVICE,
        "Hidden mechanisms turn a ten-minute fix into a day.",
        "If resetting a flap means removing the bar's cover, every adjustment is a big job — and it'll be done badly.",
        "A service opening that reaches the flap mechanism directly.",
      ],
      "proponent",
      "A removable strip gives direct access without opening the structure."
    ),
    winner: "proponent",
  },
  {
    id: "a1a1a1",
    parent: "a1a1a",
    from: "proponent",
    level: "detail",
    staged: true,
    idea: "The flap hinges and sensors sit under a removable trim strip on the bar, so a dealer can adjust or replace them without touching the hoop.",
    summary: "Flap mechanism under a removable trim strip",
    carried: "Same flaps, sensor-gated sequence and fault handling.",
    changed: "Made the flap mechanism serviceable from outside, closing the branch.",
    point: {
      title: "Will the strip rattle?",
      text: "A removable strip on the bar has to sit tight and quiet for the car's life.",
      kind: "improvement",
    },
    stop: {
      reason: "settled",
      note: "This matches how today's Targa works — the bar's side covers open for the roof's linkage. Nothing left that would split two reasonable people.",
    },
    futureEnd: true,
    note: "The current design — reached through the designer's landing-gear analogy.",
  },
  {
    id: "a1a1b",
    parent: "a1a1",
    from: "skeptic",
    level: "detail",
    staged: true,
    idea: "Run the glass, the flaps and the roof at the same time to halve the sequence.",
    summary: "Run all three motions at once",
    carried: "Same flaps, glass and roof path.",
    changed: "Overlapped the motions to save time.",
    point: {
      title: "Do the arms reach the flaps first?",
      text: "With everything moving at once, the roof's arms can reach the bar before the flaps are fully open.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "Overlapping the motions puts the arms through the flaps before they're open — a collision no sensor can catch in time.",
    },
  },
  {
    id: "a1b",
    parent: "a1",
    from: "skeptic",
    level: "embodiment",
    staged: true,
    idea: "Make the whole bar cover lift as one piece, so the arms never have to find a gap.",
    summary: "Whole bar cover lifts as one piece",
    carried: "Same fixed hoop underneath.",
    changed: "Traded two small flaps for one big moving cover.",
    point: {
      title: "Does a lifting bar still read as fixed?",
      text: "If the whole cover rises, the bar visibly moves every time the roof does.",
      kind: "tension",
    },
    stop: {
      reason: "drifted",
      note: "The whole bar visibly lifts — the fixed bar the idea set out to keep no longer reads as fixed.",
    },
  },

  // ── Opponent wins: keep the glass fixed, slide the roof under it ────────
  {
    id: "b",
    parent: "t0",
    from: "skeptic",
    level: "concept",
    idea: "Keep the rear glass fixed and slide the roof back under it on rails, so only the roof moves.",
    summary: "Glass stays put; roof slides under it on rails",
    carried: "The roof still tucks under the rear glass; the bar stays fixed.",
    changed: "Kept the glass still and put all the motion in the roof.",
    point: {
      title: "Is there room under the glass?",
      text: "Rails need a clear channel between the rear glass and the rear seat backs that the cabin doesn't have.",
      kind: "tension",
    },
    debate: debate(
      [
        "Make the roof thinner and the channel shrinks with it.",
        "The channel only has to be as deep as the roof. A thinner roof, or one in parts, fits a shallower gap.",
        "A roof too thin to stay stiff at speed.",
      ],
      [
        PACKAGING,
        "There's no slack under the glass for any channel.",
        "The rear seat package has no spare height. Whatever the roof's thickness, the rail and its guides take space that's already used.",
        "A channel that fits without touching seats or glass.",
      ],
      "skeptic",
      "The space objection is concrete; the designer's answer only helps if the roof can be split."
    ),
    winner: "skeptic",
  },
  {
    id: "b1",
    parent: "b",
    from: "skeptic",
    level: "concept",
    idea: "Split the roof into two short panels that stack under the glass, so the rail channel only has to be half as deep.",
    summary: "Two short panels stack to halve the depth",
    carried: "Glass still fixed, roof still slides under it.",
    changed: "Split the roof in two to shrink the channel.",
    point: {
      title: "Will two panels seal at the joint?",
      text: "Two panels meeting across the roof add a seam that has to stay watertight and quiet at speed.",
      kind: "tension",
    },
    debate: debate(
      [
        "An overlapping joint seals like a sunroof does.",
        "Sliding sunroofs seal a moving panel every day. Two panels with an overlap are the same problem twice.",
        "Wind tests where the joint whistles at motorway speed.",
      ],
      [
        MANUFACTURING,
        "A sunroof seals into a fixed frame; two moving panels seal into each other.",
        "Panel to panel, there's no fixed reference — tolerances stack across both, and the joint moves every cycle.",
        "Panels that telescope instead, so each seals into a fixed frame.",
      ],
      "synthesis",
      "Splitting is still worth pursuing, but as panels that telescope rather than butt together."
    ),
    winner: "synthesis",
  },
  {
    id: "b1c",
    parent: "b1",
    from: "synthesis",
    level: "concept",
    idea: "The two panels telescope — the front one slides under the rear one, then both slide back under the glass together.",
    summary: "Telescoping panels slide under the glass together",
    carried: "Two panels, fixed glass, rails under it.",
    changed: "Turned the joint into a telescope so each panel seals into a frame.",
    point: {
      title: "Can a telescope fit curved rails?",
      text: "The roof is curved, so telescoping panels need curved rails — and two nested curves need even more depth.",
      kind: "tension",
    },
    debate: debate(
      [
        "Match the curves and the nesting adds almost nothing.",
        "If both panels share one radius, the inner one sits tight under the outer one. The stack is barely thicker than a single panel.",
        "Panels that can't share a radius without changing the roofline.",
      ],
      [
        PACKAGING,
        "Nested curves still need clearance between them, and that clearance is depth.",
        "Two curved panels can't touch as they slide. The gap, plus the rails, plus the guides, comes out of the channel you don't have.",
        "A rail section thin enough to fit the nested stack under the glass.",
      ],
      "proponent",
      "Matching curves is plausible enough to try in form — the depth is now an embodiment question."
    ),
    winner: "proponent",
  },
  {
    id: "b1c1",
    parent: "b1c",
    from: "proponent",
    level: "embodiment",
    idea: "Both panels share one radius and run in a single curved aluminium rail on each side, nested tight under the fixed glass.",
    summary: "Shared-radius panels in one curved rail",
    carried: "Telescoping panels under a fixed glass.",
    changed: "Committed to one shared radius and a single rail per side.",
    point: {
      title: "Can that rail be made thin enough?",
      text: "A curved rail carrying two panels needs a custom section — and thin enough to fit is too weak to hold them.",
      kind: "tension",
    },
    debate: debate(
      [
        "A custom extrusion is normal for a low-volume car.",
        "We extrude bespoke sections for trim all the time. A rail is just a stiffer one.",
        "Stiffness tests where the thin rail flexes under the panels.",
      ],
      [
        MANUFACTURING,
        "Thin and stiff pull in opposite directions.",
        "To fit under the glass the section has to be shallow; to carry two panels without rattling it has to be deep. You can't have both.",
        "A material or section that is both shallow and stiff enough.",
      ],
      "skeptic",
      "The rail has to be shallow and stiff at once, and nothing on this path makes it both."
    ),
  },
  {
    id: "b1c1a",
    parent: "b1c1",
    from: "skeptic",
    level: "detail",
    idea: "Make the rail deeper for stiffness and recess it into the rear seat backs.",
    summary: "Deeper rail recessed into the seat backs",
    carried: "Same shared-radius panels and rail.",
    changed: "Took the rail's depth from the seat backs.",
    point: {
      title: "Where does that depth come from?",
      text: "Recessing the rail takes the depth from the rear seat backs — the space the whole branch was trying not to touch.",
      kind: "tension",
    },
    stop: {
      reason: "circling",
      note: "Back to the first question on this branch — there's no free depth under the glass.",
    },
  },
  {
    id: "b1a",
    parent: "b1",
    from: "skeptic",
    level: "embodiment",
    idea: "Keep the rear panel fixed as a glass panel and let only the front panel slide back under it.",
    summary: "Only the front half opens",
    carried: "Two panels under a fixed glass.",
    changed: "Gave up opening the rear half to avoid the joint.",
    point: {
      title: "Is half-open still a Targa?",
      text: "With the rear panel fixed, only half the roof opens.",
      kind: "tension",
    },
    stop: {
      reason: "drifted",
      note: "Only half the roof opens — it's become a sunroof, not the open-air Targa the idea set out to be.",
    },
  },
  {
    id: "b2",
    parent: "b",
    from: "proponent",
    level: "embodiment",
    idea: "Lower the rear seat backs so a single-piece roof fits on rails under the glass, making the rear seats suitable for children only.",
    summary: "Lower rear seat backs to fit the rails",
    carried: "Glass fixed, roof on rails under it.",
    changed: "Spent rear seat height to make room.",
    point: {
      title: "Do adults still fit in the back?",
      text: "Lowered backrests drop the rear seats below the height an adult needs.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "The rear seats stop fitting adults — giving up what the problem said to keep.",
    },
  },

  // ── Synthesis: move the glass a different way — down ────────────────────
  {
    id: "c",
    parent: "t0",
    from: "synthesis",
    level: "concept",
    idea: "Move the glass a different way: lower the rear glass down into the body like a side window, and let the roof stow above it.",
    summary: "Rear glass drops into the body; roof stows above",
    carried: "The roof still ends up where the rear glass was; the bar stays fixed.",
    changed: "Moved the glass down instead of up, so nothing swings near the bar.",
    point: {
      title: "Where does the glass drop to?",
      text: "Below the rear glass sit the rear seat backs and then the engine — a glass that size needs a deep well.",
      kind: "tension",
    },
    debate: debate(
      [
        "A curved glass can drop into a narrow well behind the seats.",
        "Side windows drop into thin doors every day. Follow the glass's own curve and the well can be slim.",
        "A well that can't be made deep enough without touching the engine.",
      ],
      [
        PACKAGING,
        "This glass is far taller than a side window, and its curve needs a deep well.",
        "A side window drops a few hundred millimetres. The rear glass would need most of its height in a well that ends at the engine.",
        "A glass short or flat enough to fit the depth above the engine.",
      ],
      "skeptic",
      "The well depth isn't there; only a different glass shape could change that."
    ),
    winner: "skeptic",
  },
  {
    id: "c1",
    parent: "c",
    from: "skeptic",
    level: "concept",
    idea: "Make the rear glass flatter and shorter so it can drop into a shallow well behind the seats.",
    summary: "Flatter, shorter glass drops into a shallow well",
    carried: "The glass still drops down; the roof stows above it.",
    changed: "Reshaped the glass to fit the well.",
    point: {
      title: "Is a flat glass still this car?",
      text: "Flattening and shortening the rear glass changes the car's rear profile, which is a big part of how it's recognised.",
      kind: "tension",
    },
    debate: debate(
      [
        "A slightly flatter glass is a small price for a roof that disappears.",
        "Most people read the bar, not the glass's exact curve. A modest change keeps the car recognisable.",
        "Clinics where people no longer recognise the car from the rear.",
      ],
      [
        PACKAGING,
        "Even flat, the glass is taller than the well behind the seats.",
        "Flattening saves curvature, not height. The glass still has to drop most of its height into space that isn't there.",
        "A glass that splits, or a well that goes deeper.",
      ],
      "skeptic",
      "Flattening doesn't solve height, which is the real constraint."
    ),
  },
  {
    id: "c1a",
    parent: "c1",
    from: "skeptic",
    level: "embodiment",
    idea: "Split the rear glass into two halves that drop separately into two shallow wells.",
    summary: "Split the glass into two halves that drop",
    carried: "Glass still drops down, roof stows above.",
    changed: "Split the glass to halve the drop.",
    point: {
      title: "Can you see through a split glass?",
      text: "A seam across the rear glass sits right in the driver's rear view and adds another seal.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "A seam across the rear glass blocks the rear view and adds a seal that has to move every cycle.",
    },
  },
  {
    id: "c1b",
    parent: "c1",
    from: "proponent",
    level: "embodiment",
    idea: "Raise the engine cover line to make a deeper well for the glass.",
    summary: "Raise the engine cover for a deeper well",
    carried: "Glass still drops into a well.",
    changed: "Moved the engine cover up to make room.",
    point: {
      title: "Is a raised rear still the same car?",
      text: "Raising the engine cover changes the car's whole rear profile.",
      kind: "tension",
    },
    stop: {
      reason: "drifted",
      note: "Raising the engine cover changes the car's whole rear — it's no longer the same car.",
    },
  },
  {
    id: "c2",
    parent: "c",
    from: "proponent",
    level: "embodiment",
    idea: "Let the glass drop into a well over the engine, with a heat shield between them.",
    summary: "Glass drops into a heat-shielded well over the engine",
    carried: "Glass still drops down.",
    changed: "Used the space over the engine for the well.",
    point: {
      title: "Can the glass live over the engine?",
      text: "Engine heat and service access both sit right where the well would go.",
      kind: "tension",
    },
    by: SERVICE,
    stop: {
      reason: "dead_end",
      note: "The well blocks engine access and sits in its heat — every service would mean removing the glass mechanism.",
    },
  },
];

// Shorthand for a debate where "you" are the Designer.
function debate(
  pro: [claim: string, argument: string, wouldChangeMyMind: string],
  con: [speaker: string, claim: string, argument: string, wouldChangeMyMind: string],
  suggestedWinner: Outcome,
  suggestionReason: string
): Debate {
  return {
    pro: { speaker: DESIGNER, claim: pro[0], argument: pro[1], wouldChangeMyMind: pro[2] },
    con: { speaker: con[0], claim: con[1], argument: con[2], wouldChangeMyMind: con[3] },
    suggestedWinner,
    suggestionReason,
  };
}

// What a staged dead end needs to play out once the designer adds input.
export interface DemoStage {
  suggestedInput: { text: string; side: InputSide };
  debate: Debate;
  winner: Outcome;
  // The hidden nodes, parents before children, with their links stripped —
  // they're re-linked one by one as the branch plays out.
  reveal: IdeaNode[];
}

// Fills in the bookkeeping a real node carries, and derives the tree links
// from each node's parent so they can't disagree. Staged nodes are held back
// in `stages`, keyed by the dead end that unlocks them.
export function buildDemoTree(): {
  nodes: NodeMap;
  rootId: string;
  stages: Record<string, DemoStage>;
} {
  const all: NodeMap = {};
  const specs: Record<string, Spec> = {};
  for (const spec of SPECS) {
    specs[spec.id] = spec;
    const parent = spec.parent ? all[spec.parent] : null;
    all[spec.id] = {
      id: spec.id,
      parentId: spec.parent,
      depth: parent ? parent.depth + 1 : 0,
      level: spec.level,
      stop: spec.stop ?? null,
      resumed: false,
      futureEnd: spec.futureEnd ?? false,
      fromOutcome: spec.from,
      ideaState: spec.idea,
      ideaSummary: spec.summary,
      carriedForward: spec.carried ?? "",
      whatChanged: spec.changed ?? "",
      // Raised by this node's opponent; a stopped node wasn't debated, so it
      // takes the opponent who argued its parent's point.
      consideration: {
        ...spec.point,
        raisedBy:
          spec.by ?? spec.debate?.con.speaker ?? parent?.debate?.con.speaker ?? PACKAGING,
      },
      debate: spec.debate ?? null,
      status: "ready",
      error: null,
      winner: spec.winner ?? null,
      childByOutcome: {},
      developing: [],
      note: spec.note ?? "",
      inputs: [],
      image: null,
      imageStatus: "idle",
      imageError: null,
    };
  }

  const nodes: NodeMap = {};
  const stages: Record<string, DemoStage> = {};
  // The dead end a staged node hangs under.
  const triggerOf = (spec: Spec): string | null => {
    let current = spec.parent ? specs[spec.parent] : undefined;
    while (current) {
      if (current.unlock) return current.id;
      current = current.parent ? specs[current.parent] : undefined;
    }
    return null;
  };

  for (const spec of SPECS) {
    const node = all[spec.id];
    if (spec.unlock) stages[spec.id] = { ...spec.unlock, reveal: [] };
    if (spec.staged) {
      const trigger = triggerOf(spec);
      if (trigger) stages[trigger].reveal.push(node);
      continue;
    }
    nodes[spec.id] = node;
    if (spec.parent && spec.from) nodes[spec.parent].childByOutcome[spec.from] = spec.id;
  }

  return { nodes, rootId: "t0", stages };
}
