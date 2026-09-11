import { PIPELINE_STEPS, type PipelineStepId } from "../../pipeline/steps";

type Props = {
  activeStep: PipelineStepId;
  completed: Set<PipelineStepId>;
  running: boolean;
  onSelect: (id: PipelineStepId) => void;
};

export function PipelineNav({ activeStep, completed, running, onSelect }: Props) {
  return (
    <nav className="pipe-nav" aria-label="Pipeline steps">
      <p className="pipe-nav-label">Pipeline</p>
      <ol className="pipe-nav-list">
        {PIPELINE_STEPS.map((step, index) => {
          const done = completed.has(step.id);
          const active = activeStep === step.id;
          const prevDone = index === 0 || completed.has(PIPELINE_STEPS[index - 1].id);
          const unlocked = prevDone || done;
          return (
            <li key={step.id}>
              <button
                type="button"
                className={[
                  "pipe-nav-item",
                  active ? "is-active" : "",
                  done ? "is-done" : "",
                  !unlocked ? "is-locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={!unlocked || running}
                onClick={() => onSelect(step.id)}
              >
                <span className="pipe-nav-index">{done ? "✓" : index + 1}</span>
                <span className="pipe-nav-text">
                  <span className="pipe-nav-name">{step.shortLabel}</span>
                  <span className="pipe-nav-desc">{step.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
