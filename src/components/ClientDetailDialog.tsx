import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileDown, Copy, Check, MessageCircle } from "lucide-react";
import type { ClientRow } from "@/pages/Clients";

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
          <div className="flex items-start justify-between mb-1">
            {isEditing ? (
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="flex-1 font-display text-[20px] font-normal bg-surface-2 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus />
            ) : (
              <h3 className="font-display text-[22px] font-normal">{editName}</h3>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg ml-3 shrink-0">✕</button>
          </div>

          {isEditing ? (
            <div className="mb-4 space-y-3">
              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                className="w-full text-[13px] bg-surface-2 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Email (optional)" />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={isSaving}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => { setEditName(client.name); setEditEmail(client.email || ""); setIsEditing(false); }}
                  className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${dynamicStatus.dot} animate-pulse`} />
                <p className={`text-[12px] font-medium ${dynamicStatus.color}`}>{dynamicStatus.label}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {response && (
                  <button onClick={handleExportCsv}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all">
                    <FileDown size={12}/> CSV
                  </button>
                )}
                <button onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all">
                  Edit
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

          {/* Share link */}
          <div className="bg-surface-2 border border-border rounded-xl p-4 mb-5">
            <p className="text-[11px] font-medium text-muted-foreground mb-2">Onboarding link</p>
            <p className="text-[11px] text-foreground font-mono break-all mb-3">{onboardingLink}</p>
            <div className="flex gap-2">
              <button onClick={copyLink}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium border transition-all ${
                  copied ? "bg-success/10 border-success/30 text-success" : "border-border text-muted-foreground hover:text-foreground"
                }`}>
                {copied ? <Check size={13}/> : <Copy size={13}/>}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all">
                <MessageCircle size={13}/>
                WhatsApp
              </a>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Activity Timeline</p>
            <div className="space-y-0">
              {timeline.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[11px] shrink-0 transition-all ${
                      item.done ? "border-primary bg-primary/10" : "border-border bg-surface-2"
                    }`}>
                      {item.done ? item.icon : <span className="w-1.5 h-1.5 rounded-full bg-border block"/>}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`w-px flex-1 min-h-[20px] mt-0.5 mb-0.5 ${item.done ? "bg-primary/20" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-[13px] font-medium ${item.done ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {item.label}
                    </p>
                    {item.time && (
                      <p className="text-[11px] text-muted-foreground">{timeAgo(item.time)}</p>
                    )}
                    {!item.done && i === 1 && !response && (
                      <p className="text-[11px] text-warning mt-0.5">Waiting for client to open link...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Responses */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Form Responses</p>
            {loading ? (
              <div className="text-center text-muted-foreground text-sm py-6">Loading responses...</div>
            ) : !response ? (
              <div className="text-center py-8 bg-surface-2 border border-border rounded-xl">
                <div className="text-[32px] mb-2">⏳</div>
                <p className="text-sm font-medium text-foreground mb-1">Waiting for client response</p>
                <p className="text-[12px] text-muted-foreground">Most clients complete this within a few hours.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {FIELD_LABELS.map(({ key, label }) => {
                  const val = response[key];
                  const hasValue = Array.isArray(val) ? val.length > 0 : !!val;
                  return (
                    <div key={key} className={`border rounded-xl p-4 ${hasValue ? "border-primary/20 bg-primary/[0.02]" : "border-border"}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] shrink-0 ${
                          hasValue ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}>
                          {hasValue && "✓"}
                        </div>
                        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
                      </div>
                      <div className="ml-6">
                        {!hasValue ? (
                          <span className="text-[12px] text-muted-foreground/50 italic">No response yet</span>
                        ) : Array.isArray(val) ? (
                          <div className="flex flex-wrap gap-1.5">
                            {val.map(p => (
                              <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{p}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[13px] text-foreground">{val}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
