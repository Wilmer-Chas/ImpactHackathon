import { ANALYTICS_RULES } from "../../../pipeline/steps";

type Props = { revealed: boolean };

export function AnalyticsStep({ revealed }: Props) {
  return (
    <div className="step-block">
      <p className="hint">These are simple yes/no checks. No AI is used here.</p>
      <table className="desk-table">
        <thead>
          <tr>
            <th>Check</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {ANALYTICS_RULES.map((rule) => (
            <tr key={rule.code} className={revealed ? "row-in" : "row-dim"}>
              <td>{rule.label}</td>
              <td>
                {revealed ? (
                  <span className="badge badge-warn">flagged</span>
                ) : (
                  <span className="badge badge-idle">waiting</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
