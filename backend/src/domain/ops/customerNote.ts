export type CustomerNoteChannel =
  | "email"
  | "call"
  | "chat"
  | "complaint"
  | "crm_note";

/**
 * Unstructured customer narrative — no theme, tags, severity, or risk labels.
 * Risk is inferred later by similarity to flagged structured signals + reference frequency.
 */
export type CustomerNote = {
  id: string;
  customerId: string;
  channel: CustomerNoteChannel;
  recordedAt: string;
  author: string | null;
  body: string;
};
