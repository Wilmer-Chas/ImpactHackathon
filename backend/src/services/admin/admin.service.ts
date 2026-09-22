import type { AdminOverview, PiiFlag, PiiFlagAction } from "../../domain/admin/admin.js";
import * as adminRepo from "../../repository/admin.repository.js";

export const adminService = {
  getOverview(): AdminOverview {
    return {
      kpis: adminRepo.getAdminKpis(),
      runsSeries: adminRepo.listPipelineRuns(),
      models: adminRepo.listAiModels(),
      flagged: adminRepo.listPendingPiiFlags(),
    };
  },

  applyFlagAction(id: string, action: PiiFlagAction): PiiFlag | null {
    const existing = adminRepo.getPiiFlagById(id);
    if (!existing) {
      return null;
    }
    return adminRepo.applyPiiFlagAction(id, action);
  },
};
