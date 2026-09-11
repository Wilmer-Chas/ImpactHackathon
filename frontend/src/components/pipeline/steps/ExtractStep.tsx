import { EXTRACT_LOG } from "../../../pipeline/steps";

type Props = { revealed: boolean; running: boolean };

export function ExtractStep({ revealed, running }: Props) {
  const lines = revealed || running ? EXTRACT_LOG : ["Waiting to extract…"];

  return (
    <div className="step-block">
      <div className="console" aria-live="polite">
        {lines.map((line, index) => (
          <p
            key={line}
            className={revealed || running ? "console-line" : ""}
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <span className="console-prompt">›</span> {line}
          </p>
        ))}
      </div>
    </div>
  );
}
