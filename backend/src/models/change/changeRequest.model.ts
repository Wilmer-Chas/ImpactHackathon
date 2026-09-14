import type { ChangeRequest } from "../../domain/change/changeRequest.js";

export type ChangeRequestModel = ChangeRequest;

export function toChangeRequest(raw: ChangeRequestModel): ChangeRequest {
  return { ...raw };
}
