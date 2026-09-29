import { PROTOTYPES } from "../prototypes";

export function Home() {
  return (
    <main className="home">
      <h1>Ideagents Prototypes</h1>
      <p className="home-intro">
        Research prototypes for exploring multi-agent ideation.
      </p>
      <ul className="prototype-list">
        {PROTOTYPES.map((p) => (
          <li key={p.id} className="prototype-card">
            <a href={p.path}>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
