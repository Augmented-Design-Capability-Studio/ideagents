import type { ConnectionState } from "../connection";

interface Props {
  connection: ConnectionState;
  onClick: () => void;
}

// Pairs with AgentDialog: this is just the header button that opens it,
// showing the current connection state as a colored dot.
export function AgentButton({ connection, onClick }: Props) {
  return (
    <button onClick={onClick}>
      <span className={`status-dot ${connection.state}`} />
      Agent
    </button>
  );
}
