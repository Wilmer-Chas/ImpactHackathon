import type { Finding, MocReport } from "../../types/change/mocReport";

const recommendationLabel = {
  go: "Go ahead",
  go_with_conditions: "Go ahead, with conditions",
  defer: "Wait",
} as const;

const whyHeading = {
  go: "Why this looks ready",
  go_with_conditions: "Why conditions apply",
  defer: "Why you should wait",
} as const;

const severityLabel = {
  critical: "Blocker",
  warning: "Caution",
  info: "Note",
} as const;

const severityRank = { critical: 0, warning: 1, info: 2 } as const;

type Props = {
  report: MocReport;
  onBack: () => void;
};

function sortedFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
}

export function ChangeReviewPage({ report, onBack }: Props) {
  const { change, evidence } = report;
  const findings = sortedFindings(report.findings);

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
        <p className="reco-summary">{report.rationale}</p>
      </section>

      <section className="section reasons-section">
        <div className="section-heading">
          <h2>{whyHeading[report.recommendation]}</h2>
          <p className="section-sub">
            {findings.length} reason{findings.length === 1 ? "" : "s"} from the evidence pack
          </p>
        </div>

        {findings.length === 0 ? (
          <p className="muted">No blocking issues were flagged for this change.</p>
        ) : (
          <ol className="reasons-list">
            {findings.map((finding, index) => (
              <li
                key={finding.id}
                className={`reason-item reason-${finding.severity === "critical" ? "crit" : finding.severity === "warning" ? "warn" : "info"}`}
              >
                <div className="reason-index" aria-hidden="true">
                  {index + 1}
                </div>
                <div className="reason-body">
                  <div className="reason-top">
                    <span
                      className={`badge badge-${finding.severity === "critical" ? "crit" : finding.severity === "warning" ? "warn" : "info"}`}
                    >
                      {severityLabel[finding.severity]}
                    </span>
                    <h3>{finding.title}</h3>
                  </div>
                  <p className="reason-fact">{finding.reason}</p>
                  {finding.evidenceRefs.length > 0 && (
                    <ul className="evidence-chips">
                      {finding.evidenceRefs.map((ref) => (
                        <li key={ref}>{ref}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Evidence for this change</h2>
          <p className="section-sub">Source facts used in the recommendation</p>
        </div>

        <div className="evidence-grid">
          <article className="evidence-block">
            <h3>Related incidents</h3>
            {evidence.incidents.length === 0 ? (
              <p className="muted">No related incidents.</p>
            ) : (
              <ul className="evidence-rows">
                {evidence.incidents.map((incident) => (
                  <li key={incident.id}>
                    <div className="evidence-row-main">
                      <strong>{incident.id}</strong>
                      <span className="evidence-meta">
                        {incident.severity} · {incident.status}
                      </span>
                    </div>
                    <p>
                      {incident.title}
                      {incident.rootCause ? `. Cause: ${incident.rootCause}` : ". Cause not recorded."}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="evidence-block">
            <h3>Workload</h3>
            <ul className="evidence-rows">
              {evidence.processMetrics.map((metric) => (
                <li key={metric.processName}>
                  <div className="evidence-row-main">
                    <strong>{metric.processName}</strong>
                  </div>
                  <p>
                    {metric.backlogCount} waiting · ~{metric.delayHours} hours behind
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <article className="evidence-block">
            <h3>System health</h3>
            <ul className="evidence-rows">
              {evidence.performanceMetrics.map((metric) => (
                <li key={metric.metricName}>
                  <div className="evidence-row-main">
                    <strong>{metric.metricName.replaceAll("_", " ")}</strong>
                  </div>
                  <p>
                    {metric.value}
                    {metric.unit === "percent" ? "%" : ` ${metric.unit}`} · target{" "}
                    {metric.slaTarget}
                    {metric.unit === "percent" ? "%" : ` ${metric.unit}`}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <article className="evidence-block">
            <h3>Risk for this change type</h3>
            {evidence.riskRecord ? (
              <ul className="evidence-rows">
                <li>
                  <div className="evidence-row-main">
                    <strong>Residual risk</strong>
                    <span className="evidence-meta">{evidence.riskRecord.residualRisk}</span>
                  </div>
                  <p>{evidence.riskRecord.notes}</p>
                </li>
              </ul>
            ) : (
              <p className="muted">No risk notes found for this change type.</p>
            )}
          </article>

          <article className="evidence-block">
            <h3>Release timing</h3>
            {evidence.release ? (
              <ul className="evidence-rows">
                <li>
                  <div className="evidence-row-main">
                    <strong>{evidence.release.name}</strong>
                    <span className="evidence-meta">
                      {evidence.release.windowStart} → {evidence.release.windowEnd}
                    </span>
                  </div>
                  <p>
                    {evidence.release.auditPeriodActive ? "Audit period active. " : ""}
                    {evidence.release.freezeActive ? "Release is frozen." : "No freeze."}
                  </p>
                </li>
              </ul>
            ) : (
              <p className="muted">No release plan linked.</p>
            )}
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Things to keep in mind</h2>
        </div>
        <ul className="caveat-list">
          {report.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
        <p className="generated">Updated {new Date(report.generatedAt).toLocaleString()}</p>
      </section>
    </div>
  );
}
