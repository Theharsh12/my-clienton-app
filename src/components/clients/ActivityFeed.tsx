import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientRow } from "@/types/client";
import { formatRelativeTime } from "@/lib/clientUtils";

export function ActivityFeed({ clients }: { clients: ClientRow[] }) {
  const activities = clients
    .flatMap(c => {
      const items = [];
      if (c.client_state === "completed") {
        items.push({ id: `${c.id}-comp`, time: c.updated_at, text: `${c.name} completed their onboarding`, icon: "✅", color: "text-emerald-400", bg: "bg-emerald-500/10" });
      } else if (c.client_state === "in_progress") {
        items.push({ id: `${c.id}-prog`, time: c.updated_at, text: `${c.name} is filling the form`, icon: "✏️", color: "text-amber-400", bg: "bg-amber-500/10" });
      } else if (c.link_opened_at) {
        items.push({ id: `${c.id}-open`, time: c.link_opened_at, text: `${c.name} opened the link`, icon: "👀", color: "text-blue-400", bg: "bg-blue-500/10" });
      } else {
        items.push({ id: `${c.id}-crea`, time: c.created_at, text: `Client ${c.name} added`, icon: "➕", color: "text-primary", bg: "bg-primary/10" });
      }
      return items;
    })
    .filter(a => a.time)
    .sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
    .slice(0, 5);

  if (activities.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-2xl p-5 mb-6"
    >
      <h3 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        Live Activity Feed
      </h3>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {activities.map((a, i) => (
            <motion.div 
              key={a.id} 
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 group"
            >
              <div className={`w-8 h-8 rounded-lg ${a.bg} flex items-center justify-center text-[14px] shrink-0 transition-transform group-hover:scale-110`}>
                {a.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] text-foreground font-medium truncate leading-tight transition-colors group-hover:text-primary">
                    {a.text}
                  </p>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 font-medium tracking-tight">
                    {formatRelativeTime(a.time)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <div className="h-0.5 w-12 bg-border rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "0%" }}
                        transition={{ duration: 1.5, delay: i * 0.2 }}
                        className={`h-full w-full rounded-full ${a.color.replace('text-', 'bg-')}`} 
                      />
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
