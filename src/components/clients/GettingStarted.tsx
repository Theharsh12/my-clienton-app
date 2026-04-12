import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientRow } from "@/types/client";

export function GettingStarted({ clients, onCreateClient }: { clients: ClientRow[]; onCreateClient: () => void }) {
  const hasClient    = clients.length > 0;
  const hasSentLink  = clients.some(c => c.link_opened_at);
  const hasResponse  = clients.some(c => c.progress > 0 || c.client_state === "completed");
  const steps = [
    { label: "Create your first client",     done: hasClient,   action: onCreateClient,  cta: "Create Client" },
    { label: "Send the onboarding link",     done: hasSentLink, action: null,             cta: "Copy from client card below" },
    { label: "Receive their first response", done: hasResponse, action: null,             cta: "Waiting..." },
  ];
  const completedCount = steps.filter(s => s.done).length;

  return (
    <AnimatePresence>
      {completedCount < 3 && (
        <motion.div 
          initial={{ opacity: 0, height: 0, scale: 0.95 }}
          animate={{ opacity: 1, height: "auto", scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 overflow-hidden origin-top"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Get started with Onboardly</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">{completedCount}/3 steps completed</p>
            </div>
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <motion.div 
                  key={i} 
                  initial={false}
                  animate={{ backgroundColor: s.done ? "hsl(var(--primary))" : "hsl(var(--border))" }}
                  className="w-8 h-1.5 rounded-full" 
                />
              ))}
            </div>
          </div>
          <div className="space-y-2.5">
            {steps.map((s, i) => (
              <motion.div 
                key={i}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  s.done
                    ? "border-primary/15 bg-primary/[0.03] opacity-60"
                    : i === completedCount
                      ? "border-primary/30 bg-primary/[0.05] ring-4 ring-primary/5 shadow-sm"
                      : "border-border bg-surface/50 opacity-40 grayscale"
                }`}
              >
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: s.done ? [1, 1.2, 1] : 1,
                    rotate: s.done ? [0, 10, -10, 0] : 0 
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-all ${
                    s.done ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {s.done ? "✓" : i + 1}
                </motion.div>
                <span className={`flex-1 text-[13px] font-medium transition-all ${s.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {s.label}
                </span>
                {!s.done && i === completedCount && s.action && (
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={s.action}
                    className="text-[11px] font-semibold text-primary-foreground bg-primary px-4 py-2 rounded-lg shadow-sm hover:brightness-110 transition-all shrink-0"
                  >
                    {s.cta}
                  </motion.button>
                )}
                {!s.done && i === completedCount && !s.action && (
                  <span className="text-[11px] font-medium text-primary animate-pulse">{s.cta}</span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
