import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  FileText,
  LayoutTemplate,
  MessageSquare,
  Send,
  TrendingUp,
  X,
} from "lucide-react";
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  sendChatMessage,
} from "../../services/api/chat.api";
import {
  createSchedule,
  deleteSchedule,
  fetchTrends,
  generateMonthlyReport,
  listSchedules,
  patchSchedule,
} from "../../services/api/ops.api";
import type { ChatMessage, ChatSessionSummary } from "../../types/chat";
import type { ReportSchedule, TrendsResponse } from "../../types/ops";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function EmployeeHomePage() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSessionSummary[]>([]);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [trendOpen, setTrendOpen] = useState(false);
  const [schedulesOpen, setSchedulesOpen] = useState(false);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  async function handleSend() {
    if (!prompt.trim() || isTyping) return;
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

  async function openSchedules() {
    setSchedulesOpen(true);
    setActionError(null);
    try {
      setSchedules(await listSchedules());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load schedules");
    }
  }

  async function toggleSchedule(schedule: ReportSchedule) {
    const updated = await patchSchedule(schedule.id, { enabled: !schedule.enabled });
    setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function addSchedule() {
    const created = await createSchedule({
      name: "Custom monthly report",
      cadence: "monthly",
      nextRun: new Date().toISOString().slice(0, 10),
      enabled: true,
    });
    setSchedules((prev) => [...prev, created]);
  }

  async function removeSchedule(id: string) {
    await deleteSchedule(id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="max-w-6xl mx-auto p-8 flex gap-8 h-full">
      <div className="flex-1 flex flex-col h-full">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Good afternoon</h1>
          <p className="text-gray-500 mb-6">Here&apos;s what you can do today.</p>

          {actionError && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {actionError}
            </p>
          )}

          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => void handleNewMonthlyReport()}
                disabled={busyAction === "report"}
                className="text-left bg-brand-blue rounded-xl p-4 text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mb-6">
                  <FileText size={18} />
                </div>
                <h3 className="font-semibold text-sm">New Monthly Report</h3>
                <p className="text-xs text-white/70 mt-1">
                  {busyAction === "report" ? "Generating…" : "Generate this period's deck"}
                </p>
              </button>

              <button
                type="button"
                onClick={() => navigate("/report")}
                className="text-left bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-6 text-gray-600">
                  <LayoutTemplate size={18} />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Open a Deck</h3>
                <p className="text-xs text-gray-500 mt-1">Open the latest monthly report</p>
              </button>

              <button
                type="button"
                onClick={() => setTrendOpen(true)}
                className="text-left bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition relative"
              >
                {(trends?.anomalyCount ?? 0) > 0 && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500" />
                )}
                <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center mb-6 text-teal-600">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Trend Watch</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {trends?.anomalyCount ?? 0} anomal
                  {(trends?.anomalyCount ?? 0) === 1 ? "y" : "ies"} flagged
                </p>
              </button>

              <button
                type="button"
                onClick={() => void openSchedules()}
                className="text-left bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition"
              >
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-6 text-orange-500">
                  <CalendarClock size={18} />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">Scheduled Reports</h3>
                <p className="text-xs text-gray-500 mt-1">Manage upcoming monthly reports</p>
              </button>
            </div>
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
                Grounded in portfolio evidence — ask about changes, incidents, or risk.
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
            <div className="relative">
              <input
                type="text"
                placeholder="Message the assistant..."
                className="w-full bg-gray-100 border-transparent rounded-full py-3 pl-4 pr-12 text-sm focus:bg-white focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleSend()}
                disabled={isTyping}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isTyping || !prompt.trim()}
                className={`absolute right-2 top-1.5 w-8 h-8 rounded-full flex items-center justify-center transition ${
                  isTyping || !prompt.trim()
                    ? "bg-gray-300 text-white cursor-not-allowed"
                    : "bg-brand-blue text-white hover:bg-indigo-700"
                }`}
              >
                <Send size={14} className="ml-0.5" />
              </button>
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
            Sessions
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

      {trendOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Trend Watch</h3>
              <button type="button" onClick={() => setTrendOpen(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(trends?.anomalies ?? []).map((a) => (
                <div key={a.id} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{a.detail}</p>
                </div>
              ))}
              {(trends?.anomalies.length ?? 0) === 0 && (
                <p className="text-sm text-gray-500">No anomalies flagged.</p>
              )}
            </div>
            <button
              type="button"
              className="mt-4 text-sm text-brand-blue hover:underline"
              onClick={() => {
                setTrendOpen(false);
                const period = trends?.anomalies[0]?.period;
                navigate(period ? `/report/${period}` : "/report");
              }}
            >
              Open related report →
            </button>
          </div>
        </div>
      )}

      {schedulesOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Scheduled Reports</h3>
              <button type="button" onClick={() => setSchedulesOpen(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.cadence} · next {s.nextRun}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`text-xs px-2 py-1 rounded ${
                        s.enabled
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}
                      onClick={() => void toggleSchedule(s)}
                    >
                      {s.enabled ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 border border-red-100"
                      onClick={() => void removeSchedule(s.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="text-sm bg-brand-blue text-white px-3 py-2 rounded-lg"
              onClick={() => void addSchedule()}
            >
              + Add schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
