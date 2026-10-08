import { PROTOTYPES, type PrototypeInfo } from "../prototypes";

function Card({ prototype }: { prototype: PrototypeInfo }) {
  return (
    <li className="prototype-card">
      <a href={prototype.path}>
        <h2>{prototype.title}</h2>
        <p>{prototype.description}</p>
      </a>
    </li>
  );
}

// A group holds several takes on one premise. It's open by default — a
// collapsed group hides the only thing on the row worth clicking.
function Group({ prototype }: { prototype: PrototypeInfo }) {
  const children = prototype.children ?? [];
  return (
    <li className="prototype-group">
      <details open>
        <summary>
          <span className="prototype-group-head">
            <h2>{prototype.title}</h2>
            <span className="prototype-group-count">
              {children.length} variant{children.length === 1 ? "" : "s"}
            </span>
          </span>
          <p>{prototype.description}</p>
        </summary>
        <ul className="prototype-sublist">
          {children.map((child) => (
            <Card key={child.id} prototype={child} />
          ))}
        </ul>
      </details>
    </li>
  );
}

export function Home() {
  return (
    <main className="home">
      <h1>Ideagents Prototypes</h1>
      <p className="home-intro">
        Research prototypes for exploring multi-agent ideation.
      </p>
      <ul className="prototype-list">
        {PROTOTYPES.map((p) =>
          p.children?.length ? (
            <Group key={p.id} prototype={p} />
          ) : (
            <Card key={p.id} prototype={p} />
          )
        )}
      </ul>
    </main>
  );
}
