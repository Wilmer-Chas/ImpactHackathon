import type {
  CustomerNote,
  DataQualityIssue,
  EnterpriseRiskItem,
  EnterpriseRiskLevel,
  Incident,
  OpsAlert,
  RiskSignal,
  RiskSignalSeverity,
} from "../../domain/index.js";
import * as customerNoteRepo from "../../repository/customerNote.repository.js";
import * as dataQualityRepo from "../../repository/dataQuality.repository.js";
import * as incidentRepo from "../../repository/incident.repository.js";
import * as opsAlertRepo from "../../repository/opsAlert.repository.js";
import {
  summarizeRiskClusters,
  type RiskClusterSummaryInput,
} from "../ai/riskSummary.service.js";

const THEME_META: Record<
  string,
  { name: string; category: string; owner: string }
> = {
  "phishing-payments": {
    name: "Targeted Phishing (Payments)",
    category: "Cyber",
    owner: "InfoSec",
  },
  "model-latency": {
    name: "Model Scoring Latency",
    category: "Operational",
    owner: "TM Platform",
  },
  "vendor-sla": {
    name: "Vendor SLA Breach",
    category: "Operational",
    owner: "Compliance",
  },
  "data-completeness": {
    name: "Transaction Data Completeness",
    category: "Regulatory",
    owner: "Data Ops",
  },
  "failover-gaps": {
    name: "Legacy Failover Gaps",
    category: "IT",
    owner: "SRE",
  },
  "regulatory-filing": {
    name: "Regulatory Reporting Dependency",
    category: "Regulatory",
    owner: "Audit",
  },
  "alert-backlog": {
    name: "Investigation Alert Backlog",
    category: "Operational",
    owner: "Ops",
  },
  "ransomware-vendor": {
    name: "Ransomware via Vendor",
    category: "Cyber",
    owner: "InfoSec",
  },
  "rule-tuning-noise": {
    name: "Rule Tuning Noise",
    category: "Operational",
    owner: "Detection Eng",
  },
  "access-review": {
    name: "Privileged Access Review Lag",
    category: "Cyber",
    owner: "IAM",
  },
};

/** Keyword seeds used to map unstructured customer text onto known risk themes. */
const THEME_KEYWORDS: Record<string, string[]> = {
  "phishing-payments": [
    "phishing",
    "phish",
    "spoof",
    "spoofed",
    "credential",
    "mailbox",
    "mfa",
    "oauth",
    "payment",
    "payments",
    "invoice",
    "approver",
    "authorization",
    "password",
  ],
  "model-latency": [
    "latency",
    "scoring",
    "batch",
    "model",
    "timeout",
    "timing",
    "slow",
    "p95",
    "feature",
    "rescore",
  ],
  "vendor-sla": [
    "vendor",
    "third-party",
    "partner",
    "sla",
    "webhook",
    "enrichment",
    "enrich",
    "case sync",
    "maintenance",
  ],
  "data-completeness": [
    "missing",
    "blank",
    "null",
    "incomplete",
    "completeness",
    "beneficiary",
    "account_type",
    "wire feed",
    "truncated",
  ],
  "failover-gaps": [
    "failover",
    "standby",
    "dr drill",
    "region",
    "secondary",
    "cutover",
    "dns",
    "primary dies",
  ],
  "regulatory-filing": [
    "ctr",
    "sar export",
    "regulator",
    "filing",
    "aml report",
    "audit pack",
  ],
  "alert-backlog": [
    "backlog",
    "unassigned",
    "aging",
    "investigation queue",
    "capacity",
    "investigators",
  ],
  "ransomware-vendor": [
    "ransomware",
    "ioc",
    "lateral",
    "encrypted",
    "msp",
    "vpn anomaly",
  ],
  "rule-tuning-noise": ["false positive", "fp spike", "shadow rule", "tuning", "noise"],
  "access-review": [
    "privileged",
    "access",
    "certification",
    "orphaned",
    "admin",
    "sod",
    "iam",
  ],
};

const SEVERITY_RANK: Record<RiskSignalSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "from",
  "their",
  "they",
  "this",
  "that",
  "our",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "as",
  "at",
  "by",
  "it",
  "we",
  "you",
  "your",
  "can",
  "about",
  "after",
  "before",
  "into",
  "over",
  "under",
  "again",
  "same",
  "only",
  "just",
  "have",
  "has",
  "had",
  "not",
  "no",
  "yes",
]);

type ThemeCluster = {
  theme: string;
  signals: RiskSignal[];
};

type ThemeFingerprint = {
  theme: string;
  keywords: Set<string>;
  flaggedStructured: boolean;
  category: string;
};

function humanizeTheme(theme: string): string {
  return theme
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function themeMeta(theme: string, signals: RiskSignal[]) {
  const known = THEME_META[theme];
  if (known) return known;
  const category = signals.find((s) => s.category)?.category ?? "Operational";
  return {
    name: humanizeTheme(theme),
    category,
    owner: "Risk Ops",
  };
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

function normalizeIncident(incident: Incident): RiskSignal | null {
  const theme = incident.theme?.trim();
  if (!theme) return null;
  return {
    sourceType: "incident",
    id: incident.id,
    theme,
    tags: incident.tags ?? [],
    severity: incident.severity,
    category: incident.category ?? "Operational",
    application: incident.application,
    title: incident.title,
    status: incident.status,
    occurredAt: incident.openedAt,
    resolvedAt: incident.resolvedAt,
  };
}

function normalizeDataQuality(issue: DataQualityIssue): RiskSignal | null {
  const theme = issue.theme?.trim();
  if (!theme) return null;
  return {
    sourceType: "data_quality",
    id: `${issue.source}|${issue.field}`,
    theme,
    tags: issue.tags ?? [],
    severity: issue.severity,
    category: issue.category ?? "Regulatory",
    application: issue.source,
    title: `${issue.source}.${issue.field}: ${issue.notes}`,
    status: "unknown",
    occurredAt: null,
    resolvedAt: null,
  };
}

function normalizeOpsAlert(alert: OpsAlert): RiskSignal | null {
  const theme = alert.theme?.trim();
  if (!theme) return null;
  return {
    sourceType: "ops_alert",
    id: alert.id,
    theme,
    tags: alert.tags ?? [],
    severity: alert.severity,
    category: alert.category,
    application: alert.application,
    title: alert.title,
    status: alert.status,
    occurredAt: alert.openedAt,
    // Issue-layer resolution date lands here later (e.g. Jira). Until then,
    // a resolved status without a date means "closed" for period-end checks.
    resolvedAt: alert.status === "resolved" ? alert.openedAt : null,
  };
}

function collectStructuredSignals(): RiskSignal[] {
  const signals: RiskSignal[] = [];

  for (const incident of incidentRepo.listAllIncidents()) {
    const signal = normalizeIncident(incident);
    if (signal) signals.push(signal);
  }
  for (const issue of dataQualityRepo.listAllDataQuality()) {
    const signal = normalizeDataQuality(issue);
    if (signal) signals.push(signal);
  }
  for (const alert of opsAlertRepo.listAllOpsAlerts()) {
    const signal = normalizeOpsAlert(alert);
    if (signal) signals.push(signal);
  }

  return signals;
}

/**
 * Build per-theme fingerprints from lexicon + titles of already flagged (high-risk) structured signals.
 * Unstructured notes never carry risk tags; they inherit theme via similarity to these fingerprints.
 */
export function buildThemeFingerprints(structured: RiskSignal[]): ThemeFingerprint[] {
  const byTheme = new Map<string, ThemeFingerprint>();

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    const meta = THEME_META[theme];
    byTheme.set(theme, {
      theme,
      keywords: new Set(keywords.flatMap((k) => tokenize(k))),
      flaggedStructured: false,
      category: meta?.category ?? "Operational",
    });
  }

  for (const signal of structured) {
    let fp = byTheme.get(signal.theme);
    if (!fp) {
      fp = {
        theme: signal.theme,
        keywords: new Set(),
        flaggedStructured: false,
        category: signal.category,
      };
      byTheme.set(signal.theme, fp);
    }
    for (const token of tokenize(`${signal.title} ${signal.theme}`)) {
      fp.keywords.add(token);
    }
    if (signal.tags.includes("high-risk")) {
      fp.flaggedStructured = true;
    }
  }

  return [...byTheme.values()].filter((fp) => fp.keywords.size > 0);
}

function scoreNoteAgainstTheme(noteTokens: Set<string>, fingerprint: ThemeFingerprint): number {
  let hits = 0;
  for (const keyword of fingerprint.keywords) {
    if (noteTokens.has(keyword)) hits += 1;
  }
  // Multi-word lexicon entries already tokenized; also boost substring phrases in original later via hits.
  return hits;
}

/**
 * Infer risk signals from unstructured customer notes.
 * - Theme comes from similarity to flagged/known themes (never from a tag on the note).
 * - tags stay empty (no high-risk label on unstructured source).
 * - severity reflects match strength + whether the matched theme is already flagged elsewhere.
 * - Notes with weak similarity are dropped (noise).
 */
export function inferCustomerNoteSignals(
  notes: CustomerNote[],
  structured: RiskSignal[],
): RiskSignal[] {
  const fingerprints = buildThemeFingerprints(structured);
  if (fingerprints.length === 0 || notes.length === 0) return [];

  type Match = { note: CustomerNote; theme: string; score: number; flagged: boolean; category: string };
  const matches: Match[] = [];

  for (const note of notes) {
    const noteTokens = new Set(tokenize(note.body));
    let best: Match | null = null;
    for (const fp of fingerprints) {
      const score = scoreNoteAgainstTheme(noteTokens, fp);
      if (score < 2) continue;
      if (!best || score > best.score) {
        best = {
          note,
          theme: fp.theme,
          score,
          flagged: fp.flaggedStructured,
          category: fp.category,
        };
      }
    }
    if (best) matches.push(best);
  }

  // Frequency: how often each theme is referenced across unstructured notes.
  const themeFrequency = new Map<string, number>();
  for (const match of matches) {
    themeFrequency.set(match.theme, (themeFrequency.get(match.theme) ?? 0) + 1);
  }

  return matches.map((match) => {
    const frequency = themeFrequency.get(match.theme) ?? 1;
    let severity: RiskSignalSeverity = "low";
    if (match.flagged && (match.score >= 3 || frequency >= 4)) {
      severity = "high";
    } else if (match.flagged || match.score >= 3 || frequency >= 3) {
      severity = "medium";
    }

    return {
      sourceType: "customer_note" as const,
      id: match.note.id,
      theme: match.theme,
      tags: [], // unstructured: never invent a high-risk tag
      severity,
      category: match.category,
      application: match.note.customerId,
      title: match.note.body.slice(0, 140),
      status: "open" as const,
      occurredAt: match.note.recordedAt,
      resolvedAt: null,
    };
  });
}

export type RiskTimeRange = {
  from: string;
  to: string;
};

/**
 * Still material for the AI at the end of [from, to]:
 * - opened on or before `to`
 * - not resolved on or before `to`
 *
 * Example: opened Sep 8, resolved Sep 13
 * - window Sep 8–11 → still flagged (resolved after window end)
 * - window Sep 8–16 → not flagged (resolved inside window)
 */
export function isOpenAtPeriodEnd(
  occurredAt: string | null,
  resolvedAt: string | null,
  to: string,
): boolean {
  if (!occurredAt || occurredAt > to) return false;
  if (resolvedAt && resolvedAt <= to) return false;
  return true;
}

function inRecordedWindow(occurredAt: string | null, from: string, to: string): boolean {
  if (!occurredAt) return false;
  return occurredAt >= from && occurredAt <= to;
}

/**
 * Collect signals scoped to a timeframe.
 * Incidents/alerts: must still be open at period end (resolution is issue-layer / Jira later).
 * Customer notes: recorded inside the window (supporting frequency).
 * Data quality: undated — excluded from period-scoped evidence.
 */
export function collectRiskSignals(range: RiskTimeRange): RiskSignal[] {
  const structuredAll = collectStructuredSignals();
  const structured = structuredAll.filter((s) => {
    if (s.sourceType === "data_quality") return false;
    return isOpenAtPeriodEnd(s.occurredAt, s.resolvedAt, range.to);
  });

  const notes = customerNoteRepo
    .listAllCustomerNotes()
    .filter((n) => inRecordedWindow(n.recordedAt, range.from, range.to));

  // Fingerprints still use period-open structured signals (already-flagged themes in window).
  const inferred = inferCustomerNoteSignals(notes, structured);
  return [...structured, ...inferred];
}

export function clusterSignalsByTheme(signals: RiskSignal[]): ThemeCluster[] {
  const byTheme = new Map<string, RiskSignal[]>();
  for (const signal of signals) {
    const list = byTheme.get(signal.theme) ?? [];
    list.push(signal);
    byTheme.set(signal.theme, list);
  }
  return [...byTheme.entries()].map(([theme, themeSignals]) => ({
    theme,
    signals: themeSignals,
  }));
}

function maxSeverity(signals: RiskSignal[]): RiskSignalSeverity {
  let max: RiskSignalSeverity = "low";
  for (const signal of signals) {
    if (SEVERITY_RANK[signal.severity] > SEVERITY_RANK[max]) {
      max = signal.severity;
    }
  }
  return max;
}

function toEnterpriseLevel(value: "high" | "medium" | "low"): EnterpriseRiskLevel {
  if (value === "high") return "High";
  if (value === "medium") return "Med";
  return "Low";
}

function scoreCluster(signals: RiskSignal[]): {
  likelihood: EnterpriseRiskLevel;
  impact: EnterpriseRiskLevel;
  highRiskCount: number;
  openCount: number;
  rankScore: number;
} {
  const highRiskCount = signals.filter((s) => s.tags.includes("high-risk")).length;
  const openCount = signals.filter((s) => s.status === "open").length;
  const highSeverityCount = signals.filter((s) => s.severity === "high").length;
  const unstructuredCount = signals.filter((s) => s.sourceType === "customer_note").length;
  const peak = maxSeverity(signals);

  let likelihoodBand: "high" | "medium" | "low" = "low";
  // Already-flagged themes + repeated unstructured references elevate likelihood.
  if (
    highRiskCount >= 4 ||
    (highRiskCount >= 2 && openCount >= 6) ||
    (highRiskCount >= 2 && unstructuredCount >= 4) ||
    unstructuredCount >= 8
  ) {
    likelihoodBand = "high";
  } else if (
    highRiskCount >= 1 ||
    openCount >= 4 ||
    highSeverityCount >= 3 ||
    unstructuredCount >= 3
  ) {
    likelihoodBand = "medium";
  }

  let impactBand: "high" | "medium" | "low" = "low";
  if (
    peak === "high" &&
    (highRiskCount >= 2 || highSeverityCount >= 3 || (highRiskCount >= 1 && unstructuredCount >= 3))
  ) {
    impactBand = "high";
  } else if (peak === "high" || highRiskCount >= 1 || unstructuredCount >= 4) {
    impactBand = "medium";
  }

  const rankScore =
    highRiskCount * 100 +
    unstructuredCount * 25 +
    SEVERITY_RANK[peak] * 20 +
    openCount * 5 +
    highSeverityCount * 3 +
    signals.length;

  return {
    likelihood: toEnterpriseLevel(likelihoodBand),
    impact: toEnterpriseLevel(impactBand),
    highRiskCount,
    openCount,
    rankScore,
  };
}

function unifiedRiskId(theme: string): string {
  return `RSK-${theme}`;
}

function buildDeterministicRisk(
  cluster: ThemeCluster,
  description: string,
): EnterpriseRiskItem & { rankScore: number; highRiskCount: number } {
  const meta = themeMeta(cluster.theme, cluster.signals);
  const scored = scoreCluster(cluster.signals);
  const sourceTypes = [...new Set(cluster.signals.map((s) => s.sourceType))];
  const evidenceRefs = cluster.signals.map((s) => s.id);

  return {
    id: unifiedRiskId(cluster.theme),
    name: meta.name,
    category: meta.category,
    likelihood: scored.likelihood,
    impact: scored.impact,
    owner: meta.owner,
    description,
    evidenceCount: cluster.signals.length,
    evidenceRefs,
    sourceTypes,
    rankScore: scored.rankScore,
    highRiskCount: scored.highRiskCount,
  };
}

export async function listUnifiedRisks(range: RiskTimeRange): Promise<EnterpriseRiskItem[]> {
  const signals = collectRiskSignals(range);
  const clusters = clusterSignalsByTheme(signals);
  if (clusters.length === 0) {
    return [];
  }

  const summaryInputs: RiskClusterSummaryInput[] = clusters.map((cluster) => {
    const meta = themeMeta(cluster.theme, cluster.signals);
    return {
      id: unifiedRiskId(cluster.theme),
      name: meta.name,
      category: meta.category,
      evidenceSample: cluster.signals.slice(0, 8).map((s) => ({
        id: s.id,
        title: s.title,
        sourceType: s.sourceType,
      })),
    };
  });

  const summaries = await summarizeRiskClusters(summaryInputs);

  const ranked = clusters
    .map((cluster) => {
      const id = unifiedRiskId(cluster.theme);
      return buildDeterministicRisk(
        cluster,
        summaries[id] ?? `${themeMeta(cluster.theme, cluster.signals).name}.`,
      );
    })
    .sort((a, b) => {
      if (b.highRiskCount !== a.highRiskCount) return b.highRiskCount - a.highRiskCount;
      if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
      return a.id.localeCompare(b.id);
    });

  return ranked.map(({ rankScore: _rank, highRiskCount: _hr, ...item }) => item);
}
