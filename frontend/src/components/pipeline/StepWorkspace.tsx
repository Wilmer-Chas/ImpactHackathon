import type { PipelineStepId } from "../../pipeline/steps";
import { PIPELINE_STEPS } from "../../pipeline/steps";
import type { MocReport } from "../../types/mocReport";
import { AnalyticsStep } from "./steps/AnalyticsStep";
import { CleanStep } from "./steps/CleanStep";
import { ExtractStep } from "./steps/ExtractStep";
import { ModelStep } from "./steps/ModelStep";
import { ReportStep } from "./steps/ReportStep";
import { SourcesStep } from "./steps/SourcesStep";

type Props = {
  stepId: PipelineStepId;
  running: boolean;
  completed: boolean;
  report: MocReport | null;
  reportError: string | null;
  reportLoading: boolean;
  onRun: () => void;
  onNext: () => void;
  canNext: boolean;
};

export function StepWorkspace({
  stepId,
  running,
  completed,
  report,
  reportError,
  reportLoading,
  onRun,
  onNext,
  canNext,
}: Props) {
  const meta = PIPELINE_STEPS.find((step) => step.id === stepId)!;

  return (
    <section className="pipe-workspace">
      <header className="pipe-workspace-head">
        <div>
          <p className="eyebrow">Change #1001 · TM-Core</p>
          <h2>{meta.label}</h2>
          <p className="lede">{meta.description}</p>
        </div>
        <div className="pipe-actions">
          {!completed ? (
            <button type="button" className="btn btn-primary" onClick={onRun} disabled={running}>
              {running ? "Working…" : stepId === "report" ? "Create report" : "Run this step"}
            </button>
          ) : canNext ? (
            <button type="button" className="btn btn-primary" onClick={onNext}>
              Next step
            </button>
          ) : (
            <span className="pill-done">Done</span>
          )}
        </div>
      </header>

      <div className={`pipe-panel ${running ? "is-running" : ""}`}>
        {stepId === "sources" && <SourcesStep revealed={completed || running} />}
        {stepId === "extract" && <ExtractStep revealed={completed || running} running={running} />}
        {stepId === "clean" && <CleanStep revealed={completed || running} />}
        {stepId === "model" && <ModelStep revealed={completed || running} />}
        {stepId === "analytics" && <AnalyticsStep revealed={completed || running} />}
        {stepId === "report" && (
          <ReportStep
            revealed={completed}
            report={report}
            error={reportError}
            loading={reportLoading}
          />
        )}
      </div>
    </section>
  );
}
