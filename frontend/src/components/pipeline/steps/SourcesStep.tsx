import { SOURCE_ROWS } from "../../../pipeline/steps";

type Props = { revealed: boolean };

export function SourcesStep({ revealed }: Props) {
  return (
    <div className="step-block">
      <p className="hint">This demo uses sample data only. Nothing is connected to live systems.</p>
      <table className="desk-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>What it contains</th>
            <th>Rows</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {SOURCE_ROWS.map((row) => (
            <tr key={row.name} className={revealed ? "row-in" : "row-dim"}>
              <td>{row.name}</td>
              <td>{row.detail}</td>
              <td>{row.records}</td>
              <td>{revealed ? "Ready" : "Waiting"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
