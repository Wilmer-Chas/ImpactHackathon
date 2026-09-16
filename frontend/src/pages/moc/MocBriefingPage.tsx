import { useMemo } from "react";
import { Deck, type DeckSlide } from "../../components/presentation/Deck";
import type { AgendaItem, MocBriefing, PostureSignal } from "../../types/moc/briefing";

type Props = {
  briefing: MocBriefing;
  onOpenItem: (changeId: string) => void;
  initialSlideId?: string;
};

function residualClass(risk: string | null): string {
  if (risk === "high") return "risk-high";
  if (risk === "medium") return "risk-medium";
  return "risk-low";
}

function severityClass(severity: PostureSignal["severity"]): string {
  if (severity === "critical") return "signal-crit";
  if (severity === "warning") return "signal-warn";
  return "signal-info";
}

function AgendaRow({
  item,
  note,
  onOpen,
}: {
  item: AgendaItem;
  note?: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="agenda-row" onClick={onOpen}>
      <div className="agenda-row-main">
        <span className="agenda-id">Change #{item.changeId}</span>
        <span className="agenda-status">Needs MOC stance</span>
      </div>
      <h3>{item.title}</h3>
      {note && <p className="agenda-note">{note}</p>}
      <p className="agenda-row-meta">
        {item.application} · {item.changeType.replaceAll("_", " ")} · residual{" "}
        <span className={residualClass(item.residualRisk)}>
          {item.residualRisk ?? "unknown"}
        </span>
      </p>
      <span className="agenda-cta">Open decision brief →</span>
    </button>
  );
}

export function MocBriefingPage({ briefing, onOpenItem, initialSlideId }: Props) {
  const { meeting, narrative, agenda } = briefing;

  const slides: DeckSlide[] = useMemo(
    () => [
      {
        id: "title",
        title: "Title",
        content: (
          <div className="slide slide-title">
            <p className="eyebrow">Management Oversight Committee</p>
            <h1>{meeting.title}</h1>
            <p className="slide-lede slide-lede-strong">{narrative.titleSummary}</p>
            <dl className="slide-meta">
              <div>
                <dt>Portfolio</dt>
                <dd>{meeting.portfolio}</dd>
              </div>
              <div>
                <dt>Prepared by</dt>
                <dd>{meeting.preparedBy}</dd>
              </div>
              <div>
                <dt>Briefing date</dt>
                <dd>{meeting.preparedAt}</dd>
              </div>
            </dl>
          </div>
        ),
      },
      {
        id: "posture",
        title: "Org posture",
        content: (
          <div className="slide">
            <p className="eyebrow">Across the TM portfolio</p>
            <h2 className="slide-heading">Org risk posture</h2>
            <p className="slide-lede">{narrative.postureSummary}</p>
            <ol className="signal-list">
              {narrative.postureSignals.map((signal) => (
                <li key={signal.id} className={severityClass(signal.severity)}>
                  <strong className="signal-headline">{signal.headline}</strong>
                  <span className="signal-detail">{signal.detail}</span>
                  {signal.evidenceRefs.length > 0 && (
                    <ul className="evidence-chips">
                      {signal.evidenceRefs.map((ref) => (
                        <li key={ref}>{ref}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ),
      },
      {
        id: "agenda",
        title: "Agenda",
        content: (
          <div className="slide">
            <p className="eyebrow">For decision</p>
            <h2 className="slide-heading">Agenda</h2>
            <p className="slide-lede">{narrative.agendaIntro}</p>
            <div className="agenda-rows">
              {agenda.map((item) => (
                <AgendaRow
                  key={item.changeId}
                  item={item}
                  note={narrative.agendaNotes[item.changeId]}
                  onOpen={() => onOpenItem(item.changeId)}
                />
              ))}
            </div>
            <p className="generated">
              Briefing narrative generated {new Date(briefing.generatedAt).toLocaleString()}
            </p>
          </div>
        ),
      },
    ],
    [agenda, briefing.generatedAt, meeting, narrative, onOpenItem],
  );

  return <Deck slides={slides} initialSlideId={initialSlideId} />;
}
