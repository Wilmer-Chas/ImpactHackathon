import type { MocReport } from "../../types/change/mocReport";

const recommendationLabel = {
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
  report: MocReport;
  onBack: () => void;
};

export function ChangeReviewPage({ report, onBack }: Props) {
  const { change, evidence } = report;

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={onBack}>
        ← All changes
      </button>

      <header className="review-header">
        <p className="eyebrow">Change #{change.id}</p>
        <h1>{change.title}</h1>
        <p className="lede">{change.description}</p>
        <dl className="ticket-meta">
          <div>
            <dt>App</dt>
            <dd>{change.application}</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{change.owner}</dd>
          </div>
          <div>
            <dt>Planned release</dt>
            <dd>{change.plannedReleaseId}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{change.changeType.replaceAll("_", " ")}</dd>
          </div>
        </dl>
      </header>

      <section className={`reco reco-${report.recommendation}`}>
        <p className="eyebrow">Recommendation</p>
        <h2>{recommendationLabel[report.recommendation]}</h2>
        <p>{report.rationale}</p>
      </section>

      <section className="section">
        <h2>Why</h2>
        <ul className="findings-list">
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
      </section>

      <section className="section">
        <h2>Evidence for this change</h2>

        <h3>Related incidents</h3>
        {evidence.incidents.length === 0 ? (
          <p className="muted">No related incidents.</p>
        ) : (
          <ul className="simple-list">
            {evidence.incidents.map((incident) => (
              <li key={incident.id}>
                <strong>{incident.id}</strong> ({incident.severity}, {incident.status}) —{" "}
                {incident.title}
                {incident.rootCause ? `. Cause: ${incident.rootCause}` : ". Cause not recorded."}
              </li>
            ))}
          </ul>
        )}

        <h3>Workload</h3>
        <ul className="simple-list">
          {evidence.processMetrics.map((metric) => (
            <li key={metric.processName}>
              {metric.processName}: {metric.backlogCount} waiting, about {metric.delayHours} hours
              behind
            </li>
          ))}
        </ul>

        <h3>System health</h3>
        <ul className="simple-list">
          {evidence.performanceMetrics.map((metric) => (
            <li key={metric.metricName}>
              {metric.metricName.replaceAll("_", " ")}: {metric.value}
              {metric.unit === "percent" ? "%" : ` ${metric.unit}`} (target {metric.slaTarget})
            </li>
          ))}
        </ul>

        <h3>Risk for this change type</h3>
        {evidence.riskRecord ? (
          <p className="muted">
            Usual residual risk: <strong>{evidence.riskRecord.residualRisk}</strong>.{" "}
            {evidence.riskRecord.notes}
          </p>
        ) : (
          <p className="muted">No risk notes found for this change type.</p>
        )}

        <h3>Release timing</h3>
        {evidence.release ? (
          <p className="muted">
            {evidence.release.name} ({evidence.release.windowStart} to {evidence.release.windowEnd})
            {evidence.release.auditPeriodActive ? ". This sits in an audit period." : "."}
            {evidence.release.freezeActive ? " Release is frozen." : ""}
          </p>
        ) : (
          <p className="muted">No release plan linked.</p>
        )}
      </section>

      <section className="section">
        <h2>Things to keep in mind</h2>
        <ul className="simple-list">
          {report.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
        <p className="generated">Updated {new Date(report.generatedAt).toLocaleString()}</p>
      </section>
    </div>
  );
}
