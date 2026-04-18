import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { FileDown, Copy, Check, MessageCircle, Clock, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import type { ClientRow } from "@/types/client";

interface OnboardingResponse {
  business_name:        string | null;
  business_description: string | null;
  target_audience:      string | null;
  competitors:          string | null;
  website_goal:         string | null;
  pages_needed:         string[] | null;
  budget:               string | null;
  timeline:             string | null;
  status:               string;
  submitted_at:         string | null;
  created_at:           string | null;
  updated_at:           string | null;
  extra_notes:          string | null;
  files:                { name: string; url: string; type: string; }[] | null;
  custom_fields:        { label: string; answer: string; }[] | null;
}

interface Props {
  client: ClientRow;
  onClose: () => void;
  onUpdated?: () => void;
}

const FIELD_LABELS: { key: keyof OnboardingResponse; label: string }[] = [
  { key: "business_name",        label: "Business Name"             },
  { key: "business_description", label: "Business Description"      },
  { key: "target_audience",      label: "Target Audience"           },
  { key: "competitors",          label: "Competitors / Inspiration" },
  { key: "website_goal",         label: "Website Goal"              },
  { key: "pages_needed",         label: "Pages Needed"              },
  { key: "budget",               label: "Budget Range"              },
  { key: "timeline",             label: "Timeline"                  },
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ClientDetailDialog({ client, onClose, onUpdated }: Props) {
  const [response,  setResponse]  = useState<OnboardingResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName,  setEditName]  = useState(client.name);
  const [editEmail, setEditEmail] = useState(client.email || "");
  const [isSaving,  setIsSaving]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  const onboardingLink = `${window.location.origin}/onboarding/${client.token}`;

  useEffect(() => { loadResponse(); }, [client.id]);

  const loadResponse = async () => {
    const { data } = await supabase
      .from("onboarding_responses")
      .select("*")
      .eq("client_id", client.id)
      .maybeSingle();
    setResponse(data ?? null);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) { toast.error("Client name is required"); return; }
    setIsSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({ name: editName.trim(), email: editEmail.trim() || null })
      .eq("id", client.id);
    if (error) toast.error("Failed to update client");
    else { toast.success("Client updated"); setIsEditing(false); onUpdated?.(); }
    setIsSaving(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(onboardingLink).then(() => {
      setCopied(true);
      toast.success("Link copied! Now send it to your client 🔗");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(`Hi ${client.name}! Please fill out your onboarding form here: ${onboardingLink}`)}`;

  const handleExportCsv = () => {
    if (!response) { toast.error("No responses to export"); return; }
    const rows = FIELD_LABELS.map(f => {
      const val = response[f.key];
      return `"${f.label}","${Array.isArray(val) ? val.join(", ") : (val ?? "")}"`;
    });
    const csv  = ["Field,Response", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${client.name.replace(/\s+/g, "_")}_onboarding.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  // ── Dynamic status ────────────────────────────────────────────────────────────

  const dynamicStatus = (() => {
    if (client.status === "completed" || response?.status === "submitted")
      return { label: "Client completed onboarding",      color: "text-success",     dot: "bg-success" };
    if (response && client.progress > 0)
      return { label: "Client started filling details",   color: "text-primary",     dot: "bg-primary" };
    if (response)
      return { label: "Client viewed the onboarding form",color: "text-warning",     dot: "bg-warning" };
    return   { label: "Waiting for client to open link",  color: "text-muted-foreground", dot: "bg-muted-foreground/40" };
  })();

  // ── Activity timeline ─────────────────────────────────────────────────────────

  const timeline: { icon: string; label: string; time: string | null; done: boolean }[] = [
    {
      icon:  "🔗",
      label: "Link created",
      time:  client.created_at,
      done:  true,
    },
    {
      icon:  "👁",
      label: "Client opened link",
      time:  client.link_opened_at ?? null,
      done:  !!(client.link_opened_at),
    },
    {
      icon:  "✍️",
      label: "Started filling form",
      time:  response && client.progress > 0 ? response.updated_at : null,
      done:  !!(response && client.progress > 0),
    },
    {
      icon:  "✅",
      label: "Completed onboarding",
      time:  response?.submitted_at ?? null,
      done:  !!(response?.submitted_at),
    },
  ];

  const isSubmitted = response?.status === "submitted";
  const filledCount = response
    ? FIELD_LABELS.filter(f => {
        const v = response[f.key];
        return Array.isArray(v) ? v.length > 0 : !!v;
      }).length
    : 0;
  const pct = Math.round((filledCount / FIELD_LABELS.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface border border-border rounded-2xl w-[580px] max-w-full max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 sm:p-7">

          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            {isEditing ? (
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="flex-1 font-display text-[22px] font-normal bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                autoFocus />
            ) : (
              <motion.h3 layoutId={`client-name-${client.id}`} className="font-display text-[28px] text-foreground tracking-tight leading-none">
                {editName}
              </motion.h3>
            )}
            <button onClick={onClose} 
              className="p-1.5 rounded-full hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-all ml-3 shrink-0">
              <span className="text-xl">✕</span>
            </button>
          </div>

          {isEditing ? (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-6 space-y-3.5">
              <div className="relative">
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="w-full text-[13.5px] bg-surface-2 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all pr-12"
                  placeholder="Email (optional)" />
              </div>
              <div className="flex gap-2.5">
                <button onClick={handleSave} disabled={isSaving}
                  className="flex-[2] py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(var(--primary),0.2)]">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={() => { setEditName(client.name); setEditEmail(client.email || ""); setIsEditing(false); }}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 bg-surface-2 border border-border rounded-full pl-2 pr-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dynamicStatus.dot} opacity-75`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${dynamicStatus.dot}`}></span>
                </span>
                <p className={`text-[12px] font-semibold ${dynamicStatus.color} tracking-tight`}>{dynamicStatus.label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {response && (
                  <button onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all">
                    <FileDown size={13}/> CSV
                  </button>
                )}
                <button onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all">
                  Edit Profile
                </button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isSubmitted ? "bg-success" : "bg-primary"}`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{pct}%</span>
          </div>

          <div className="bg-surface-2 border border-border rounded-2xl p-4 mb-6 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Onboarding link</p>
            <div className="bg-surface-3 border border-border rounded-xl px-3 py-2.5 mb-4 group ring-1 ring-transparent focus-within:ring-primary/20 transition-all">
              <p className="text-[11.5px] text-foreground font-mono break-all leading-relaxed select-all">
                {onboardingLink}
              </p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={copyLink}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold border transition-all shadow-sm ${
                  copied ? "bg-success/10 border-success/30 text-success" : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
                }`}>
                {copied ? <Check size={14}/> : <Copy size={14}/>}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold border border-border bg-surface text-muted-foreground hover:text-foreground hover:border-green-500/20 transition-all shadow-sm">
                <MessageCircle size={14}/>
                WhatsApp
              </a>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-5">Activity Journey</p>
            <div className="space-y-0 pl-1">
              {timeline.map((item, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="flex items-start gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center text-[12px] shrink-0 transition-all ${
                      item.done ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]" : "border-border bg-surface-2 grayscale"
                    }`}>
                      {item.done ? item.icon : <span className="w-2 h-2 rounded-full bg-border block"/>}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[25px] mt-1 mb-1 rounded-full ${item.time && timeline[i+1].time ? "bg-primary/30" : "bg-border/40"}`} />
                    )}
                  </div>
                  <div className="pb-6 pt-0.5">
                    <p className={`text-[13.5px] font-semibold tracking-tight ${item.done ? "text-foreground" : "text-muted-foreground/40"}`}>
                      {item.label}
                    </p>
                    {item.time && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={10} className="text-muted-foreground/40" />
                        <p className="text-[11px] text-muted-foreground italic font-medium">{timeAgo(item.time)}</p>
                      </div>
                    )}
                    {!item.done && i === 1 && !response && (
                      <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-warning/10 border border-warning/20">
                         <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                         <p className="text-[10.5px] font-medium text-warning">Waiting for client interaction...</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-5">
               <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Form Responses</p>
               {response && (
                 <span className="text-[11px] font-medium text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                   {pct}% Captured
                 </span>
               )}
            </div>
            
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-surface-2 border border-border/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : !response ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10 px-6 bg-surface-2 border border-dashed border-border rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-surface-3 flex items-center justify-center text-3xl mx-auto mb-4 border border-border shadow-sm">⏳</div>
                <h4 className="text-[15px] font-semibold text-foreground mb-1">Waiting for initial response</h4>
                <p className="text-[12px] text-muted-foreground max-w-[260px] mx-auto leading-relaxed">Most clients start filling the form within 24 hours of opening the link.</p>
              </motion.div>
            ) : (
              <motion.div layout className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {FIELD_LABELS.map(({ key, label }, i) => {
                    const val = response[key];
                    const hasValue = Array.isArray(val) ? val.length > 0 : !!val;
                    return (
                      <motion.div 
                        key={key} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group border rounded-2xl p-5 transition-all duration-300 ${
                          hasValue 
                            ? "border-primary/15 bg-primary/[0.01] hover:bg-primary/[0.03] hover:border-primary/30" 
                            : "border-border/60 bg-surface grayscale-[0.5] opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shadow-sm transition-all ${
                              hasValue ? "bg-primary border-primary text-primary-foreground" : "bg-surface-2 border-border"
                            }`}>
                              {hasValue ? <Check size={11} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-border" />}
                            </div>
                            <span className="text-[12.5px] font-bold text-foreground/80 tracking-tight">{label}</span>
                          </div>
                          {hasValue && (
                             <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Captured</span>
                          )}
                        </div>
                        <div className="pl-7">
                          {!hasValue ? (
                            <span className="text-[12px] text-muted-foreground/40 italic">Waiting for client to provide details...</span>
                          ) : Array.isArray(val) ? (
                            <div className="flex flex-wrap gap-2">
                              {val.map(p => (
                                <motion.span 
                                  whileHover={{ scale: 1.05 }}
                                  key={p} 
                                  className="text-[11.5px] px-3 py-1 rounded-xl bg-surface-2 text-foreground font-medium border border-border shadow-sm flex items-center gap-1.5"
                                >
                                  <div className="w-1 h-1 rounded-full bg-primary" />
                                  {p}
                                </motion.span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[13.5px] text-foreground font-medium leading-relaxed bg-surface-2/50 p-3 rounded-xl border border-border/40">
                              {val}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* ── Extra Notes ── */}
                  {response.extra_notes && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="border border-primary/15 bg-primary/[0.01] rounded-2xl p-5 hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-2.5 mb-3">
                        <FileText size={15} className="text-primary" />
                        <span className="text-[12.5px] font-bold text-foreground/80 tracking-tight">Additional Notes</span>
                      </div>
                      <p className="text-[13.5px] text-foreground font-medium leading-relaxed bg-surface-2/50 p-3 rounded-xl border border-border/40 whitespace-pre-wrap">
                        {response.extra_notes}
                      </p>
                    </motion.div>
                  )}

                  {/* ── Custom Details (Q&A) ── */}
                  {response.custom_fields && response.custom_fields.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Custom Questions</p>
                      {response.custom_fields.map((field, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="border border-primary/15 bg-primary/[0.01] rounded-2xl p-5 hover:border-primary/30 transition-all">
                          <p className="text-[12.5px] font-bold text-foreground/80 mb-2 leading-tight">
                            {field.label || `Custom Question ${idx + 1}`}
                          </p>
                          <p className="text-[13.5px] text-foreground font-medium bg-surface-2/50 p-3 rounded-xl border border-border/40 whitespace-pre-wrap">
                            {field.answer || "No response provided."}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* ── Shared Files ── */}
                  {response.files && response.files.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Uploaded Files</p>
                      <div className="grid grid-cols-1 gap-2">
                        {response.files.map((file, idx) => (
                          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-2 hover:bg-surface-3 transition-all group">
                            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <FileDown size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-semibold text-foreground truncate">{file.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{file.type.split("/")[1] || "file"}</p>
                            </div>
                            <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
