export type ChangeType = "rule_threshold" | "model_deploy" | "platform_release" | "data_feed";

export type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  application: string;
  changeType: ChangeType;
  owner: string;
  status: string;
  plannedReleaseId: string;
  requestedAt: string;
};