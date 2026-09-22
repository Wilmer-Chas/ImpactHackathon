import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ChevronLeft,
  Clock,
  FileText,
  MessageSquare,
  PlayCircle,
  Send,
  ShieldAlert,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useAppFilters } from "../../context/AppFilterContext";
import { filterByAppFilters, isFilterActive } from "../../lib/applyFilters";
import { FilterStatusBanner } from "../../components/filters/FilterStatusBanner";
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  sendChatMessage,
} from "../../services/api/chat.api";
import {
  fetchTrends,
  generateMonthlyReport,
  generateRiskAnalysisReport,
} from "../../services/api/ops.api";
import type { ChatMessage, ChatSessionSummary } from "../../types/chat";
import type { TrendsResponse } from "../../types/ops";

type UploadView = "menu" | "upload_general" | "upload_transactions" | "upload_risk";

const DEFAULT_RISK_FROM = "2026-06-01";
const DEFAULT_RISK_TO = "2026-09-30";

const REPORT_HISTORY = [
  { id: 1, text: "Transactions Analysis Monthly Review", date: "Sep 22, 2026", type: "transactions" as const },
  { id: 2, text: "Risk Analysis - InfoSec", date: "Sep 20, 2026", type: "risk" as const },
  { id: 3, text: "Q3 General Performance", date: "Sep 18, 2026", type: "general" as const },
  { id: 4, text: "MOC Briefing Pack", date: "Sep 15, 2026", type: "moc" as const },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

async function readFileAsText(file: File): Promise<string> {
  if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    if (!ws) return "";
    return XLSX.utils.sheet_to_csv(ws);
  }
  return file.text();
}

export function EmployeeHomePage() {
  const navigate = useNavigate();
  const { filters, setFilters, clearFilters } = useAppFilters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeView, setActiveView] = useState<UploadView>("menu");
  const [instructions, setInstructions] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [chatPrompt, setChatPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSessionSummary[]>([]);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  async function refreshSessions() {
    const sessions = await listChatSessions();
    setChatHistory(sessions);
  }

  useEffect(() => {
    void refreshSessions().catch(() => setChatHistory([]));
    void fetchTrends()
      .then(setTrends)
      .catch(() => setTrends({ anomalies: [], anomalyCount: 0 }));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat, isTyping]);

  function resetUpload() {
    setActiveView("menu");
    setUploadedFiles([]);
    setInstructions("");
    setErrorMessage("");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function generateReport() {
    setIsUploading(true);
    setErrorMessage("");

    try {
      if (activeView === "upload_transactions") {
        const report = await generateMonthlyReport();
        navigate(`/report/${report.period}`, {
          state: {
            sources: uploadedFiles.map((f) => f.name),
            reportTitle: report.title,
          },
        });
        return;
      }

      if (activeView === "upload_risk") {
        const from = filters.from?.trim() || DEFAULT_RISK_FROM;
        const to = filters.to?.trim() || DEFAULT_RISK_TO;
        const riskFrom = /^\d{4}-\d{2}$/.test(from) ? `${from}-01` : from;
        const riskTo = /^\d{4}-\d{2}$/.test(to)
          ? `${to}-${String(new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)), 0).getDate()).padStart(2, "0")}`
          : to;
        await generateRiskAnalysisReport(riskFrom, riskTo);
        navigate("/report/risk", {
          state: {
            sources: uploadedFiles.map((f) => f.name),
            reportTitle: "Enterprise Risk Analysis",
          },
        });
        return;
      }

      // General: parse file, ask chat for a title, pass snippet to general report page
      let fullText = "";
      if (uploadedFiles.length > 0) {
        fullText = await readFileAsText(uploadedFiles[0]);
      }
      const fileContext = fullText.split("\n").slice(0, 3).join("\n");
      const fileData = fullText ? fullText.split("\n").slice(0, 50).join("\n") : "";

      let reportTitle = "General Performance Report";
      try {
        const titleReply = await sendChatMessage({
          message: `You are a data analyzer. Based on the following data sample:\n\n${fileContext}\n\nProvide a concise, professional 3-5 word title for a report based on this data type. Reply EXACTLY with "VALID: [Your Title]".${
            instructions.trim() ? `\n\nUser instructions: ${instructions.trim()}` : ""
          }`,
        });
        const aiReply = titleReply.reply || "";
        if (aiReply.toUpperCase().startsWith("VALID:")) {
          reportTitle = aiReply.replace(/VALID:\s*/i, "").trim();
        }
      } catch {
        // Keep default title if chat title generation fails
      }

      navigate("/report/general", {
        state: {
          sources: uploadedFiles.map((f) => f.name),
          reportTitle,
          fileData,
          instructions: instructions.trim() || undefined,
        },
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to generate. Is the backend running?",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSendChat() {
    if (!chatPrompt.trim() || isTyping) return;
    const userText = chatPrompt.trim();
    setChatPrompt("");
    setIsTyping(true);
    setChatError(null);

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      sessionId: sessionId ?? "pending",
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    };
    setActiveChat((prev) => [...prev, optimistic]);

    try {
      const result = await sendChatMessage({
        message: userText,
        sessionId: sessionId ?? undefined,
      });
      setSessionId(result.sessionId);
      if (result.filterAction?.type === "set_filters") {
        setFilters(result.filterAction.filters);
      } else if (result.filterAction?.type === "clear_filters") {
        clearFilters();
      }
      const session = await getChatSession(result.sessionId);
      setActiveChat(session.messages);
      await refreshSessions();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Error connecting to the server.";
      setActiveChat((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sessionId: sessionId ?? "pending",
          role: "assistant",
          content: text,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleNewChat() {
    setChatError(null);
    try {
      const session = await createChatSession();
      setSessionId(session.id);
      setActiveChat([]);
      await refreshSessions();
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not create chat");
    }
  }

  async function openSession(id: string) {
    setChatError(null);
    try {
      const session = await getChatSession(id);
      setSessionId(session.id);
      setActiveChat(session.messages);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Could not load chat");
    }
  }

  const totalAnomalies = trends?.anomalies.length ?? 0;
  const filteredAnomalies = filterByAppFilters(
    trends?.anomalies ?? [],
    filters,
    (a) => a.period,
    (a) => [a.title, a.detail, ...a.evidenceRefs],
  );
  const anomalyCount = filteredAnomalies.length;

  function renderUploadWindow(title: string, desc: string) {
    return (
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden relative min-h-[420px]">
        <button
          type="button"
          onClick={resetUpload}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full p-2 transition z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <button
            type="button"
            onClick={resetUpload}
            className="p-2 hover:bg-gray-200 text-gray-600 rounded-full transition"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{title} Upload</h2>
            <p className="text-gray-500 text-sm mt-1">{desc}</p>
          </div>
        </div>

        <div className="flex-1 p-8 flex flex-col gap-6 bg-white overflow-y-auto">
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/40 p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/80 transition min-h-[180px]"
          >
            <div className="w-16 h-16 bg-white shadow-sm text-brand-blue rounded-full flex items-center justify-center mb-4 border border-blue-100">
              <Upload size={28} />
            </div>
            <p className="font-bold text-gray-800 mb-1">Click to upload source files</p>
            <p className="text-xs text-gray-500">Supports .csv, .xlsx, .json</p>
            <input
              type="file"
              accept=".csv,.xlsx,.json"
              multiple
              hidden
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {uploadedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center gap-3 bg-white border border-gray-200 shadow-sm px-4 py-2.5 rounded-xl"
                >
                  <FileText size={16} className="text-brand-blue" />
                  <span className="text-sm font-semibold text-gray-700 max-w-[200px] truncate">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="text-gray-400 hover:text-red-500 ml-2 p-1 rounded-full hover:bg-red-50 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Analysis Instructions (Optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={`E.g., Format the ${title.toLowerCase()} for the Q3 stakeholder meeting...`}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent focus:bg-white outline-none resize-none transition"
              rows={3}
            />
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium flex items-start gap-3">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => void generateReport()}
            disabled={uploadedFiles.length === 0 || isUploading}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition flex items-center justify-center gap-3 ${
              uploadedFiles.length === 0 || isUploading
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-brand-blue text-white hover:bg-blue-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing Data...
              </>
            ) : (
              <>
                <PlayCircle size={22} /> Generate Interactive Deck
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-8 pb-24 flex flex-col gap-8">
      <div className="flex flex-col xl:flex-row gap-10">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
              AI Report & Analysis Generator
            </h1>
            <p className="text-gray-600 text-lg max-w-3xl leading-relaxed">
              Transform portfolio evidence into interactive decks. Choose a template, upload source
              files, and generate Fraud, Risk, or General reports — or ask the assistant on the
              right.
            </p>
          </div>

          <FilterStatusBanner noun="anomalies" shown={anomalyCount} total={totalAnomalies} />

          <button
            type="button"
            onClick={() => navigate("/report")}
            className="mb-6 text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition relative"
          >
            {anomalyCount > 0 && (
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
            )}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-800">Trend Watch</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {isFilterActive(filters)
                    ? `${anomalyCount} of ${totalAnomalies} anomalies match filters`
                    : `${anomalyCount} anomal${anomalyCount === 1 ? "y" : "ies"} flagged`}{" "}
                  — open Fraud Report
                </p>
              </div>
            </div>
          </button>

          <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800">Trend Watch signals</h2>
              <span className="text-xs text-gray-400">
                {isFilterActive(filters)
                  ? `Filtered view · ${anomalyCount}/${totalAnomalies}`
                  : `${totalAnomalies} total`}
              </span>
            </div>
            {filteredAnomalies.length === 0 ? (
              <p className="text-sm text-gray-500">
                {totalAnomalies === 0
                  ? "No anomalies loaded yet."
                  : "No anomalies match the active filters. Try Clear all or a different preset above."}
              </p>
            ) : (
              <ul className="space-y-3">
                {filteredAnomalies.map((a) => (
                  <li
                    key={a.id}
                    className="border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{a.detail}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded">
                        {a.period}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {activeView === "menu" && (
            <div className="flex-1 flex flex-col">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-4">
                Select a Report Template
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveView("upload_general")}
                  className="text-left bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-brand-blue cursor-pointer transition-all flex flex-col gap-4 group"
                >
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-blue group-hover:scale-110 transition duration-300">
                    <BarChart3 size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-800 mb-2">General Report</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Standard metrics from your upload. LLM builds KPIs and charts from a data
                      snippet.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView("upload_transactions")}
                  className="text-left bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-indigo-500 cursor-pointer transition-all flex flex-col gap-4 group"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition duration-300">
                    <ShieldAlert size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-800 mb-2">
                      Transactions Analysis Report
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Monthly Fraud Detection deck from portfolio performance and risk MoM evidence.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView("upload_risk")}
                  className="text-left bg-white rounded-3xl p-8 border border-gray-200 shadow-sm hover:shadow-xl hover:border-rose-500 cursor-pointer transition-all flex flex-col gap-4 group"
                >
                  <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition duration-300">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-800 mb-2">Risk Report</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Interactive enterprise risk matrix with category drill-downs and approvals.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeView === "upload_general" &&
            renderUploadWindow(
              "General Report",
              "Upload standard metric files for a generic performance deck.",
            )}
          {activeView === "upload_transactions" &&
            renderUploadWindow(
              "Transactions Analysis Report",
              "Upload transaction logs — the deck is compiled from SQLite fraud evidence.",
            )}
          {activeView === "upload_risk" &&
            renderUploadWindow(
              "Risk Analysis",
              "Upload incident files — risk rollup uses the shell timeframe filters.",
            )}
        </div>

        <div className="w-full xl:w-96 flex-shrink-0 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col max-h-[320px]">
            <div className="p-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50 rounded-t-3xl">
              <Clock size={20} className="text-brand-blue" />
              <h2 className="font-bold text-gray-800 text-lg">Report History</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {REPORT_HISTORY.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="w-full text-left p-4 border border-gray-100 rounded-2xl hover:bg-blue-50/50 hover:border-blue-100 cursor-pointer transition group shadow-sm"
                  onClick={() => {
                    if (item.type === "risk") navigate("/report/risk");
                    else if (item.type === "transactions") navigate("/report");
                    else if (item.type === "moc") navigate("/moc");
                    else navigate("/report/general");
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center border border-gray-100 group-hover:text-brand-blue group-hover:bg-blue-50 transition shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight group-hover:text-brand-blue transition">
                        {item.text}
                      </h3>
                      <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wide">
                        {item.date}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col min-h-[420px] flex-1">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50/50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-brand-blue" />
                <h3 className="font-semibold text-gray-800">Assistant</h3>
              </div>
              <button
                type="button"
                className="text-xs bg-brand-blue text-white px-3 py-1.5 rounded-full hover:bg-indigo-700"
                onClick={() => void handleNewChat()}
              >
                + New chat
              </button>
            </div>

            {chatError && (
              <p className="mx-4 mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {chatError}
              </p>
            )}

            <div className="px-4 pt-3 max-h-28 overflow-y-auto border-b border-gray-50">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Sessions
              </h4>
              <div className="space-y-1 pb-2">
                {chatHistory.map((chat) => (
                  <button
                    type="button"
                    key={chat.id}
                    onClick={() => void openSession(chat.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs ${
                      sessionId === chat.id
                        ? "bg-blue-50 text-brand-blue"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="font-medium truncate block">{chat.title}</span>
                    <span className="text-[10px] text-gray-400">{formatTime(chat.updatedAt)}</span>
                  </button>
                ))}
                {chatHistory.length === 0 && (
                  <p className="text-xs text-gray-400 pb-2">No sessions yet.</p>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto bg-gray-50/50 min-h-[180px]">
              {activeChat.length === 0 && (
                <p className="text-sm text-gray-400">
                  Ask about evidence, or say “filter to phishing”.
                </p>
              )}
              {activeChat.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                    msg.role === "user"
                      ? "self-end bg-brand-blue text-white rounded-2xl rounded-tr-sm px-3 py-2"
                      : "self-start bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isTyping && (
                <div className="self-start bg-white border border-gray-100 text-gray-500 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t rounded-b-3xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Message the assistant..."
                  className="w-full bg-gray-100 border-transparent rounded-full py-2.5 pl-4 pr-10 text-sm focus:bg-white focus:ring-2 focus:ring-brand-blue outline-none transition"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleSendChat()}
                  disabled={isTyping}
                />
                <button
                  type="button"
                  onClick={() => void handleSendChat()}
                  disabled={isTyping || !chatPrompt.trim()}
                  className={`absolute right-1.5 top-1.5 w-7 h-7 rounded-full flex items-center justify-center transition ${
                    isTyping || !chatPrompt.trim()
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "bg-brand-blue text-white hover:bg-indigo-700"
                  }`}
                >
                  <Send size={12} className="ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
