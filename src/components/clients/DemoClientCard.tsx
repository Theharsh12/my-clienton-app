import React from "react";
import { Eye } from "lucide-react";

export function DemoClientCard() {
  return (
    <div className="border-2 border-dashed border-primary/25 rounded-2xl px-4 py-4 bg-primary/[0.02] mb-3">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #7C6EF2, #9B8FF5)" }}>
          DM
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px] font-semibold text-foreground">Demo Client</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">Example</span>
          </div>
          <p className="text-[11.5px] text-muted-foreground">See what your client's onboarding looks like</p>
        </div>
        <a href="/onboarding/demo" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-all shrink-0">
          <Eye size={11} /> Preview Form
        </a>
      </div>
    </div>
  );
}
