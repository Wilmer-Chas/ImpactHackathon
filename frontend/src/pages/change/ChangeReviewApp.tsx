import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { fetchMocReport } from "../../services/api/reports.api";
import type { MocReport } from "../../types/change/mocReport";
import { ChangeListPage } from "./ChangeListPage";
import { ChangeReviewPage } from "./ChangeReviewPage";
import "../../styles/app.css";

const CHANGE_ID = "1001";

export function ChangeReviewApp() {
  const [view, setView] = useState<"list" | "review">("list");
  const [report, setReport] = useState<MocReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openChange() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMocReport(CHANGE_ID);
      setReport(data);
      setView("review");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load the change review");
      setView("review");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function backToList() {
    setView("list");
    setError(null);
  }

  return (
    <AppShell>
      {view === "list" && !loading && <ChangeListPage onOpen={openChange} />}

      {loading && (
        <div className="page">
          <p className="muted">Analyzing Change #{CHANGE_ID}…</p>
          <p className="muted">This may take a moment while the local intelligence engine reads the evidence.</p>
        </div>
      )}

      {view === "review" && !loading && error && (
        <div className="page">
          <button type="button" className="back-link" onClick={backToList}>
            ← All changes
          </button>
          <p className="error-text">{error}</p>
          <p className="muted">
            Ensure the backend is running (`npm run dev:backend`) and Ollama is up with the{" "}
            <code>mistral</code> model (`ollama serve`, then try again).
          </p>
          <button type="button" className="btn btn-primary" onClick={openChange}>
            Try again
          </button>
        </div>
      )}

      {view === "review" && !loading && report && (
        <ChangeReviewPage report={report} onBack={backToList} />
      )}
    </AppShell>
  );
}
