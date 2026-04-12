import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, MessageCircle, Sparkles, Send, ArrowRight, Plus } from "lucide-react";

interface Props {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateClientDialog({ userId, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<{ name: string; link: string } | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Client name is required"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({ user_id: userId, name: name.trim(), email: email.trim() || null })
      .select("token")
      .single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    const link = `${window.location.origin}/onboarding/${data.token}`;
    setCreated({ name: name.trim(), link });
    setSaving(false);
    onCreated();
  };

  const copyLink = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.link).then(() => {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const whatsappLink = created
    ? `https://wa.me/?text=${encodeURIComponent(`Hi ${created.name}! Please fill out your onboarding form here: ${created.link}`)}`
    : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={!created ? onClose : undefined}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface border border-border rounded-2xl w-[460px] max-w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">

          {/* ── FORM STATE ── */}
          {!created && (
            <motion.div key="form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
              className="p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Plus size={20} />
                </div>
                <h3 className="font-display text-[28px] text-foreground tracking-tight">New Client</h3>
              </div>
              <p className="text-[14px] text-muted-foreground mb-8 leading-relaxed">
                Add a client to generate a personalised onboarding journey instantly.
              </p>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 block pl-1">Client Name *</label>
                  <input
                    className="w-full py-3 px-4 bg-surface-2 border border-border rounded-xl text-foreground text-[14px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 shadow-inner"
                    placeholder="e.g. Sarah Johnson"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSave()}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 block pl-1">
                    Email Address <span className="text-muted-foreground/30">(optional)</span>
                  </label>
                  <input
                    className="w-full py-3 px-4 bg-surface-2 border border-border rounded-xl text-foreground text-[14px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30 shadow-inner"
                    placeholder="sarah@company.com"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSave()}
                  />
                </div>
              </div>

              {/* What happens next */}
              <div className="bg-surface-2 border border-border rounded-2xl px-5 py-4 mb-8">
                <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Sparkles size={12} className="text-primary" />
                  Your Workflow
                </p>
                {[
                  "We generate a custom secure link",
                  "Client completes their project brief",
                  "You receive all details instantly",
                ].map((step, i) => (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.1 }}
                    key={i}
                    className="flex items-center gap-3.5 mb-3 last:mb-0"
                  >
                    <div className="w-5 h-5 rounded-lg bg-surface border border-border text-primary text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">{i + 1}</div>
                    <span className="text-[13px] text-muted-foreground font-medium">{step}</span>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl text-[14px] font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-[2] py-3 px-4 rounded-xl text-[14px] font-bold bg-primary text-primary-foreground hover:brightness-110 shadow-[0_4px_15px_rgba(var(--primary),0.2)] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? "Creating..." : (
                    <>
                      Create Journey
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS STATE ── */}
          {created && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              className="p-8">
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mb-4 shadow-[0_8px_30px_rgba(16,185,129,0.1)]"
                >
                  ✨
                </motion.div>
                <h3 className="font-display text-[28px] text-foreground tracking-tight leading-none mb-2">Onboarding Ready</h3>
                <p className="text-[14px] text-muted-foreground">Successfully generated for <span className="text-foreground font-semibold">{created.name}</span></p>
              </div>

              {/* Link box */}
              <div className="bg-surface-2 border border-border rounded-2xl p-5 mb-8 shadow-inner relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Send size={40} />
                </div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">Copy & Send Link</p>
                <p className="text-[13px] text-foreground font-mono break-all leading-relaxed bg-surface-3 p-3 rounded-xl border border-border select-all">
                  {created.link}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 mb-8">
                <button onClick={copyLink}
                  className={`group flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[14px] font-bold border transition-all shadow-md ${copied
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-primary text-primary-foreground hover:brightness-110"
                    }`}>
                  {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} />}
                  {copied ? "Copied Successfully!" : "Copy Onboarding Link"}
                </button>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-3 rounded-xl text-[13.5px] font-semibold border border-border bg-surface text-muted-foreground hover:text-foreground transition-all">
                  <MessageCircle size={18} />
                  Send via WhatsApp
                </a>
              </div>

              {/* Waiting state highlight */}
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-8 flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground">Awaiting Response</p>
                  <p className="text-[11.5px] text-muted-foreground/70 leading-normal">You'll be notified automatically as soon as the client opens this link.</p>
                </div>
              </div>

              <button onClick={onClose}
                className="w-full py-3 rounded-xl text-[13px] font-bold text-muted-foreground hover:text-foreground transition-all hover:bg-surface-2 border border-transparent hover:border-border">
                Go to Dashboard
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
