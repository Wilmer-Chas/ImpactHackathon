import type { CustomerNote } from "../domain/index.js";
import { getDb } from "../db/client.js";

type CustomerNoteRow = {
  id: string;
  customer_id: string;
  channel: string;
  recorded_at: string;
  author: string | null;
  body: string;
};

function mapCustomerNote(row: CustomerNoteRow): CustomerNote {
  return {
    id: row.id,
    customerId: row.customer_id,
    channel: row.channel as CustomerNote["channel"],
    recordedAt: row.recorded_at,
    author: row.author,
    body: row.body,
  };
}

export function getCustomerNoteById(id: string): CustomerNote | null {
  const row = getDb().prepare("SELECT * FROM customer_notes WHERE id = ?").get(id) as
    | CustomerNoteRow
    | undefined;
  return row ? mapCustomerNote(row) : null;
}

export function listAllCustomerNotes(): CustomerNote[] {
  const rows = getDb().prepare("SELECT * FROM customer_notes").all() as CustomerNoteRow[];
  return rows.map(mapCustomerNote);
}
