import React from "react";
import { ClientRow } from "@/types/client";

export function StateBadge({ state }: { state: ClientRow["client_state"] }) {
  const config = {
    not_started:    { label: "Link Not Opened",     cls: "bg-zinc-800/60 text-zinc-400 border-zinc-700/60",          dot: "bg-zinc-500" },
    in_progress:    { label: "Filling Form",        cls: "bg-amber-500/10 text-amber-400 border-amber-500/25",       dot: "bg-amber-400 animate-pulse" },
    needs_followup: { label: "Needs Follow-up",     cls: "bg-red-500/10 text-red-400 border-red-500/25",             dot: "bg-red-400" },
    completed:      { label: "Ready to Start",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${config.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
