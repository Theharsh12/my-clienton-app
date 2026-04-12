export interface ClientRow {
  id:             string;
  name:           string;
  email:          string | null;
  token:          string;
  status:         "pending" | "completed";
  created_at:     string;
  progress:       number;
  updated_at:     string | null;
  link_opened_at: string | null;
  client_state:   "not_started" | "in_progress" | "needs_followup" | "completed";
}
