/** Database access layer — maps SQLite rows to domain types. Services must not run SQL. */

export {
  getChangeById,
  listAllChanges,
  listChangesByIds,
} from "./change.repository.js";

export {
  getIncidentById,
  listAllIncidents,
  listIncidentsByApplication,
} from "./incident.repository.js";

export {
  getPerformanceMetricByEntityId,
  getProcessMetricByEntityId,
  listAllPerformanceMetrics,
  listAllProcessMetrics,
  listPerformanceMetricsByApplication,
  listProcessMetricsByApplication,
} from "./metrics.repository.js";

export {
  getRiskByChangeType,
  listAllRiskRecords,
} from "./risk.repository.js";

export {
  getPrimaryRelease,
  getReleaseById,
  getReleaseForChange,
} from "./release.repository.js";

export {
  getDataQualityByEntityId,
  listAllDataQuality,
} from "./dataQuality.repository.js";

export { listEmbeddedChunks } from "./evidenceChunk.repository.js";

export {
  appendChatMessage,
  createChatSession,
  getChatSession,
  listChatSessions,
} from "./chat.repository.js";

export {
  applyPiiFlagAction,
  getAdminKpis,
  getPiiFlagById,
  listAiModels,
  listPendingPiiFlags,
  listPipelineRuns,
} from "./admin.repository.js";

export {
  listAnomalyPerformancePoints,
  listDistinctPerformancePeriods,
  listPerformanceSeriesByPeriod,
  listRiskSnapshotsByPeriod,
} from "./opsSeries.repository.js";

export {
  createReportSchedule,
  deleteReportSchedule,
  getReportScheduleById,
  listReportSchedules,
  updateReportSchedule,
} from "./schedule.repository.js";

export {
  getLatestMonthlyReport,
  getMonthlyReport,
  listMonthlyReportPeriods,
  upsertMonthlyReport,
} from "./monthlyReport.repository.js";
