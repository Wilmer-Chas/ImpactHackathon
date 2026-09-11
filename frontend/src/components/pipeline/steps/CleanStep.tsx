import { CLEAN_CHECKS } from "../../../pipeline/steps";

type Props = { revealed: boolean };

export function CleanStep({ revealed }: Props) {
  return (
    <div className="step-block">
      <ul className="check-list">
        {CLEAN_CHECKS.map((check) => (
          <li key={check.label} className={revealed ? "check-in" : "row-dim"}>
            <span className={`badge badge-${revealed ? check.status : "idle"}`}>
              {revealed ? (check.status === "ok" ? "OK" : "WARN") : "—"}
            </span>
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
