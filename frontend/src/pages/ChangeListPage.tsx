type Props = {
  onOpen: () => void;
};

export function ChangeListPage({ onOpen }: Props) {
  return (
    <div className="page">
      <header className="page-intro">
        <h1>Changes waiting for a decision</h1>
        <p>
          Open a change to see whether it should go to production now, go with
          conditions, or wait.
        </p>
      </header>

      <button type="button" className="ticket-card" onClick={onOpen}>
        <div className="ticket-card-top">
          <span className="ticket-id">Change #1001</span>
          <span className="ticket-status">Needs review</span>
        </div>
        <h2>Lower alert thresholds for cross-border wires</h2>
        <dl className="ticket-meta">
          <div>
            <dt>App</dt>
            <dd>TM-Core</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>Alex Rivera</dd>
          </div>
          <div>
            <dt>Planned release</dt>
            <dd>September TM release</dd>
          </div>
        </dl>
        <span className="ticket-cta">Review this change →</span>
      </button>
    </div>
  );
}
