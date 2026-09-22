import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  LayoutTemplate,
  MessageSquare,
  Paperclip,
  Send,
  TrendingUp,
  X,
} from "lucide-react";
import { useAppFilters } from "../../context/AppFilterContext";
import { filterByAppFilters, isFilterActive } from "../../lib/applyFilters";
import { FilterStatusBanner } from "../../components/filters/FilterStatusBanner";
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  sendChatMessage,
} from "../../services/api/chat.api";
import { fetchTrends, generateMonthlyReport } from "../../services/api/ops.api";
import type { ChatMessage, ChatSessionSummary } from "../../types/chat";
import type { TrendsResponse } from "../../types/ops";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function EmployeeHomePage() {
  const navigate = useNavigate();
  const { filters, setFilters, clearFilters } = useAppFilters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSessionSummary[]>([]);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
  }, [activeChat, isTyping, uploadedFiles]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeFile(indexToRemove: number) {
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  async function generateDeck() {
    if (uploadedFiles.length === 0) return;
    setIsUploading(true);
    setActionError(null);
    const fileName = uploadedFiles[0].name.toLowerCase();

    try {
      if (fileName.includes("risk")) {
        await new Promise((r) => setTimeout(r, 800));
        navigate("/report/risk");
        return;
      }
      const report = await generateMonthlyReport();
      navigate(`/report/${report.period}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not generate deck");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSend() {
    if (!prompt.trim() || isTyping || isUploading) return;
    const userText = prompt.trim();
    setPrompt("");
    setIsTyping(true);
    setActionError(null);

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
      const text =
        err instanceof Error ? err.message : "Error connecting to the server.";
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
    setActionError(null);
    try {
      const session = await createChatSession();
      setSessionId(session.id);
      setActiveChat([]);
      await refreshSessions();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create chat");
    }
  }

  async function openSession(id: string) {
    setActionError(null);
    try {
      const session = await getChatSession(id);
      setSessionId(session.id);
      setActiveChat(session.messages);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load chat");
    }
  }

  async function handleNewMonthlyReport() {
    setBusyAction("report");
    setActionError(null);
    try {
      const report = await generateMonthlyReport();
      navigate(`/report/${report.period}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not generate report");
    } finally {
      setBusyAction(null);
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

  return (
    <div className="max-w-6xl mx-auto p-8 flex gap-8 h-full">
      <div className="flex-1 flex flex-col h-full">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Good afternoon, Kaif</h1>
          <p className="text-gray-500 mb-6">Here&apos;s what you can do today.</p>

          <FilterStatusBanner
            noun="anomalies"
            shown={anomalyCount}
            total={totalAnomalies}
          />

          {actionError && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {actionError}
            </p>
          )}

          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => void handleNewMonthlyReport()}
                disabled={busyAction === "report"}
                className="text-left bg-brand-blue rounded-xl p-4 text-white shadow-sm cursor-pointer hover:bg-indigo-700 transition disabled:opacity-60"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-6">
                  <FileText size={18} />
                </div>
                <h3 className="font-semibold text-sm">New Monthly Report</h3>
                <p className="text-xs text-white/70 mt-1">
                  {busyAction === "report" ? "Generating…" : "Generate standard performance deck"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate("/report/risk")}
                className="text-left bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-6 text-gray-600">
                  <LayoutTemplate size={18} />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Risk Analysis</h3>
                <p className="text-xs text-gray-500 mt-1">Drill-down interactive risk report</p>
              </button>

              <button
                type="button"
                onClick={() => navigate("/report")}
                className="text-left bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition relative"
              >
                {anomalyCount > 0 && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
                )}
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center mb-6 text-teal-600">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Trend Watch</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {isFilterActive(filters)
                    ? `${anomalyCount} of ${totalAnomalies} anomalies match filters`
                    : `${anomalyCount} anomal${anomalyCount === 1 ? "y" : "ies"} flagged`}
                </p>
              </button>
            </div>
          </div>

          <div className="mb-6 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-800">General Assistant</h3>
              <p className="text-xs text-gray-500">
                Ask about evidence, or say “filter to phishing” — filters also work from the bar above
                without chat.
              </p>
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto bg-gray-50/50">
            {activeChat.length === 0 && (
              <p className="text-sm text-gray-400">Start a conversation or open a history thread.</p>
            )}
            {activeChat.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "self-end bg-brand-blue text-white rounded-2xl rounded-tr-sm px-4 py-2"
                    : "self-start bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isTyping && (
              <div className="self-start bg-white border border-gray-100 text-gray-500 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
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

          <div className="p-4 bg-white border-t">
            {uploadedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center gap-2 bg-blue-50 text-brand-blue px-3 py-1.5 rounded-full text-xs font-medium border border-blue-100"
                  >
                    <FileText size={12} />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative flex items-center gap-2">
              <div className="relative flex items-center flex-1">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  multiple
                  hidden
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute left-2 w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center transition"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  type="text"
                  placeholder={
                    isUploading ? "Scanning files..." : "Message the assistant or upload data..."
                  }
                  className="w-full bg-gray-100 border-transparent rounded-full py-3 pl-12 pr-12 text-sm focus:bg-white focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                  disabled={isTyping || isUploading}
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isTyping || (!prompt.trim() && uploadedFiles.length === 0)}
                  className={`absolute right-2 w-8 h-8 rounded-full flex items-center justify-center transition ${
                    isTyping || (!prompt.trim() && uploadedFiles.length === 0)
                      ? "bg-gray-300 text-white cursor-not-allowed"
                      : "bg-brand-blue text-white hover:bg-indigo-700"
                  }`}
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </div>
              {uploadedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => void generateDeck()}
                  disabled={isUploading}
                  className="bg-brand-blue text-white px-4 py-3 rounded-full text-sm font-semibold hover:bg-indigo-700 transition flex items-center whitespace-nowrap shadow-sm disabled:opacity-60"
                >
                  {isUploading ? "Scanning..." : "Generate Deck"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[700px] shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Chat History</h3>
          <button
            type="button"
            className="text-xs bg-brand-blue text-white px-3 py-1.5 rounded-full hover:bg-indigo-700"
            onClick={() => void handleNewChat()}
          >
            + New chat
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Today
          </h4>
          <div className="space-y-1 mb-6">
            {chatHistory.map((chat) => (
              <button
                type="button"
                key={chat.id}
                onClick={() => void openSession(chat.id)}
                className={`w-full text-left p-3 rounded-lg cursor-pointer ${
                  sessionId === chat.id
                    ? "bg-blue-50 text-brand-blue"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <p className="text-sm font-medium truncate">{chat.title}</p>
                <p
                  className={`text-xs mt-1 ${
                    sessionId === chat.id ? "text-blue-400" : "text-gray-400"
                  }`}
                >
                  {formatTime(chat.updatedAt)}
                </p>
              </button>
            ))}
            {chatHistory.length === 0 && (
              <p className="text-sm text-gray-400">No sessions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
