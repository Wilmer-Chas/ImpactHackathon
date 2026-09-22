/** Database access layer — maps SQLite rows to domain types. Services must not run SQL. */

export {
  getChangeById,
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
