import { DIAL_LEVELS, dialLevelInfo } from "../config";

interface Props {
  level: number;
  onChange: (v: number) => void;
  editable: boolean;
}

const WIDTH = 260;
const HEIGHT = 152;
const CX = 130;
const CY = 130;
const R_OUTER = 104;
const R_INNER = 64;
const SPAN = 180 / DIAL_LEVELS.length;

function polar(r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

// One wedge of the gauge band, drawn clockwise along the outer radius and
// back counter-clockwise along the inner one.
function segmentPath(startDeg: number, endDeg: number): string {
  const a = polar(R_OUTER, startDeg);
  const b = polar(R_OUTER, endDeg);
  const c = polar(R_INNER, endDeg);
  const d = polar(R_INNER, startDeg);
  return [
    `M ${a.x} ${a.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${b.x} ${b.y}`,
    `L ${c.x} ${c.y}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${d.x} ${d.y}`,
    "Z",
  ].join(" ");
}

export function IntensityDial({ level, onChange, editable }: Props) {
  const current = dialLevelInfo(level);
  const needle = polar(R_OUTER - 16, 180 - (level - 0.5) * SPAN);

  return (
    <div className="p5-dial">
      <p className="p5-dial-caption">How far should we push?</p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="p5-dial-svg"
        role="group"
        aria-label="Challenge intensity dial"
      >
        {DIAL_LEVELS.map((d, i) => {
          const start = 180 - i * SPAN;
          const end = 180 - (i + 1) * SPAN;
          const active = d.level === current.level;
          const mid = polar((R_OUTER + R_INNER) / 2, (start + end) / 2);
          return (
            <g
              key={d.level}
              className={`p5-dial-seg${active ? " p5-dial-seg-active" : ""}${
                editable ? " p5-dial-seg-editable" : ""
              }`}
              role="button"
              aria-label={`Level ${d.level}: ${d.label}. ${d.description}`}
              tabIndex={editable ? 0 : -1}
              onClick={() => editable && onChange(d.level)}
              onKeyDown={(e) => {
                if (!editable) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(d.level);
                }
              }}
            >
              <title>{`${d.level} — ${d.label}: ${d.description}`}</title>
              <path
                d={segmentPath(start, end)}
                fill={d.color}
                fillOpacity={active ? 1 : 0.18}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={mid.x}
                y={mid.y + 4}
                textAnchor="middle"
                className={`p5-dial-num${active ? " p5-dial-num-active" : ""}`}
              >
                {d.level}
              </text>
            </g>
          );
        })}

        <line
          x1={CX}
          y1={CY}
          x2={needle.x}
          y2={needle.y}
          stroke="#1a1a1a"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={7} fill="#1a1a1a" />

        <text x={10} y={CY + 16} className="p5-dial-end">
          gentle
        </text>
        <text x={WIDTH - 10} y={CY + 16} textAnchor="end" className="p5-dial-end">
          radical
        </text>
      </svg>

      <p className="p5-dial-readout">
        <span className="p5-dial-next-tag">Next up</span>{" "}
        <strong style={{ color: current.color }}>
          {current.level}. {current.label}
        </strong>{" "}
        — {current.description}
      </p>
      {!editable && <p className="p5-hint">Locked by the researcher.</p>}
    </div>
  );
}
