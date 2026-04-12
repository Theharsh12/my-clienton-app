import { ClientRow } from "@/types/client";

export function calcProgress(r: any): number {
  if (!r) return 0;
  const fields = [
    r.business_name, r.business_description, r.target_audience,
    r.competitors, r.website_goal, r.budget, r.timeline,
    r.pages_needed?.length > 0 ? "x" : "",
  ];
  return Math.round(fields.filter(Boolean).length / 8 * 100);
}

export function deriveState(status: string, progress: number, updatedAt: string | null, linkOpenedAt?: string | null): ClientRow["client_state"] {
  if (status === "completed") return "completed";
  if (progress === 0 && !linkOpenedAt) return "not_started";
  if (updatedAt) {
    const hoursAgo = (Date.now() - new Date(updatedAt).getTime()) / 36e5;
    if (hoursAgo > 48) return "needs_followup";
  }
  return "in_progress";
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export const AVATAR_COLORS = [
  ["#7C6EF2","#9B8FF5"], ["#F59E0B","#F7B731"], ["#34D399","#10B981"],
  ["#60A5FA","#3B82F6"], ["#F472B6","#EC4899"], ["#EF4444","#DC2626"], ["#8B5CF6","#7C3AED"],
];
export const INITIALS = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);
