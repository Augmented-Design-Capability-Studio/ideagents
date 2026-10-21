import type { NodeMap } from "./tree";
import type {
  Consideration,
  Debate,
  IdeaNode,
  Level,
  Outcome,
  StopReason,
} from "./types";

// A pre-built tree for demos: no API key, no calls, and the same shape a real
// game produces — levels move down one step at a time, "settled" only at
// detail, stopped nodes aren't debated, and every point is raised from the
// opponent's expertise. With a key, any open node can be developed further.
//
// The case: a Targa keeps its fixed steel bar, so where does the roof go? One
// future is today's answer — the rear glass lifts, the roof passes over the
// bar and stows beneath the glass. The others are the roads not taken.

export const DEMO_PAIR_ID = "designer-packaging";

export const DEMO_PROBLEM =
  "A Targa's fixed steel roll bar is its signature and part of its rollover protection, so it has to stay. But the roof between the windshield and the bar still needs to disappear for open-air driving — in a rear-engine 2+2 with almost no spare space.";

export const DEMO_SEED =
  "Keep the fixed steel Targa bar, and make the roof section between the windshield and the bar retractable, so the car goes fully open-air without losing the bar.";

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
  point: Consideration;
  debate?: Debate;
  winner?: Outcome;
  stop?: { reason: StopReason; note: string };
  futureEnd?: boolean;
  note?: string;
}

const SPECS: Spec[] = [
  // ── Root ────────────────────────────────────────────────────────────────
  {
    id: "t0",
    parent: null,
    from: null,
    level: "direction",
    idea: DEMO_SEED,
    summary: "Retractable roof ahead of a fixed Targa bar",
    point: {
      title: "No room to put the roof",
      text: "A rear-engine 2+2 has no empty space behind the cabin, and the fixed bar blocks the path a convertible roof normally takes. Is open air worth giving up seats or luggage?",
      kind: "tension",
    },
    debate: {
      pro: {
        speaker: DESIGNER,
        claim: "The roof has to vanish, or it's just a big sunroof.",
        argument:
          "The Targa promise is open sky with the bar framing it. A roof that stays in view, or that owners wrestle with, breaks that. It's worth spending space on.",
        wouldChangeMyMind: "Owners in clinics ranking 'roof fully hidden' below 'keeps the rear seats'.",
      },
      con: {
        speaker: PACKAGING,
        claim: "Every litre for the roof comes out of seats, luggage or the engine bay.",
        argument:
          "Behind the bar sit the +2 seats, then the engine. The front trunk is the only free volume and it's small. Decide what you'll give up before drawing anything.",
        wouldChangeMyMind:
          "A stowage volume above the rear seats that clears head room and the engine lid.",
      },
      suggestedWinner: "synthesis",
      suggestionReason:
        "Both are right that space is the real constraint — the move is to find volume that costs neither seats nor engine.",
    },
    winner: "synthesis",
    note: "Space is the real constraint, not the mechanism.",
  },

  // ── You win: hide it over the engine ────────────────────────────────────
  {
    id: "t1",
    parent: "t0",
    from: "proponent",
    level: "concept",
    idea: "A fully automatic roof that disappears completely behind the bar at the push of a button, stowed over the engine lid so the cabin and rear seats stay untouched.",
    summary: "Power roof that hides over the engine lid",
    carried: "The fixed bar and a roof that fully disappears are both still there.",
    changed:
      "Committed to a powered roof and picked the engine lid area as its home, closing off a manual option.",
    point: {
      title: "Roof sits on the engine",
      text: "Stowing fabric and seals over a rear engine puts heat on the roof and a mechanism in the way of every service.",
      kind: "tension",
    },
    debate: {
      pro: {
        speaker: DESIGNER,
        claim: "Over the engine is the only place that costs no seats.",
        argument:
          "The cabin and the trunk stay exactly as they are. Heat and access are engineering problems; giving up the rear seats is a product problem.",
        wouldChangeMyMind: "Fabric heat tests showing the roof can't survive above the engine.",
      },
      con: {
        speaker: SERVICE,
        claim: "Then every oil change starts with taking off a roof.",
        argument:
          "The engine lid is how we reach the engine. Put a roof stack on it and routine service needs the roof mechanism removed or propped first.",
        wouldChangeMyMind: "A layout where the engine lid still opens fully with the roof stowed.",
      },
      suggestedWinner: "skeptic",
      suggestionReason: "The access problem is concrete, and the designer's case doesn't answer it.",
    },
  },
  {
    id: "t1a",
    parent: "t1",
    from: "skeptic",
    level: "concept",
    idea: "Move the roof out of the engine area into a cassette built into a deeper, taller Targa bar, so the engine lid stays free.",
    summary: "Roof cassette built into a thicker bar",
    carried: "Still a powered roof that hides completely, still clear of the cabin.",
    changed: "Moved the stowage into the bar itself, which now has to grow to hold the roof.",
    point: {
      title: "The bar becomes a box",
      text: "To hold a folded roof, the bar has to grow far deeper and taller than today's slim hoop.",
      kind: "tension",
    },
    stop: {
      reason: "drifted",
      note: "The bar has become a roof housing — the slim Targa silhouette the seed set out to keep is gone.",
    },
    futureEnd: true,
  },
  {
    id: "t1b",
    parent: "t1",
    from: "proponent",
    level: "embodiment",
    idea: "Keep the roof over the engine lid in an insulated tray that lifts together with the lid on a shared hinge, so service access survives.",
    summary: "Insulated roof tray hinged with the engine lid",
    carried: "The roof still hides over the engine, still fully automatic.",
    changed:
      "Added a heat shield and tied the tray to the lid so access survives — at the cost of a heavy, complex lid.",
    point: {
      title: "Lid too heavy to lift",
      text: "With the roof stack on it, the engine lid weighs several times more and needs struts or motors to open safely.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "Every service now depends on the roof mechanism, and heat still shortens the fabric's life.",
    },
  },

  // ── Opponent wins: take it off by hand ──────────────────────────────────
  {
    id: "t2",
    parent: "t0",
    from: "skeptic",
    level: "concept",
    idea: "A light roof panel the owner unlatches by hand and stores in the front trunk — the original 1960s Targa approach. Seats and engine bay stay untouched.",
    summary: "Manual roof panel stored in the front trunk",
    carried: "The fixed bar is untouched and the roof still comes off completely.",
    changed: "Gave up a powered roof to keep seats and engine bay; luggage space pays instead.",
    point: {
      title: "Panel fills the trunk",
      text: "A rigid panel wide enough to span the cabin takes most of the front trunk — the car's main luggage space.",
      kind: "tension",
    },
    debate: {
      pro: {
        speaker: DESIGNER,
        claim: "Some trunk on sunny days is a fair trade for simplicity.",
        argument:
          "No motors, no seals that age, nearly no weight. Owners who want a Targa want the open roof more than a weekend bag.",
        wouldChangeMyMind: "Owners saying they'd leave the panel at home rather than lose the trunk.",
      },
      con: {
        speaker: PACKAGING,
        claim: "A full-width panel leaves room for a backpack, not a weekend bag.",
        argument:
          "The panel's footprint is close to the whole trunk floor. Stored flat, it rules out the luggage the car is sold on carrying.",
        wouldChangeMyMind: "A panel that stores in under half the trunk volume.",
      },
      suggestedWinner: "synthesis",
      suggestionReason:
        "A panel that folds smaller keeps the simplicity and gives back most of the trunk.",
    },
    winner: "synthesis",
  },
  {
    id: "t2a",
    parent: "t2",
    from: "synthesis",
    level: "embodiment",
    idea: "A two-piece carbon panel that folds in half and slots into a sleeve under the front trunk lid, leaving the trunk floor free.",
    summary: "Folding carbon panel in a sleeve under the trunk lid",
    carried: "Still a manual, fully removable panel stored up front.",
    changed: "Split the panel and gave it a dedicated sleeve, trading cost for most of the trunk back.",
    point: {
      title: "Hinge across the roof",
      text: "A folding panel puts a hinge across the roof — a new water and wind-noise path a one-piece panel didn't have.",
      kind: "tension",
    },
    debate: {
      pro: {
        speaker: DESIGNER,
        claim: "The hinge is small next to getting the trunk back.",
        argument:
          "A recessed hinge under a single overlapping seal is invisible and keeps the panel feeling solid. The trunk gain is what makes this usable day to day.",
        wouldChangeMyMind: "Water tests where the hinge line leaks under a pressure wash.",
      },
      con: {
        speaker: MANUFACTURING,
        claim: "A hinge across the roof is a leak waiting for the first car wash.",
        argument:
          "Two halves means two edges to hold in tolerance and a seal that has to bridge them. That's scrap and warranty risk on a part owners touch every week.",
        wouldChangeMyMind: "A seal design that bridges the hinge with a single moulded part.",
      },
      suggestedWinner: "proponent",
      suggestionReason:
        "The hinge is solvable with a known seal design, and the trunk gain is real.",
    },
    winner: "proponent",
  },
  {
    id: "t2a1",
    parent: "t2a",
    from: "proponent",
    level: "detail",
    idea: "Two carbon halves with a recessed piano hinge under one overlapping moulded seal, two over-centre latches at the windshield and the bar, stored in a felt-lined sleeve.",
    summary: "Two carbon halves, one overlap seal, two latches",
    carried: "Same folding panel and sleeve; the hinge is now answered by the seal.",
    changed: "Fixed the seal and latch details, closing off any powered option on this branch.",
    point: {
      title: "Latches pull it tight",
      text: "The two latches have to pull the panel tight against both seals across body tolerances.",
      kind: "improvement",
    },
    stop: {
      reason: "settled",
      note: "A light, simple option for purists — nothing left that would split two reasonable people.",
    },
    futureEnd: true,
  },
  {
    id: "t2b",
    parent: "t2",
    from: "skeptic",
    level: "embodiment",
    idea: "Replace the rigid panel with a fabric roof that rolls up into a small bag in the trunk.",
    summary: "Roll-up fabric roof in a bag",
    carried: "Still manual, still stored up front, bar untouched.",
    changed: "Swapped rigid for fabric to save space, giving up a firm roof.",
    point: {
      title: "Fabric balloons at speed",
      text: "With no frame between the windshield and the bar, a fabric roof balloons and drums on the motorway.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "A frameless fabric roof can't stay taut at speed — fixing it means adding back the frame you removed.",
    },
  },

  // ── Synthesis: under the rear window ────────────────────────────────────
  {
    id: "t3",
    parent: "t0",
    from: "synthesis",
    level: "concept",
    idea: "An automatic roof that stows in the space just behind the rear seats, under the rear window, so it costs neither the seats nor the engine bay.",
    summary: "Power roof stowed under the rear window",
    carried: "Fixed bar, a roof that disappears, rear seats and engine bay intact.",
    changed: "Found a home for the roof above the rear seats instead of taking seats, trunk or engine.",
    point: {
      title: "The bar blocks the path",
      text: "To reach the space under the rear window, the roof has to get past the fixed bar — and the rear glass is in the way.",
      kind: "tension",
    },
    debate: {
      pro: {
        speaker: DESIGNER,
        claim: "Move the glass, not the bar.",
        argument:
          "The rear window is the one thing in the path that can move. Let it get out of the way while the roof passes, and the bar never has to change.",
        wouldChangeMyMind: "A glass that can't lift far enough to clear a folded roof.",
      },
      con: {
        speaker: PACKAGING,
        claim: "A moving rear window is a second mechanism, more seals, more weight.",
        argument:
          "You'd need hinges and drives for the glass on top of the roof's own. That's more parts packed into the same tight space behind the seats.",
        wouldChangeMyMind: "A glass hinge line that fits outside the roof's swept volume.",
      },
      suggestedWinner: "proponent",
      suggestionReason: "Moving the glass is the only route that keeps the bar fixed and the space free.",
    },
    winner: "proponent",
  },
  {
    id: "t3a",
    parent: "t3",
    from: "proponent",
    level: "embodiment",
    idea: "The whole rear window lifts up and back, the roof folds and travels over the fixed bar into the space behind the rear seats, and the glass closes back over it.",
    summary: "Rear glass lifts, roof passes over the bar, glass closes",
    carried: "The roof still stows under the rear window; bar and seats untouched.",
    changed: "Committed to a moving rear window as the gate for the roof — a second large moving part.",
    point: {
      title: "Big glass moving near heads",
      text: "A large glass panel swinging up behind the occupants creates pinch and impact risks, especially near the rear seats.",
      kind: "tension",
    },
    debate: {
      pro: {
        speaker: DESIGNER,
        claim: "Run it only when it's safe and it's no riskier than a tailgate.",
        argument:
          "Owners open the roof a few times a week, not while driving. A parked-only sequence keeps the drama of the glass lifting without the risk.",
        wouldChangeMyMind: "Clinic owners who expect to open the roof while moving.",
      },
      con: {
        speaker: SAFETY,
        claim: "A moving glass panel has to be impossible to trap someone with.",
        argument:
          "Rear-seat passengers and people standing beside the car are in the swept path. Without sensing and a hard stop, this fails a pinch test.",
        wouldChangeMyMind: "Pinch sensing that stops and reverses the glass on any obstruction.",
      },
      suggestedWinner: "synthesis",
      suggestionReason: "Keep the moving glass, but bound when and how it moves.",
    },
    winner: "synthesis",
  },
  {
    id: "t3a1",
    parent: "t3a",
    from: "synthesis",
    level: "detail",
    idea: "The sequence runs only with the car stationary: the glass lifts, the roof folds in a Z over the bar into its well, and the glass closes — about 20 seconds, with pinch sensing that stops and reverses on any obstruction.",
    summary: "Stationary-only sequence with pinch sensing (~20 s)",
    carried: "Same lifting glass and over-the-bar roof path.",
    changed: "Bounded the motion to a parked car with obstruction sensing, giving up opening on the move.",
    point: {
      title: "Re-sealing every cycle",
      text: "The glass and roof have to re-seal reliably every time, across years of opening and closing.",
      kind: "improvement",
    },
    stop: {
      reason: "settled",
      note: "This matches today's Targa approach — nothing left at this level that would split two reasonable people.",
    },
    futureEnd: true,
    note: "The current design.",
  },
  {
    id: "t3b",
    parent: "t3",
    from: "skeptic",
    level: "embodiment",
    idea: "Keep the rear glass fixed and slide the roof back over the bar so it stacks on top of the glass when open.",
    summary: "Roof slides back and stacks on the fixed rear glass",
    carried: "The roof still goes rearward past the bar; glass and bar both stay.",
    changed: "Avoided a moving window by parking the roof on top of it.",
    point: {
      title: "Stack blocks the rear view",
      text: "A roof stacked on the rear glass covers most of the rear window and sits in the airflow.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "With the roof stacked on the glass, the rear view is mostly blocked — and the roof is no longer hidden.",
    },
  },
  {
    id: "t3c",
    parent: "t3",
    from: "synthesis",
    level: "embodiment",
    idea: "Split the roof into two rigid panels that slide on rails under the fixed rear glass, so neither the glass nor the bar has to move.",
    summary: "Two rigid panels slide under a fixed rear glass",
    carried: "The roof still ends up under the rear window; glass and bar both fixed.",
    changed: "Removed the moving glass, betting on rails instead.",
    point: {
      title: "No gap under the glass",
      text: "Rails need a clear gap between the rear glass and the rear seat backs that the cabin doesn't have.",
      kind: "tension",
    },
    debate: {
      pro: {
        speaker: DESIGNER,
        claim: "Lower the rear seat backs a little and the gap appears.",
        argument:
          "The +2 seats are occasional seats. A few centimetres off their backrests buys a roof that never needs a moving window.",
        wouldChangeMyMind: "Rear seats failing their minimum seated height once lowered.",
      },
      con: {
        speaker: PACKAGING,
        claim: "Then the rear seats stop being seats.",
        argument:
          "There's no slack left in the rear seat package. Take height from the backrests and an adult no longer fits; take it from the glass and you change the roofline.",
        wouldChangeMyMind: "A rail section thin enough to fit without touching seats or glass.",
      },
      suggestedWinner: "skeptic",
      suggestionReason: "The seat package has no slack, and the designer's fix spends what isn't there.",
    },
  },
  {
    id: "t3c1",
    parent: "t3c",
    from: "skeptic",
    level: "embodiment",
    idea: "Raise the rear glass line by a few centimetres to open a rail channel underneath it.",
    summary: "Raise the rear glass line to make room for rails",
    carried: "Panels still slide on rails under a fixed rear glass.",
    changed: "Changed the roofline to create the gap.",
    point: {
      title: "Space comes from head room",
      text: "Raising the glass line takes the space from head room over the rear seats.",
      kind: "tension",
    },
    stop: {
      reason: "circling",
      note: "Back to the question from two steps ago — there's no free volume under the rear glass.",
    },
  },
];

// Fills in the bookkeeping a real node carries, and derives the tree links
// from each node's parent so they can't disagree.
export function buildDemoTree(): { nodes: NodeMap; rootId: string } {
  const nodes: NodeMap = {};
  for (const spec of SPECS) {
    const parent = spec.parent ? nodes[spec.parent] : null;
    const node: IdeaNode = {
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
      consideration: spec.point,
      debate: spec.debate ?? null,
      status: "ready",
      error: null,
      winner: spec.winner ?? null,
      childByOutcome: {},
      developing: [],
      note: spec.note ?? "",
      image: null,
      imageStatus: "idle",
      imageError: null,
    };
    nodes[spec.id] = node;
    if (parent && spec.from) parent.childByOutcome[spec.from] = spec.id;
  }
  return { nodes, rootId: "t0" };
}
