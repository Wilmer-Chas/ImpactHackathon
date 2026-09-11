export type PipelineStepId =
  | "sources"
  | "extract"
  | "clean"
  | "model"
  | "analytics"
  | "report";

export type PipelineStep = {
  id: PipelineStepId;
  label: string;
  shortLabel: string;
  description: string;
};

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "sources",
    label: "Data sources",
    shortLabel: "Sources",
    description: "See which sample data feeds this review for Change #1001.",
  },
  {
    id: "extract",
    label: "Collect data",
    shortLabel: "Collect",
    description: "Pull the sample records together in one place.",
  },
  {
    id: "clean",
    label: "Clean data",
    shortLabel: "Clean",
    description: "Fix formats and spot missing information.",
  },
  {
    id: "model",
    label: "Build one view",
    shortLabel: "Combine",
    description: "Combine the cleaned data into one clear picture of TM-Core.",
  },
  {
    id: "analytics",
    label: "Check for risks",
    shortLabel: "Checks",
    description: "Run simple risk checks on that combined picture.",
  },
  {
    id: "report",
    label: "Change report",
    shortLabel: "Report",
    description: "Create a short go / wait recommendation for the product owner.",
  },
];

export const SOURCE_ROWS = [
  { name: "Change list", detail: "Change #1001 — lower alert thresholds", records: 1 },
  { name: "Incidents", detail: "Recent problems on TM-Core", records: 3 },
  { name: "Risk list", detail: "How risky this type of change usually is", records: 3 },
  { name: "Workload", detail: "How many alerts are waiting", records: 2 },
  { name: "System health", detail: "Whether jobs are meeting targets", records: 2 },
  { name: "Release plan", detail: "When this change is planned to ship", records: 1 },
  { name: "Data gaps", detail: "Where information is missing", records: 2 },
];

export const EXTRACT_LOG = [
  "Opening the sample change list…",
  "Found Change #1001 for TM-Core.",
  "Found 3 incidents (2 related to TM-Core).",
  "Loaded risk, release, and health data.",
  "Done. 14 records are ready for cleaning.",
];

export const CLEAN_CHECKS = [
  { label: "Dates are in a consistent format", status: "ok" as const },
  { label: "Severity labels are consistent", status: "ok" as const },
  { label: "App names match TM-Core", status: "ok" as const },
  { label: "Incident INC-4388 is missing a root cause", status: "warn" as const },
  { label: "No duplicate change IDs", status: "ok" as const },
];

export const MODEL_ENTITIES = [
  { entity: "Change", count: 1, note: "The change under review" },
  { entity: "Incidents", count: 2, note: "Problems linked to TM-Core" },
  { entity: "Workload", count: 2, note: "Backlog and delays" },
  { entity: "System health", count: 2, note: "Success rate and speed" },
  { entity: "Risk type", count: 1, note: "Rule threshold changes" },
  { entity: "Release", count: 1, note: "September release" },
  { entity: "Data gaps", count: 2, note: "Missing fields" },
];

export const ANALYTICS_RULES = [
  { code: "stability_open_high_incident", label: "Serious open incident?", result: "triggered" as const },
  { code: "operational_load", label: "Backlog already high?", result: "triggered" as const },
  { code: "change_class_high_residual", label: "High-risk change type?", result: "triggered" as const },
  { code: "release_timing", label: "Bad timing for release?", result: "triggered" as const },
  { code: "performance_sla_breach", label: "System below target?", result: "triggered" as const },
  { code: "evidence_confidence", label: "Missing information?", result: "triggered" as const },
];
