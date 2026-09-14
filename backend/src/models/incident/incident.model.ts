import type { Incident } from "../../domain/incident/incident.js";

export type IncidentModel = Incident;

export function toIncident(raw: IncidentModel): Incident {
  return { ...raw };
}
