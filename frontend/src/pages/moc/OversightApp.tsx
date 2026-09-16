import { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { fetchMocBriefing } from "../../services/api/moc.api";
import { fetchMocReport } from "../../services/api/reports.api";
import type { MocBriefing } from "../../types/moc/briefing";
import type { MocReport } from "../../types/change/mocReport";
import { DecisionBriefPage } from "./DecisionBriefPage";
import { MocBriefingPage } from "./MocBriefingPage";
import "../../styles/app.css";

export function OversightApp() {
  const [view, setView] = useState<"briefing" | "item">("briefing");
  const [briefing, setBriefing] = useState<MocBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [briefingSlideId, setBriefingSlideId] = useState<string | undefined>();
  const [report, setReport] = useState<MocReport | null>(null);
  const [activeChangeId, setActiveChangeId] = useState<string | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBriefing() {
      setBriefingLoading(true);
      setBriefingError(null);
      try {
        const data = await fetchMocBriefing();
        if (!cancelled) {
          setBriefing(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setBriefingError(
            err instanceof Error ? err.message : "Could not load the MOC briefing",
          );
        }
      } finally {
        if (!cancelled) {
          setBriefingLoading(false);
        }
      }
    }

    void loadBriefing();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openItem(changeId: string) {
    setActiveChangeId(changeId);
    setItemLoading(true);
    setItemError(null);
    setView("item");
    try {
      const data = await fetchMocReport(changeId);
      setReport(data);
    } catch (err: unknown) {
      setItemError(err instanceof Error ? err.message : "Could not load the decision brief");
      setReport(null);
    } finally {
      setItemLoading(false);
    }
  }

  function backToBriefing() {
    setView("briefing");
    setBriefingSlideId("agenda");
    setItemError(null);
    setActiveChangeId(null);
  }

  return (
    <AppShell>
      {view === "briefing" && briefingLoading && (
        <div className="page">
          <p className="muted">Preparing MOC briefing…</p>
          <p className="muted">
            The local intelligence engine is reading portfolio evidence and authoring the
            presentation narrative. This may take a moment.
          </p>
        </div>
      )}

      {view === "briefing" && !briefingLoading && briefingError && (
        <div className="page">
          <p className="error-text">{briefingError}</p>
          <p className="muted">
            Ensure the backend is running (`npm run dev:backend`) and Ollama is up with the{" "}
            <code>mistral</code> model (`ollama serve`, then refresh).
          </p>
        </div>
      )}

      {view === "briefing" && !briefingLoading && briefing && (
        <MocBriefingPage
          briefing={briefing}
          onOpenItem={openItem}
          initialSlideId={briefingSlideId}
        />
      )}

      {view === "item" && itemLoading && (
        <div className="page">
          <p className="muted">
            Preparing decision brief for Change #{activeChangeId}…
          </p>
          <p className="muted">
            This may take a moment while the local intelligence engine reads the evidence.
          </p>
        </div>
      )}

      {view === "item" && !itemLoading && itemError && (
        <div className="page">
          <button type="button" className="back-link" onClick={backToBriefing}>
            ← MOC briefing
          </button>
          <p className="error-text">{itemError}</p>
          <p className="muted">
            Ensure the backend is running (`npm run dev:backend`) and Ollama is up with the{" "}
            <code>mistral</code> model (`ollama serve`, then try again).
          </p>
          {activeChangeId && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void openItem(activeChangeId)}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {view === "item" && !itemLoading && report && (
        <DecisionBriefPage report={report} onBack={backToBriefing} />
      )}
    </AppShell>
  );
}
