import { debate, type DemoDef, type Spec } from "../demo";

// The case: the 5th-generation Prius. Its big change over the 4th was turning
// a tall, efficient wedge into a low, sleek, coupe-like arc — a lower roof and
// a steeply raked windshield — while staying a practical, efficient four-door.
//
// One branch is STAGED. "Lower the roof and rake the windshield" is the route
// the real car took, but here it dead-ends early: with the roof down and the
// windshield laid back, there's nowhere left for the instrument cluster — the
// wheel rim blocks it from behind, and on the deep dash it reflects in the
// glass. The designer brings in an idea from a REMOTE field through "+" —
// broadcast teleprompters: put the text right on the reader's line of sight,
// far away, so the eyes barely move — and the branch plays out (pre-scripted)
// to a small cluster set far forward and read over the wheel, as on the
// current car. A second branch reaches the C-pillar rear door handles.

const PAIR_ID = "designer-packaging";

const PROBLEM =
  "The Prius is known for efficiency and practicality, not looks — people buy it in spite of how it looks. The next generation has to be genuinely desirable to look at while staying an efficient, practical four-door.";

const SEED =
  "Make the Prius genuinely desirable to look at — a low, sleek, coupe-like silhouette — without losing the efficiency and practicality it's known for.";

const PACKAGING = "Vehicle packaging engineer";
const HUMAN_FACTORS = "Human-factors engineer";
const MANUFACTURING = "Manufacturing engineer";
const PLANNER = "Product planner";

const SPECS: Spec[] = [
  // ── The original idea ───────────────────────────────────────────────────
  {
    id: "p0",
    parent: null,
    from: null,
    level: "concept",
    idea: SEED,
    summary: "A Prius that's sleek enough to want",
    point: {
      title: "Where do people fit under a lower roof?",
      text: "Making it sleek means a lower roof, and that takes headroom — mostly from the rear seats, in a car people buy for being practical.",
      kind: "tension",
    },
    debate: debate(
      [
        "Lower everything, not just the roof — seat people lower too.",
        "A sleek car is low all over. Drop the seats with the roof and headroom survives, and the whole car can become one smooth arc.",
        "Clinics where lower seats make getting in a deal-breaker.",
      ],
      [
        PACKAGING,
        "Lower seats mean a deeper dash and a harder view out — every litre moves somewhere.",
        "Drop the hip point and the windshield has to lay back to keep the roof low; the dash grows deep and the driver's view over it changes.",
        "A seating position that keeps the view and the entry height workable.",
      ],
      "synthesis",
      "Both are right that lowering moves everything — try lowering for real, faking it, and lowering only where it shows."
    ),
  },

  // ── You win: lower the roof and rake the windshield (STAGED) ────────────
  {
    id: "a",
    parent: "p0",
    from: "proponent",
    level: "concept",
    idea: "Lower the roof and rake the windshield steeply, seating the occupants lower, so the side view becomes one smooth arc from nose to tail.",
    summary: "Lower roof, steep windshield, one-arc silhouette",
    carried: "Still a sleek, efficient four-door.",
    changed: "Committed to a genuinely lower car, with the windshield laid far back.",
    point: {
      title: "Where does the driver read the speed?",
      text: "With the roof down and the windshield laid back, the wheel rim blocks a cluster behind it, and a cluster up on the deep dash reflects in the steep glass.",
      kind: "tension",
    },
    by: HUMAN_FACTORS,
    stop: {
      reason: "dead_end",
      note: "Every place for the cluster is either hidden behind the wheel rim or reflected in the steep windshield.",
    },
    unlock: {
      // Deliberately remote: nothing to do with cars, which is the point.
      suggestedInput: {
        side: "pro",
        text: "I worked on broadcast teleprompters. The trick isn't a bigger screen — it's putting the text right where the reader's eyes already are: far away, on the line of sight, so they barely move or refocus. Could the cluster sit far forward at the base of the windshield, read over the wheel instead of through it?",
      },
      debate: debate(
        [
          "Move the cluster far forward and read it over the rim, not through it.",
          "Like a teleprompter: put the information on the line of sight, far away. A small cluster at the base of the windshield sits just below the road view, so the eyes barely drop or refocus.",
          "Drivers whose seat or wheel position hides a cluster seen over the rim.",
        ],
        [
          HUMAN_FACTORS,
          "Far forward helps the eyes — but now the rim's top edge and the glass decide if it works.",
          "Read over the wheel, the cluster depends on the rim staying below it for every driver, and a bright display at the base of the glass can still reflect.",
          "A wheel and display that stay clear of each other across the seat range.",
        ],
        "proponent",
        "The designer's teleprompter idea turns the deep dash from the problem into the place to put the cluster."
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
    idea: "A small cluster set far forward at the base of the windshield, read over the top of the steering wheel instead of through it, so the eyes barely leave the road.",
    summary: "Small cluster far forward, read over the wheel",
    carried: "Same low roof and steep windshield.",
    changed: "Moved the cluster from behind the wheel to the far end of the dash, on the line of sight.",
    point: {
      title: "Will the wheel hide it for some drivers?",
      text: "Seen over the rim, the cluster disappears for drivers who sit low or set the wheel high.",
      kind: "tension",
    },
    debate: debate(
      [
        "Shape the wheel for the view: smaller, with a flatter top.",
        "A smaller wheel with a flattened top edge stays below the cluster across the seat range — and suits the sportier car.",
        "Drivers outside the range who still lose the cluster behind the rim.",
      ],
      [
        HUMAN_FACTORS,
        "If any common driving position hides it, it fails.",
        "Short drivers sit low and pull the wheel up; tall drivers do the opposite. The view has to clear the rim for both ends.",
        "A wheel size and shape checked against the full driver range.",
      ],
      "synthesis",
      "Viable as a concept if the wheel is sized and shaped for the view."
    ),
    winner: "synthesis",
  },
  {
    id: "a1a",
    parent: "a1",
    from: "synthesis",
    level: "embodiment",
    staged: true,
    idea: "A smaller steering wheel with a flattened top, and a cluster positioned so its view clears the rim across the full range of seat and wheel settings.",
    summary: "Smaller, flat-top wheel keeps the cluster in view",
    carried: "Same far-forward cluster read over the wheel.",
    changed: "Resized and reshaped the wheel around the cluster's view.",
    point: {
      title: "Will the windshield reflect it?",
      text: "A bright display at the base of a steeply raked windshield reflects in the glass at night — right in the driver's view.",
      kind: "tension",
    },
    debate: debate(
      [
        "Hood the display and angle it so its light falls below the glass.",
        "A short visor and a tilted face send the light down and back toward the driver, not up into the windshield.",
        "Night tests where the reflection still shows.",
      ],
      [
        MANUFACTURING,
        "A separate hood is another part to fit, rattle and align.",
        "Every extra piece on the dash top is a squeak and a gap to hold. If the hood is separate, it'll be out of line on some cars.",
        "A hood moulded into the dash itself.",
      ],
      "synthesis",
      "Hood it, but make the hood part of the dash moulding."
    ),
    winner: "synthesis",
  },
  {
    id: "a1a1",
    parent: "a1a",
    from: "synthesis",
    level: "detail",
    staged: true,
    idea: "A short visor over the cluster and a matte, angled display face keep its light out of the windshield.",
    summary: "Short visor and angled face stop reflections",
    carried: "Same far-forward cluster and smaller wheel.",
    changed: "Added a visor and angled the display to kill reflections.",
    point: {
      title: "Can the visor be moulded into the dash?",
      text: "Moulding the visor as part of the dash top means a deep undercut the tool has to release.",
      kind: "tension",
    },
    debate: debate(
      [
        "Shape the visor so the tool can release it in one direction.",
        "A visor with draft on its inner face comes out of the tool cleanly with the dash. No separate part, no gap.",
        "A visor shape that can't be drafted without losing the shade.",
      ],
      [
        MANUFACTURING,
        "An undercut that deep needs a slide in the tool — cost and a witness line.",
        "If the visor curls back over the display, the tool needs a moving core, which adds cost and leaves a line on a visible surface.",
        "A visor that shades the display without curling back.",
      ],
      "proponent",
      "A straight, drafted visor shades enough and moulds cleanly with the dash."
    ),
    winner: "proponent",
  },
  {
    id: "a1a1a",
    parent: "a1a1",
    from: "proponent",
    level: "detail",
    staged: true,
    idea: "The visor is moulded in one with the dash top, drafted so it releases cleanly, and angled so the cluster's light falls below the windshield's reflection line.",
    summary: "Visor moulded with the dash, below the reflection line",
    carried: "Same far-forward cluster, smaller wheel and angled display.",
    changed: "Settled the visor into the dash moulding, closing the branch.",
    point: {
      title: "Does every trim's dash match?",
      text: "Different dash materials across trims have to hold the same visor angle.",
      kind: "improvement",
    },
    stop: {
      reason: "settled",
      note: "This matches the far-forward cluster read over the wheel on today's Prius — nothing left that would split two reasonable people.",
    },
    futureEnd: true,
    note: "The current design — reached through the designer's teleprompter analogy.",
  },
  {
    id: "a1a1b",
    parent: "a1a1",
    from: "skeptic",
    level: "detail",
    staged: true,
    idea: "Skip the visor and use a head-up display that projects onto the windshield instead.",
    summary: "Head-up display instead of a visor",
    carried: "Same far-forward reading position.",
    changed: "Swapped the physical cluster for a projection.",
    point: {
      title: "Where does the projector go?",
      text: "On a windshield this steep, a head-up display needs a large projector buried deep in the dash.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "A steep windshield needs a big, costly projector deep in a dash that's already full.",
    },
  },
  {
    id: "a1b",
    parent: "a1",
    from: "skeptic",
    level: "embodiment",
    staged: true,
    idea: "Make the far-forward cluster bigger so it's easier to read from that distance.",
    summary: "Bigger cluster to read from far away",
    carried: "Same far-forward position.",
    changed: "Enlarged the display to compensate for distance.",
    point: {
      title: "Where does a bigger one sit?",
      text: "A bigger display stands taller on the dash — back up into the windshield's reflection.",
      kind: "tension",
    },
    stop: {
      reason: "circling",
      note: "A bigger cluster climbs back into the reflection — the problem this branch started from.",
    },
  },

  // ── Opponent wins: keep the body, look lower ────────────────────────────
  {
    id: "b",
    parent: "p0",
    from: "skeptic",
    level: "concept",
    idea: "Keep today's roof height and make the car look sleeker through surfaces and graphics — a lower beltline, darker pillars, long light bars.",
    summary: "Same roof; look lower through surfaces and graphics",
    carried: "Still efficient and practical; headroom untouched.",
    changed: "Kept the package and moved all the change into appearance.",
    point: {
      title: "Will graphics alone change how people see it?",
      text: "Buyers recognise a tall car by its proportions; paint and lights may read as a facelift, not a new car.",
      kind: "tension",
    },
    debate: debate(
      [
        "Proportions are perception — darken the top and the eye reads it lower.",
        "A blacked-out glasshouse and a low light line move the visual weight down. Designers do this all the time.",
        "Clinics that still call it the old car.",
      ],
      [
        PLANNER,
        "Buyers see height first; a cosmetic change sells as a facelift.",
        "The car's whole problem is how it sits. If the shape doesn't change, the reviews will say 'same Prius, new paint'.",
        "A visual change that clinics read as a new shape.",
      ],
      "skeptic",
      "The planner's point is about proportions, which graphics don't change."
    ),
    winner: "skeptic",
  },
  {
    id: "b1",
    parent: "b",
    from: "skeptic",
    level: "concept",
    idea: "Black out the roof pillars and the roof so the whole glasshouse reads as one low, dark band.",
    summary: "Black roof and pillars read as one low band",
    carried: "Same body and package.",
    changed: "Concentrated the illusion on the glasshouse.",
    point: {
      title: "Does a black roof read as lower?",
      text: "A dark roof hides the roof's edge, but the car's overall height still shows from every angle.",
      kind: "tension",
    },
    debate: debate(
      [
        "From the side, a dark band erases the roof's height.",
        "The eye reads the boundary between body and glass as the top of the car. Darken everything above it and the car looks lower.",
        "Clinics viewing the car from a three-quarter angle.",
      ],
      [
        PLANNER,
        "From three-quarters and in person, the height is still there.",
        "The illusion works in a side-view photo. In a car park, people see the roof's actual height next to other cars.",
        "A change that holds up in a car park, not just a side photo.",
      ],
      "skeptic",
      "The illusion doesn't survive real viewing angles."
    ),
  },
  {
    id: "b1a",
    parent: "b1",
    from: "skeptic",
    level: "embodiment",
    idea: "Add contrasting lower body cladding to push the visual weight down further.",
    summary: "Contrasting cladding to pull the eye down",
    carried: "Same body, dark glasshouse.",
    changed: "Added cladding to the illusion.",
    point: {
      title: "Is it still the same tall body?",
      text: "Cladding shifts where the eye looks, but the body's height hasn't changed.",
      kind: "tension",
    },
    stop: {
      reason: "circling",
      note: "Still the same tall body — back to whether surfaces can make it look low.",
    },
  },
  {
    id: "b2",
    parent: "b",
    from: "proponent",
    level: "embodiment",
    idea: "Run long horizontal light bars across the front and rear to stretch the car visually.",
    summary: "Long light bars to stretch the car",
    carried: "Same body.",
    changed: "Used lighting to widen the car's look.",
    point: {
      title: "Do light bars change the shape?",
      text: "Light bars add width cues, but the height is unchanged.",
      kind: "tension",
    },
    stop: {
      reason: "dead_end",
      note: "Clinics still read the tall body as the old car — surfaces alone can't make it genuinely desirable.",
    },
  },

  // ── Synthesis: read as a coupe, keep four doors ─────────────────────────
  {
    id: "c",
    parent: "p0",
    from: "synthesis",
    level: "concept",
    idea: "Make it read as a sleek coupe while keeping four doors: a fastback roofline, with the rear doors made to disappear visually.",
    summary: "Reads as a coupe, still four doors",
    carried: "Still practical — four doors stay.",
    changed: "Aimed the change at how the side view reads, not at the package.",
    point: {
      title: "Can people find hidden rear handles?",
      text: "If the rear door handles disappear to make it read as a coupe, passengers have to know where to reach.",
      kind: "tension",
    },
    debate: debate(
      [
        "Put them where the eye doesn't look but the hand finds them — the C-pillar.",
        "A vertical handle in the rear pillar trim vanishes in the side view but sits right where a hand reaches when opening a rear door.",
        "Passengers in a clinic who can't find the handle.",
      ],
      [
        MANUFACTURING,
        "A handle in the pillar has to survive ice, slamming and car washes.",
        "Pillar handles live in a wet, exposed spot. If it freezes or loosens, nobody gets in the back.",
        "A pillar handle that drains and can't freeze shut.",
      ],
      "synthesis",
      "Hide them in the C-pillar, but treat weather and wear as the real requirement."
    ),
    winner: "synthesis",
  },
  {
    id: "c1",
    parent: "c",
    from: "synthesis",
    level: "embodiment",
    idea: "Vertical rear door handles set into the C-pillar trim, flush with the window line, so the rear doors vanish from the side view.",
    summary: "Rear handles hidden in the C-pillar",
    carried: "Same fastback look and four doors.",
    changed: "Moved the rear handles into the pillar.",
    point: {
      title: "Will a pillar handle survive ice?",
      text: "A handle in the pillar sits where water runs and freezes — it has to open after a cold night.",
      kind: "tension",
    },
    debate: debate(
      [
        "Give it a drained pocket and a short pull, and ice has nowhere to sit.",
        "A pocket that drains and a pull that breaks thin ice with leverage works in the cold.",
        "Cold-chamber tests where the handle freezes shut.",
      ],
      [
        MANUFACTURING,
        "Every pocket collects water unless it's designed not to.",
        "The pillar trim is a channel for runoff. A pocket there fills, freezes, and jams the pull.",
        "A pocket shape that sheds water rather than holding it.",
      ],
      "proponent",
      "A drained pocket answers the ice case."
    ),
    winner: "proponent",
  },
  {
    id: "c1a",
    parent: "c1",
    from: "proponent",
    level: "detail",
    idea: "A short pull handle in a sloped, drained pocket in the C-pillar trim, so water runs out before it can freeze.",
    summary: "Short pull in a drained C-pillar pocket",
    carried: "Same hidden rear handles.",
    changed: "Settled the pocket and drain, closing the branch.",
    point: {
      title: "Does the drain clog?",
      text: "A drain in the pillar can clog with grit over the years.",
      kind: "improvement",
    },
    stop: {
      reason: "settled",
      note: "This matches the rear door handles hidden in the C-pillar on today's Prius — nothing left that would split two reasonable people.",
    },
    futureEnd: true,
  },
  {
    id: "c2",
    parent: "c",
    from: "proponent",
    level: "embodiment",
    idea: "Drop the rear roof sharply into a true fastback for the sleekest possible profile.",
    summary: "Drop the rear roof into a true fastback",
    carried: "Same coupe look and four doors.",
    changed: "Traded rear headroom for the profile.",
    point: {
      title: "Do adults still fit in the back?",
      text: "A sharply dropping roof cuts rear headroom below what an adult needs.",
      kind: "tension",
    },
    by: PACKAGING,
    stop: {
      reason: "dead_end",
      note: "Rear headroom falls below an adult's — the practicality the car is bought for is gone.",
    },
  },
];

export const PRIUS_DEMO: DemoDef = {
  id: "prius",
  label: "Prius (5th gen)",
  problem: PROBLEM,
  seed: SEED,
  pairId: PAIR_ID,
  rootId: "p0",
  specs: SPECS,
};
