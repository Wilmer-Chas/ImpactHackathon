import { useState } from "react";
import { AppShell } from "../components/desktop/AppShell";
import { PipelineNav } from "../components/pipeline/PipelineNav";
import { StepWorkspace } from "../components/pipeline/StepWorkspace";
import { PIPELINE_STEPS, type PipelineStepId } from "../pipeline/steps";
import { fetchMocReport } from "../services/reports.api";
import type { MocReport } from "../types/mocReport";
import "../styles/desktop.css";

const CHANGE_ID = "1001";

function nextId(current: PipelineStepId): PipelineStepId | null {
  const index = PIPELINE_STEPS.findIndex((step) => step.id === current);
  if (index < 0 || index >= PIPELINE_STEPS.length - 1) return null;
  return PIPELINE_STEPS[index + 1].id;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function PipelineApp() {
  const [activeStep, setActiveStep] = useState<PipelineStepId>("sources");
  const [completed, setCompleted] = useState<Set<PipelineStepId>>(new Set());
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<MocReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const activeIndex = PIPELINE_STEPS.findIndex((step) => step.id === activeStep);
  const activeMeta = PIPELINE_STEPS[activeIndex];
  const isStepDone = completed.has(activeStep);
  const canAdvance = isStepDone && nextId(activeStep) !== null;

  async function runCurrentStep() {
    if (running || isStepDone) return;
    setRunning(true);
    setReportError(null);

    try {
      if (activeStep === "report") {
        const data = await fetchMocReport(CHANGE_ID);
        setReport(data);
      } else {
        await delay(700);
      }
      setCompleted((prev) => new Set(prev).add(activeStep));
    } catch (err: unknown) {
      setReportError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setRunning(false);
    }
  }

  function goNext() {
    const upcoming = nextId(activeStep);
    if (!upcoming || !completed.has(activeStep)) return;
    setActiveStep(upcoming);
  }

  function selectStep(id: PipelineStepId) {
    const targetIndex = PIPELINE_STEPS.findIndex((step) => step.id === id);
    const unlocked =
      targetIndex === 0 ||
      completed.has(PIPELINE_STEPS[targetIndex - 1].id) ||
      completed.has(id);
    if (!unlocked || running) return;
    setActiveStep(id);
  }

  function resetPipeline() {
    setActiveStep("sources");
    setCompleted(new Set());
    setRunning(false);
    setReport(null);
    setReportError(null);
  }

  const statusText = running
    ? `Working on ${activeMeta.shortLabel.toLowerCase()}…`
    : reportError && activeStep === "report"
      ? `Error: ${reportError}`
      : completed.size === PIPELINE_STEPS.length
        ? "All steps done — report is ready"
        : `Step ${activeIndex + 1} of ${PIPELINE_STEPS.length}: ${activeMeta.label}`;

  return (
    <AppShell title="Impact" subtitle="Change review" status={statusText} onReset={resetPipeline}>
      <PipelineNav
        activeStep={activeStep}
        completed={completed}
        running={running}
        onSelect={selectStep}
      />
      <StepWorkspace
        stepId={activeStep}
        running={running}
        completed={isStepDone}
        report={report}
        reportError={reportError}
        reportLoading={running && activeStep === "report"}
        onRun={runCurrentStep}
        onNext={goNext}
        canNext={canAdvance}
      />
    </AppShell>
  );
}
