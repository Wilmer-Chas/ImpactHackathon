import { useMemo, type ReactNode } from "react";
import { Deck, type DeckSlide } from "../../components/presentation/Deck";
import type { Finding, MocReport } from "../../types/change/mocReport";

const recommendationLabel = {
  go: "Authorize",
  go_with_conditions: "Authorize, with conditions",
  defer: "Hold",
} as const;

const whyHeading = {
  go: "Basis for authorization",
  go_with_conditions: "Basis for conditions",
  defer: "Basis for hold",
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

function EvidenceBody({ children }: { children: ReactNode }) {
  return <div className="evidence-theme">{children}</div>;
}

export function DecisionBriefPage({ report, onBack }: Props) {
  const { change, evidence } = report;
  const findings = useMemo(() => sortedFindings(report.findings), [report.findings]);

  const slides: DeckSlide[] = useMemo(() => {
    const built: DeckSlide[] = [
      {
        id: "ask",
        title: "The ask",
        content: (
          <div className="slide">
            <p className="eyebrow">Agenda item · Change #{change.id}</p>
            <h1 className="slide-heading-lg">{change.title}</h1>
            <p className="slide-lede">{change.description}</p>
            <dl className="slide-meta">
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
          </div>
        ),
      },
      {
        id: "stance",
        title: "Recommendation",
        content: (
          <div className={`slide slide-reco slide-reco-${report.recommendation}`}>
            <p className="eyebrow">Oversight recommendation</p>
            <h1 className="slide-heading-lg">
              {recommendationLabel[report.recommendation]}
            </h1>
            <p className="slide-lede slide-lede-strong">{report.rationale}</p>
          </div>
        ),
      },
      {
        id: "why",
        title: "Why",
        content: (
          <div className="slide">
            <p className="eyebrow">From the evidence pack</p>
            <h2 className="slide-heading">{whyHeading[report.recommendation]}</h2>
            {findings.length === 0 ? (
              <p className="slide-lede">No blocking issues were flagged for this agenda item.</p>
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
          </div>
        ),
      },
    ];

    if (evidence.incidents.length > 0) {
      built.push({
        id: "evidence-incidents",
        title: "Incidents",
        content: (
          <div className="slide">
            <p className="eyebrow">Supporting evidence</p>
            <h2 className="slide-heading">Related incidents</h2>
            <EvidenceBody>
              <ul className="signal-list signal-list-plain">
                {evidence.incidents.map((incident) => (
                  <li key={incident.id}>
                    <strong>
                      {incident.id} · {incident.severity} · {incident.status}
                    </strong>
                    <span>
                      {incident.title}
                      {incident.rootCause
                        ? `. Cause: ${incident.rootCause}`
                        : ". Cause not recorded."}
                    </span>
                  </li>
                ))}
              </ul>
            </EvidenceBody>
          </div>
        ),
      });
    }

    if (evidence.processMetrics.length > 0) {
      built.push({
        id: "evidence-workload",
        title: "Workload",
        content: (
          <div className="slide">
            <p className="eyebrow">Supporting evidence</p>
            <h2 className="slide-heading">Workload</h2>
            <EvidenceBody>
              <ul className="signal-list signal-list-plain">
                {evidence.processMetrics.map((metric) => (
                  <li key={metric.processName}>
                    <strong>{metric.processName}</strong>
                    <span>
                      {metric.backlogCount} waiting · ~{metric.delayHours} hours behind
                    </span>
                  </li>
                ))}
              </ul>
            </EvidenceBody>
          </div>
        ),
      });
    }

    if (evidence.performanceMetrics.length > 0) {
      built.push({
        id: "evidence-health",
        title: "Health",
        content: (
          <div className="slide">
            <p className="eyebrow">Supporting evidence</p>
            <h2 className="slide-heading">System health</h2>
            <EvidenceBody>
              <ul className="signal-list signal-list-plain">
                {evidence.performanceMetrics.map((metric) => (
                  <li key={metric.metricName}>
                    <strong>{metric.metricName.replaceAll("_", " ")}</strong>
                    <span>
                      {metric.value}
                      {metric.unit === "percent" ? "%" : ` ${metric.unit}`} · target{" "}
                      {metric.slaTarget}
                      {metric.unit === "percent" ? "%" : ` ${metric.unit}`}
                    </span>
                  </li>
                ))}
              </ul>
            </EvidenceBody>
          </div>
        ),
      });
    }

    if (evidence.riskRecord) {
      built.push({
        id: "evidence-risk",
        title: "Risk",
        content: (
          <div className="slide">
            <p className="eyebrow">Supporting evidence</p>
            <h2 className="slide-heading">Risk for this change type</h2>
            <EvidenceBody>
              <p className="slide-lede slide-lede-strong">
                {evidence.riskRecord.category} · residual{" "}
                <span className={`risk-${evidence.riskRecord.residualRisk}`}>
                  {evidence.riskRecord.residualRisk}
                </span>
              </p>
              <p className="slide-lede">
                Likelihood {evidence.riskRecord.likelihood} · Impact{" "}
                {evidence.riskRecord.impact}. {evidence.riskRecord.notes}
              </p>
            </EvidenceBody>
          </div>
        ),
      });
    }

    if (evidence.release) {
      built.push({
        id: "evidence-release",
        title: "Release",
        content: (
          <div className="slide">
            <p className="eyebrow">Supporting evidence</p>
            <h2 className="slide-heading">Release timing</h2>
            <EvidenceBody>
              <p className="slide-lede slide-lede-strong">{evidence.release.name}</p>
              <p className="slide-lede">
                {evidence.release.windowStart} → {evidence.release.windowEnd}.{" "}
                {evidence.release.auditPeriodActive ? "Audit period active. " : ""}
                {evidence.release.freezeActive ? "Release is frozen." : "No freeze."}
              </p>
            </EvidenceBody>
          </div>
        ),
      });
    }

    if (evidence.dataQuality.length > 0) {
      built.push({
        id: "evidence-data-quality",
        title: "Data quality",
        content: (
          <div className="slide">
            <p className="eyebrow">Supporting evidence</p>
            <h2 className="slide-heading">Data quality</h2>
            <EvidenceBody>
              <ul className="signal-list signal-list-plain">
                {evidence.dataQuality.map((issue) => (
                  <li key={`${issue.source}-${issue.field}`}>
                    <strong>
                      {issue.source} · {issue.field} · {issue.severity}
                    </strong>
                    <span>
                      Missing rate {(issue.missingRate * 100).toFixed(0)}%. {issue.notes}
                    </span>
                  </li>
                ))}
              </ul>
            </EvidenceBody>
          </div>
        ),
      });
    }

    built.push({
      id: "limits",
      title: "Limitations",
      content: (
        <div className="slide">
          <p className="eyebrow">Before you decide</p>
          <h2 className="slide-heading">Limitations of this assessment</h2>
          {report.caveats.length === 0 ? (
            <p className="slide-lede">No material limitations were noted.</p>
          ) : (
            <ul className="signal-list">
              {report.caveats.map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          )}
          <p className="generated">Updated {new Date(report.generatedAt).toLocaleString()}</p>
          <button type="button" className="btn btn-primary deck-finish-btn" onClick={onBack}>
            Back to agenda
          </button>
        </div>
      ),
    });

    return built;
  }, [change, evidence, findings, onBack, report]);

  return (
    <Deck
      slides={slides}
      onExit={onBack}
      exitLabel="MOC briefing"
      onEscape={onBack}
    />
  );
}
