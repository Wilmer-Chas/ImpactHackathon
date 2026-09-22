import type { ReportSchedule } from "../../domain/ops/schedule.js";
import * as scheduleRepo from "../../repository/schedule.repository.js";

export const scheduleService = {
  list(): ReportSchedule[] {
    return scheduleRepo.listReportSchedules();
  },

  create(input: {
    name: string;
    cadence: string;
    nextRun: string;
    enabled?: boolean;
  }): ReportSchedule {
    return scheduleRepo.createReportSchedule(input);
  },

  update(
    id: string,
    patch: Partial<Pick<ReportSchedule, "name" | "cadence" | "nextRun" | "enabled">>,
  ): ReportSchedule | null {
    return scheduleRepo.updateReportSchedule(id, patch);
  },

  remove(id: string): boolean {
    return scheduleRepo.deleteReportSchedule(id);
  },
};
