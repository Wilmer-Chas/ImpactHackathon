export type ReleasePlan = {
  id: string;
  name: string;
  windowStart: string;
  windowEnd: string;
  freezeActive: boolean;
  auditPeriodActive: boolean;
  changeIds: string[];
};