export type ProcessMetric = {
  application: string;
  processName: string;
  alertVolume: number;
  backlogCount: number;
  delayHours: number;
  timestamp: string;
};

export type PerformanceMetric = {
  application: string;
  metricName: string;
  value: number;
  unit: string;
  slaTarget: number;
  timestamp: string;
};