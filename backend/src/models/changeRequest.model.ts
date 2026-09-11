import type { ChangeRequest } from "../domain/changeRequest.js";

export type ChangeRequestModel = ChangeRequest;

export function toChangeRequest(raw: ChangeRequestModel): ChangeRequest {
  return { ...raw };
}