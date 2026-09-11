import { MODEL_ENTITIES } from "../../../pipeline/steps";

type Props = { revealed: boolean };

export function ModelStep({ revealed }: Props) {
  return (
    <div className="step-block">
      <div className="entity-grid">
        {MODEL_ENTITIES.map((item) => (
          <article key={item.entity} className={`entity-card ${revealed ? "entity-in" : "row-dim"}`}>
            <h3>{item.entity}</h3>
            <p className="entity-count">{revealed ? item.count : "–"}</p>
            <p className="entity-note">{item.note}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
