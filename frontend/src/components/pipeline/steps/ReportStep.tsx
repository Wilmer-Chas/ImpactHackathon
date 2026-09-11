import type { MocReport } from "../../../types/mocReport";

const labels = {
  go: "Go ahead",
  go_with_conditions: "Go ahead, with conditions",
  defer: "Wait",
} as const;

const severityLabel = {
  critical: "serious",
  warning: "caution",
  info: "note",
} as const;

type Props = {
  revealed: boolean;
  report: MocReport | null;
  error: string | null;
  loading: boolean;
};

export function ReportStep({ revealed, report, error, loading }: Props) {
  if (loading) {
    return (
      <div className="step-block">
        <p className="hint">Building the change report…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="step-block">
        <p className="error-text">{error}</p>
        <p className="hint">
          Make sure the backend is running (`npm run dev:backend` from the repo root), then try
          Create report again.
        </p>
      </div>
    );
  }

  if (!revealed || !report) {
    return (
      <div className="step-block">
        <p className="hint">Click Create report to see the recommendation for Change #1001.</p>
      </div>
    );
  }

  return (
    <div className="step-block report-view">
      <div className={`reco reco-${report.recommendation}`}>
        <p className="eyebrow">Recommendation</p>
        <h3>{labels[report.recommendation]}</h3>
        <p>{report.rationale}</p>
      </div>

      <h4>What we found</h4>
      <ul className="findings-compact">
        {report.findings.map((finding) => (
          <li key={finding.id}>
            <span
              className={`badge badge-${finding.severity === "critical" ? "crit" : finding.severity === "warning" ? "warn" : "info"}`}
            >
              {severityLabel[finding.severity]}
            </span>
            <div>
              <strong>{finding.title}</strong>
              <p>{finding.reason}</p>
            </div>
          </li>
        ))}
      </ul>

      <h4>Supporting details</h4>
      <ul className="simple-list">
        <li>
          Incidents on {report.change.application}: {report.evidence.incidents.length}
        </li>
        <li>
          Usual risk for this change type: {report.evidence.riskRecord?.residualRisk ?? "unknown"}
        </li>
        <li>
          Planned release: {report.evidence.release?.name ?? "not set"}
          {report.evidence.release?.auditPeriodActive ? " (during an audit)" : ""}
        </li>
      </ul>

      <h4>Things to keep in mind</h4>
      <ul className="simple-list">
        {report.caveats.map((caveat) => (
          <li key={caveat}>{caveat}</li>
        ))}
      </ul>
    </div>
  );
}
