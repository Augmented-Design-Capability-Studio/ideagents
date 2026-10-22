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
// game produces — a branch stays at a level until it's viable there, then moves
// down one step; "settled" only at
// detail, stopped nodes aren't debated (unless the designer chose to keep
// going), and every point is raised from the opponent's expertise. With a key,
// any open node can be developed further.
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
const COST = "Cost accountant";

interface Spec {
  id: string;
  parent: string | null;
  from: Outcome | null;
  level: Level;
  idea: string;
  summary: string;
  carried?: string;
  changed?: string;
  // Who raised it is filled in by buildDemoTree.
  point: Omit<Consideration, "raisedBy">;
  debate?: Debate;
  winner?: Outcome;
  stop?: { reason: StopReason; note: string };
  // The designer chose "keep going" past this node's stop.
  resumed?: boolean;
  futureEnd?: boolean;
  note?: string;
}

const SPECS: Spec[] = [
  // ── Root ────────────────────────────────────────────────────────────────
  {
    id: "t0",
    parent: null,
    from: null,
    level: "concept",
    idea: DEMO_SEED,
    summary: "Retractable roof ahead of a fixed Targa bar",
    point: {
      title: "Where can the roof go at all?",
      text: "A rear-engine 2+2 has no empty space behind the cabin, and the fixed bar blocks the path a convertible roof normally takes. Is open air worth giving up seats or luggage?",
      kind: "tension",
    },
    debate: debate(
      [
        "The roof has to vanish, or it's just a big sunroof.",
        "The Targa promise is open sky with the bar framing it. A roof that stays in view, or that owners wrestle with, breaks that. It's worth spending space on.",
        "Owners in clinics ranking 'roof fully hidden' below 'keeps the rear seats'.",
      ],
      [
        PACKAGING,
        "Every litre for the roof comes out of seats, luggage or the engine bay.",
        "Behind the bar sit the +2 seats, then the engine. The front trunk is the only free volume and it's small. Decide what you'll give up before drawing anything.",
        "A stowage volume above the rear seats that clears head room and the engine lid.",
      ],
      "synthesis",
      "Both are right that space is the real constraint — the move is to find volume that costs neither seats nor engine."
    ),
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
    changed: "Committed to a powered roof and picked the engine lid area as its home, closing off a manual option.",
    point: {
      title: "Can the roof live over the engine?",
      text: "Stowing fabric and seals over a rear engine puts heat on the roof and a mechanism in the way of every service.",
      kind: "tension",
    },
    debate: debate(
      [
        "Over the engine is the only place that costs no seats.",
        "The cabin and the trunk stay exactly as they are. Heat and access are engineering problems; giving up the rear seats is a product problem.",
        "Fabric heat tests showing the roof can't survive above the engine.",
      ],
      [
        SERVICE,
        "Then every oil change starts with taking off a roof.",
        "The engine lid is how we reach the engine. Put a roof stack on it and routine service needs the roof mechanism removed or propped first.",
        "A layout where the engine lid still opens fully with the roof stowed.",
      ],
      "skeptic",
      "The access problem is concrete, and the designer's case doesn't answer it."
    ),
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
      title: "Won't the bar turn into a box?",
      text: "To hold a folded roof, the bar has to grow far deeper and taller than today's slim hoop.",
      kind: "tension",
    },
    stop: {
      reason: "drifted",
      note: "The bar has become a roof housing — the slim Targa silhouette the seed set out to keep is gone.",
    },
    // The designer overrode the stop to see whether a slimmer housing works.
    resumed: true,
    debate: debate(
      [
        "Grow the bar backwards only and keep its front face slim.",
        "What people see is the bar's front face against the sky. If the housing grows behind it, the silhouette from the side and front survives.",
        "Renderings where the side view no longer reads as a Targa.",
      ],
      [
        PACKAGING,
        "A folded roof needs depth you only get by thickening the whole hoop.",
        "The stack is as deep as the folded roof. Push it all behind the front face and the bar becomes a wedge running down to the engine lid.",
        "A roof that rolls rather than folds, with a much smaller cross-section.",
      ],
      "synthesis",
      "Rolling the roof instead of folding it could keep the face slim and shrink the housing."
    ),
    winner: "synthesis",
    note: "Kept going past the drift to see if a slimmer housing could work.",
  },
  {
    id: "t1a1",
    parent: "t1a",
    from: "synthesis",
    level: "embodiment",
    idea: "Keep the bar's slim front face and grow the housing rearward as two buttresses that hold a rolled fabric roof on a spring drum.",
    summary: "Slim bar face, roof rolled into rear buttresses",
    carried: "Still a roof housed at the bar, still clear of the engine lid.",
    changed: "Swapped the folded stack for a rolled roof, so the housing could shrink into two buttresses.",
    point: {
      title: "Can the hoop carry the drum?",
      text: "A rolled roof and its drum sit at roof height, raising the centre of gravity and loading the bar in a rollover.",
      kind: "tension",
    },
    debate: debate(
      [
        "A rolled fabric roof weighs a few kilos.",
        "It's fabric and a thin tube, not a hardtop. Spread over two buttresses, the extra mass at the bar is small.",
        "Rollover simulation showing the hoop failing with the drum fitted.",
      ],
      [
        SAFETY,
        "Any mass on the hoop changes how it behaves in a rollover.",
        "The bar is a safety structure. Hanging a drum and spring on it means re-proving the hoop, and the housing can't crush into the occupants' space.",
        "A drum mounted so it breaks away cleanly before the hoop takes load.",
      ],
      "skeptic",
      "The rollover case is a hard requirement, and the designer's answer is about weight, not load paths."
    ),
  },
  {
    id: "t1a1a",
    parent: "t1a1",
    from: "skeptic",
    level: "embodiment",
    idea: "Mount a lighter carbon drum on break-away brackets behind the hoop, so it shears off before the bar takes rollover load.",
    summary: "Carbon drum on break-away brackets behind the hoop",
    carried: "Same rolled roof in rear buttresses, slim bar face kept.",
    changed: "Decoupled the drum from the hoop's load path, adding brackets designed to fail.",
    point: {
      title: "Can a bracket both hold and break?",
      text: "A bracket designed to shear in a rollover also has to survive years of potholes and slammed doors without letting go.",
      kind: "tension",
    },
    debate: debate(
      [
        "Tuned break-away parts are normal in crash structures.",
        "Bonnets, mirrors and pedals already use parts that fail on purpose. This is the same idea applied to the drum.",
        "Fatigue tests where the bracket cracks before its rated life.",
      ],
      [
        MANUFACTURING,
        "A part that has to both hold and break is hard to build consistently.",
        "The break load has a narrow window. Normal casting variation puts some brackets too weak for daily loads and some too strong to shear.",
        "A bracket process that holds the break load inside that window.",
      ],
      "skeptic",
      "The bracket has to meet two opposite targets, and nothing yet shows it can."
    ),
  },
  {
    id: "t1a1a1",
    parent: "t1a1a",
    from: "skeptic",
    level: "detail",
    idea: "Machine the brackets from billet with a notched shear section to hold a tight break load, inspected one by one.",
    summary: "Billet brackets with a notched shear section",
    carried: "Same break-away drum behind the slim hoop.",
    changed: "Moved the brackets to a slow, precise process to hit the break-load window.",
    point: {
      title: "Is a billet bracket affordable?",
      text: "Machining and inspecting every bracket costs many times a cast part.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "The brackets cost more than the roof, and the hoop still needs re-proving — it can't meet the problem at volume.",
    },
    futureEnd: true,
  },
  {
    id: "t1a1b",
    parent: "t1a1",
    from: "proponent",
    level: "embodiment",
    idea: "Make the buttresses structural, so the drum housing becomes part of the rollover hoop itself.",
    summary: "Buttresses become part of the rollover hoop",
    carried: "Rolled roof still lives in the buttresses.",
    changed: "Turned the housing into structure, making the hoop much bigger.",
    point: {
      title: "Is it still a Targa?",
      text: "Structural buttresses running down to the engine lid make the rear look like a fastback.",
      kind: "tension",
    },
    stop: {
      reason: "drifted",
      note: "Structural buttresses make this a fastback hardtop — not a Targa.",
    },
  },
  {
    id: "t1b",
    parent: "t1",
    from: "proponent",
    level: "embodiment",
    idea: "Keep the roof over the engine lid in an insulated tray that lifts together with the lid on a shared hinge, so service access survives.",
    summary: "Insulated roof tray hinged with the engine lid",
    carried: "The roof still hides over the engine, still fully automatic.",
    changed: "Added a heat shield and tied the tray to the lid so access survives — at the cost of a heavy, complex lid.",
    point: {
      title: "Can anyone lift this lid?",
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
      title: "Where does the luggage go?",
      text: "A rigid panel wide enough to span the cabin takes most of the front trunk — the car's main luggage space.",
      kind: "tension",
    },
    debate: debate(
      [
        "Some trunk on sunny days is a fair trade for simplicity.",
        "No motors, no seals that age, nearly no weight. Owners who want a Targa want the open roof more than a weekend bag.",
        "Owners saying they'd leave the panel at home rather than lose the trunk.",
      ],
      [
        PACKAGING,
        "A full-width panel leaves room for a backpack, not a weekend bag.",
        "The panel's footprint is close to the whole trunk floor. Stored flat, it rules out the luggage the car is sold on carrying.",
        "A panel that stores in under half the trunk volume.",
      ],
      "synthesis",
      "A panel that folds smaller keeps the simplicity and gives back most of the trunk."
    ),
    winner: "synthesis",
  },
  {
    id: "t2p",
    parent: "t2",
    from: "synthesis",
    level: "concept",
    idea: "A manual roof panel that folds smaller before it goes in the front trunk, so it keeps the simplicity and gives back most of the luggage space.",
    summary: "Manual panel that folds smaller for the trunk",
    carried: "Still manual, still stored up front, bar untouched.",
    changed: "Committed to a panel that changes shape for storage, rather than a rigid one.",
    point: {
      title: "Does folding free the trunk?",
      text: "A folded panel is half the footprint but twice as thick — it may still crowd out the luggage it was meant to make room for.",
      kind: "tension",
    },
    debate: debate(
      [
        "Half the footprint is what matters in a deep, short trunk.",
        "The trunk is deeper than it is wide. A panel folded in half can stand on edge or tuck under the lid, leaving the floor free for bags.",
        "Luggage tests where a folded panel still blocks a standard bag.",
      ],
      [
        PACKAGING,
        "Folding trades footprint for thickness; the volume doesn't change.",
        "The panel's volume is the same however you fold it. Unless it has its own place outside the luggage space, folding just moves the problem.",
        "A storage spot for the folded panel that isn't luggage space at all.",
      ],
      "proponent",
      "Folding is viable as a concept if the panel gets its own spot — that's an embodiment question."
    ),
    winner: "proponent",
  },
  {
    id: "t2a",
    parent: "t2p",
    from: "proponent",
    level: "embodiment",
    idea: "A two-piece carbon panel that folds in half and slots into a sleeve under the front trunk lid, leaving the trunk floor free.",
    summary: "Folding carbon panel in a sleeve under the trunk lid",
    carried: "Still a manual, fully removable panel stored up front.",
    changed: "Split the panel and gave it a dedicated sleeve, trading cost for most of the trunk back.",
    point: {
      title: "Will the hinge leak?",
      text: "A folding panel puts a hinge across the roof — a new water and wind-noise path a one-piece panel didn't have.",
      kind: "tension",
    },
    debate: debate(
      [
        "The hinge is small next to getting the trunk back.",
        "A recessed hinge under a single overlapping seal is invisible and keeps the panel feeling solid. The trunk gain is what makes this usable day to day.",
        "Water tests where the hinge line leaks under a pressure wash.",
      ],
      [
        MANUFACTURING,
        "A hinge across the roof is a leak waiting for the first car wash.",
        "Two halves means two edges to hold in tolerance and a seal that has to bridge them. That's scrap and warranty risk on a part owners touch every week.",
        "A seal design that bridges the hinge with a single moulded part.",
      ],
      "proponent",
      "The hinge is solvable with a known seal design, and the trunk gain is real."
    ),
    winner: "proponent",
  },
  {
    id: "t2a1",
    parent: "t2a",
    from: "proponent",
    level: "detail",
    idea: "Two carbon halves with a recessed piano hinge under one overlapping moulded seal, held by two over-centre latches at the windshield and the bar.",
    summary: "Two carbon halves, one overlap seal, two latches",
    carried: "Same folding panel and sleeve; the hinge is now answered by the seal.",
    changed: "Fixed the seal and hinge details, closing off any powered option on this branch.",
    point: {
      title: "Can fixed latches fit every car?",
      text: "Body tolerances mean the gap between windshield and bar varies car to car, so fixed latches pull some panels too tight and leave others loose.",
      kind: "tension",
    },
    debate: debate(
      [
        "Two over-centre latches, set once at the factory.",
        "Over-centre latches have enough travel to take up normal variation. Owners get a panel that clicks shut the same way every time.",
        "End-of-line data showing cars outside the latch's travel.",
      ],
      [
        MANUFACTURING,
        "Some cars will be too tight to latch and others too loose to seal.",
        "The windshield-to-bar gap stacks up from a dozen parts. Fixed latches can't follow that spread across a production run.",
        "Latch travel that covers the full measured gap spread.",
      ],
      "synthesis",
      "Keep two latches, but make them adjustable per car."
    ),
    winner: "synthesis",
  },
  {
    id: "t2a1a",
    parent: "t2a1",
    from: "synthesis",
    level: "detail",
    idea: "Latches with an eccentric adjuster, set at the end of the line so each panel is tuned to its own car's gap.",
    summary: "Adjustable latches tuned per car at end of line",
    carried: "Same two latches and overlap seal.",
    changed: "Added per-car adjustment, costing line time.",
    point: {
      title: "Is a minute per car worth it?",
      text: "Tuning two latches on every car adds minutes at the end of the line.",
      kind: "tension",
    },
    debate: debate(
      [
        "A minute per car buys a panel that seals for life.",
        "A leaking roof is the complaint owners remember. A short adjustment is cheap next to warranty claims.",
        "Warranty data showing manual roof leaks are rare anyway.",
      ],
      [
        COST,
        "A minute per car at Targa volumes is a real line cost.",
        "End-of-line time is the most expensive time in the plant. Trial-and-error adjustment also varies by worker.",
        "An adjustment done in one step, with no trial and error.",
      ],
      "proponent",
      "The adjustment pays for itself if it can be made a single step."
    ),
    winner: "proponent",
  },
  {
    id: "t2a1a1",
    parent: "t2a1a",
    from: "proponent",
    level: "detail",
    idea: "A gauge tool reads the car's gap and sets both eccentrics in one step, with the setting marked on the latch.",
    summary: "One-step gauge sets each latch",
    carried: "Same adjustable latches; now set in one step.",
    changed: "Replaced trial and error with a gauge, adding a tool to the line.",
    point: {
      title: "Who resets it after a repair?",
      text: "After a seal or windshield replacement, the latch setting no longer matches the car.",
      kind: "improvement",
    },
    debate: debate(
      [
        "Ship the same gauge to dealers.",
        "The tool that sets it at the factory resets it after a repair. One process, everywhere.",
        "Dealers saying they won't stock a model-specific tool.",
      ],
      [
        SERVICE,
        "A special tool for one latch is a tool nobody can find.",
        "Dealers already have a wall of model-specific tools. If this one's missing, the panel gets set by feel and leaks.",
        "A setting the owner can check by eye without a tool.",
      ],
      "proponent",
      "One gauge for factory and dealer keeps the setting consistent for the car's life."
    ),
    winner: "proponent",
  },
  {
    id: "t2a1a1a",
    parent: "t2a1a1",
    from: "proponent",
    level: "detail",
    idea: "The same gauge ships in the dealer service kit, and the panel's sleeve carries a printed check card so owners can see if a latch needs resetting.",
    summary: "Dealer gauge plus an owner check card",
    carried: "Same gauge-set latches, folding carbon panel and sleeve.",
    changed: "Extended the factory setting into service, closing the branch.",
    point: {
      title: "Will the check card last?",
      text: "A printed card in the sleeve gets scuffed over years of use.",
      kind: "improvement",
    },
    stop: {
      reason: "settled",
      note: "A light, simple option for purists — nothing left that would split two reasonable people.",
    },
    futureEnd: true,
  },
  {
    id: "t2a1a2",
    parent: "t2a1a",
    from: "skeptic",
    level: "detail",
    idea: "Skip adjustment and fit a thicker, softer seal that takes up the gap spread on its own.",
    summary: "Thicker seal instead of adjustable latches",
    carried: "Same two latches and folding panel.",
    changed: "Dropped adjustment, asking the seal to absorb the variation.",
    point: {
      title: "Will a soft seal hold at speed?",
      text: "A seal soft enough to absorb the spread lets the panel lift and whistle at speed.",
      kind: "tension",
    },
    stop: {
      reason: "circling",
      note: "Back to the tolerance problem the adjusters were solving two steps ago.",
    },
  },
  {
    id: "t2a1b",
    parent: "t2a1",
    from: "skeptic",
    level: "detail",
    idea: "One latch at the windshield, with the panel's rear edge hooking under a lip on the bar.",
    summary: "One latch, rear edge hooks under the bar",
    carried: "Same folding panel and seal.",
    changed: "Halved the latches to remove one adjustment.",
    point: {
      title: "Will the rear edge lift?",
      text: "A hooked rear edge has no clamping force, so the seal at the bar relies on air pressure alone.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "One latch can't hold the bar end down at motorway speed.",
    },
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
      title: "Will fabric stay taut at speed?",
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
      title: "How does the roof get past the bar?",
      text: "To reach the space under the rear window, the roof has to get past the fixed bar — and the rear glass is in the way.",
      kind: "tension",
    },
    debate: debate(
      [
        "Move the glass, not the bar.",
        "The rear window is the one thing in the path that can move. Let it get out of the way while the roof passes, and the bar never has to change.",
        "A glass that can't lift far enough to clear a folded roof.",
      ],
      [
        PACKAGING,
        "A moving rear window is a second mechanism, more seals, more weight.",
        "You'd need hinges and drives for the glass on top of the roof's own. That's more parts packed into the same tight space behind the seats.",
        "A glass hinge line that fits outside the roof's swept volume.",
      ],
      "proponent",
      "Moving the glass is the only route that keeps the bar fixed and the space free."
    ),
    winner: "proponent",
  },
  {
    id: "t3p",
    parent: "t3",
    from: "proponent",
    level: "concept",
    idea: "The rear window becomes a moving gate: it gets out of the way while the roof passes over the fixed bar, then closes over the stowed roof.",
    summary: "Rear window moves aside to let the roof pass",
    carried: "The roof still stows under the rear window; the bar stays fixed.",
    changed: "Made the rear glass a moving part, so the roof's path no longer has to go through it.",
    point: {
      title: "Where does the glass go?",
      text: "While it moves, the glass needs a path of its own that clears the bar, the roof and the engine lid — there's little room up there.",
      kind: "tension",
    },
    debate: debate(
      [
        "Up and back, over the engine lid — that space is free when parked.",
        "The roof only moves with the car stopped, and above the engine lid there's nothing in the way. The glass can swing up and back on a long arm.",
        "A hinge line that can't clear the bar at full lift.",
      ],
      [
        PACKAGING,
        "A long swing arc needs a hinge line we don't have yet.",
        "The glass has to lift high enough for a folded roof to pass under it, without hitting the bar or the rear spoiler. That arc sets where the hinge goes.",
        "A hinge position that clears the bar, the spoiler and the folded roof.",
      ],
      "proponent",
      "The swing space exists when parked; the concept is viable, and the hinge is an embodiment question."
    ),
    winner: "proponent",
    note: "Viable as a concept — move on to how it's built.",
  },
  {
    id: "t3a",
    parent: "t3p",
    from: "proponent",
    level: "embodiment",
    idea: "The whole rear window lifts up and back, the roof folds and travels over the fixed bar into the space behind the rear seats, and the glass closes back over it.",
    summary: "Rear glass lifts, roof passes over the bar, glass closes",
    carried: "The roof still stows under the rear window; bar and seats untouched.",
    changed: "Committed to a moving rear window as the gate for the roof — a second large moving part.",
    point: {
      title: "Is moving glass safe near heads?",
      text: "A large glass panel swinging up behind the occupants creates pinch and impact risks, especially near the rear seats.",
      kind: "tension",
    },
    debate: debate(
      [
        "Run it only when it's safe and it's no riskier than a tailgate.",
        "Owners open the roof a few times a week, not while driving. A parked-only sequence keeps the drama of the glass lifting without the risk.",
        "Clinic owners who expect to open the roof while moving.",
      ],
      [
        SAFETY,
        "A moving glass panel has to be impossible to trap someone with.",
        "Rear-seat passengers and people standing beside the car are in the swept path. Without sensing and a hard stop, this fails a pinch test.",
        "Pinch sensing that stops and reverses the glass on any obstruction.",
      ],
      "synthesis",
      "Keep the moving glass, but bound when and how it moves."
    ),
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
      title: "Will it seal the same every time?",
      text: "The glass lands slightly differently every cycle, and one perimeter seal has to take up that variation for years.",
      kind: "tension",
    },
    debate: debate(
      [
        "One perimeter seal the glass presses into, like a door.",
        "Doors close thousands of times on a single seal. The glass is just a door that opens upward.",
        "Cycle tests where the seal leaks before the car's design life.",
      ],
      [
        MANUFACTURING,
        "The glass lands on a different spot every cycle.",
        "A door has a striker that sets it in place. The glass swings on a long arm with no locator, so the seal sees a different squeeze each time.",
        "A way to set the glass's position before it touches the seal.",
      ],
      "synthesis",
      "Keep one seal, but control exactly where the glass lands."
    ),
    winner: "synthesis",
  },
  {
    id: "t3a1a",
    parent: "t3a1",
    from: "synthesis",
    level: "detail",
    idea: "Guide pins on the glass frame locate it into the body before it touches the seal, so the single perimeter seal sees the same compression every cycle.",
    summary: "Locating pins set the glass before it seals",
    carried: "Same stationary-only sequence and single perimeter seal.",
    changed: "Added locating pins so the seal sees a repeatable squeeze.",
    point: {
      title: "What happens when the pins wear?",
      text: "Guide pins and their sockets wear, so a car in its tenth year closes differently from a new one.",
      kind: "tension",
    },
    debate: debate(
      [
        "Make the sockets replaceable and swap them at service.",
        "Wear is predictable. A cheap socket changed every few years keeps the glass landing where it should for the car's life.",
        "Wear data showing sockets failing between service intervals.",
      ],
      [
        SERVICE,
        "A wear part in the roof means a dealer visit for a leak.",
        "If the sockets wear, owners find out from a wet seat. Unless checking them is part of every service, it won't happen.",
        "A socket that can be checked and swapped in minutes at a routine service.",
      ],
      "proponent",
      "A replaceable socket turns a leak into a routine service item."
    ),
    winner: "proponent",
  },
  {
    id: "t3a1a1",
    parent: "t3a1a",
    from: "proponent",
    level: "detail",
    idea: "The pins run in replaceable polymer bushes, checked at each service and swapped in minutes from inside the roof well.",
    summary: "Swappable pin bushes checked at each service",
    carried: "Same locating pins, glass and seal.",
    changed: "Made the wear part a service item, adding two toleranced parts per car.",
    point: {
      title: "Can the line fit bushes wrong?",
      text: "Two more toleranced parts per car are two more chances to build it wrong on the line.",
      kind: "tension",
    },
    debate: debate(
      [
        "A bush is a cheap part that turns a leak into a service item.",
        "The extra part costs little and saves a warranty claim. Owners never see it.",
        "Line data showing bush fitting errors above the plant's normal rate.",
      ],
      [
        MANUFACTURING,
        "Every extra fitted part is a chance to build it wrong.",
        "If a bush goes in crooked, the glass lands off and the seal leaks from day one — and nobody finds out until delivery.",
        "A bush that physically can't be fitted out of position.",
      ],
      "proponent",
      "The fitting risk is solvable with a fixture; the service benefit stands."
    ),
    winner: "proponent",
  },
  {
    id: "t3a1a1a",
    parent: "t3a1a1",
    from: "proponent",
    level: "detail",
    idea: "The bushes are one moulded part pressed in with a fixture that sets their position, so assembly can't get them wrong.",
    summary: "Fixture-pressed bushes that can't be fitted wrong",
    carried: "Same swappable bushes, pins, glass and seal.",
    changed: "Locked the bush position with a fixture, closing the branch.",
    point: {
      title: "Does each body need its own fixture?",
      text: "Each body variant needs its own fixture setting on the line.",
      kind: "improvement",
    },
    stop: {
      reason: "settled",
      note: "This matches today's Targa approach — nothing left that would split two reasonable people.",
    },
    futureEnd: true,
    note: "The current design.",
  },
  {
    id: "t3a1a1b",
    parent: "t3a1a1",
    from: "skeptic",
    level: "detail",
    idea: "Bond the bushes in place instead of pressing them, so they can't be fitted loose.",
    summary: "Bonded bushes instead of pressed ones",
    carried: "Same pins, glass and seal.",
    changed: "Traded swappable bushes for bonded ones.",
    point: {
      title: "Can a bonded bush be serviced?",
      text: "A bonded bush can't be swapped at service.",
      kind: "tension",
    },
    stop: {
      reason: "circling",
      note: "Back to bushes you can't swap — the wear problem from two steps ago.",
    },
  },
  {
    id: "t3a1a2",
    parent: "t3a1a",
    from: "skeptic",
    level: "detail",
    idea: "Drop the pins and use a thick, soft seal that tolerates wherever the glass lands.",
    summary: "Soft seal instead of locating pins",
    carried: "Same stationary sequence and glass.",
    changed: "Removed the locators, asking the seal to absorb the variation.",
    point: {
      title: "Will a soft seal keep water out?",
      text: "A seal soft enough to absorb that much variation lets water and wind through at speed.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "A seal that soft can't keep water out at speed.",
    },
  },
  {
    id: "t3a1b",
    parent: "t3a1",
    from: "skeptic",
    level: "detail",
    idea: "Let the roof operate up to walking pace, with the same pinch sensing.",
    summary: "Roof operates up to walking pace",
    carried: "Same lifting glass, roof path and sensing.",
    changed: "Relaxed the stationary-only rule for convenience.",
    point: {
      title: "Who's beside the car when it moves?",
      text: "Once the car moves, people walking beside it are in the glass's swept path.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "Above standstill, the pinch case for people beside the car doesn't close.",
    },
  },
  {
    id: "t3a2",
    parent: "t3a",
    from: "skeptic",
    level: "embodiment",
    idea: "The owner lifts the rear glass by hand on gas struts, and only the roof itself is powered.",
    summary: "Glass lifted by hand, only the roof powered",
    carried: "Same over-the-bar roof path into the rear well.",
    changed: "Removed the glass drive to save weight and parts.",
    point: {
      title: "What if the glass is left half-open?",
      text: "With no drive or sensing, the glass can be left part-way while the roof moves underneath it.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "A hand-lifted glass with no sensing reopens every pinch risk the drive was there to manage.",
    },
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
      title: "Can you still see out the back?",
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
      title: "Is there room under the glass?",
      text: "Rails need a clear gap between the rear glass and the rear seat backs that the cabin doesn't have.",
      kind: "tension",
    },
    debate: debate(
      [
        "Lower the rear seat backs a little and the gap appears.",
        "The +2 seats are occasional seats. A few centimetres off their backrests buys a roof that never needs a moving window.",
        "Rear seats failing their minimum seated height once lowered.",
      ],
      [
        PACKAGING,
        "Then the rear seats stop being seats.",
        "There's no slack left in the rear seat package. Take height from the backrests and an adult no longer fits; take it from the glass and you change the roofline.",
        "A rail section thin enough to fit without touching seats or glass.",
      ],
      "skeptic",
      "The seat package has no slack, and the designer's fix spends what isn't there."
    ),
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
      title: "Where does that space come from?",
      text: "Raising the glass line takes the space from head room over the rear seats.",
      kind: "tension",
    },
    stop: {
      reason: "circling",
      note: "Back to the question from two steps ago — there's no free volume under the rear glass.",
    },
  },
  {
    id: "t3c2",
    parent: "t3c",
    from: "proponent",
    level: "embodiment",
    idea: "Lower the rear seat backs so the rails fit, making the rear seats suitable for children only.",
    summary: "Lower rear seat backs to fit the rails",
    carried: "Panels still slide on rails under a fixed rear glass.",
    changed: "Spent rear seat height to make room for the rails.",
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
      resumed: spec.resumed ?? false,
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
        raisedBy: spec.debate?.con.speaker ?? parent?.debate?.con.speaker ?? PACKAGING,
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
    nodes[spec.id] = node;
    if (parent && spec.from) parent.childByOutcome[spec.from] = spec.id;
  }
  return { nodes, rootId: "t0" };
}
