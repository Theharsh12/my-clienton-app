import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, MessageCircle, Tag, Plus, X } from "lucide-react";

interface Props {
  userId: string;
  selectedTemplate?: string | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateClientDialog({ userId, selectedTemplate, onClose, onCreated }: Props) {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [created, setCreated] = useState<{ name: string; link: string } | null>(null);
  const [customQuestions, setCustomQuestions] = useState<string[]>([""]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Client name is required"); return; }
    setSaving(true);

    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id:       userId,
        name:          name.trim(),
        email:         email.trim() || null,
        template_type: selectedTemplate || null,
      })
      .select("id, token")
      .single();

    if (error) { toast.error(error.message); setSaving(false); return; }

    // If "Custom" template, insert the custom questions right away
    if (selectedTemplate === "Custom") {
      const validQuestions = customQuestions.filter(q => q.trim());
      if (validQuestions.length > 0) {
        const customFields = validQuestions.map(q => ({ label: q.trim(), answer: "" }));
        await supabase.from("onboarding_responses").insert({
          client_id: data.id,
          status: "pending",
          custom_fields: customFields
        });
      }
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

          {/* ── FORM ── */}
          {!created && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-7">

              {/* Template badge */}
              {selectedTemplate && (
                <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 w-fit">
                  <Tag size={12} className="text-primary"/>
                  <span className="text-[12px] font-semibold text-primary">{selectedTemplate}</span>
                </div>
              )}

              <h3 className="font-display text-[22px] font-normal mb-1.5">New Client</h3>
              <p className="text-[13px] text-muted-foreground mb-6">
                Add a client — they'll receive a personalised onboarding form.
              </p>

              <div className="space-y-3.5 mb-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client Name *</label>
                  <input
                    className="w-full py-2.5 px-3.5 bg-surface-2 border border-border rounded-[9px] text-foreground text-[13.5px] outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                    placeholder="e.g. Sarah Johnson"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSave()}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Client Email <span className="text-muted-foreground/50">(optional)</span>
                  </label>
                  <input
                    className="w-full py-2.5 px-3.5 bg-surface-2 border border-border rounded-[9px] text-foreground text-[13.5px] outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                    placeholder="sarah@company.com"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSave()}
                  />
                </div>
              </div>

              {selectedTemplate === "Custom" && (
                <div className="mb-6">
                  <label className="text-xs font-medium text-foreground mb-2 block">Custom Questions for Client</label>
                  <div className="space-y-2 mb-3">
                    {customQuestions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 bg-surface-2 border border-border rounded-lg flex items-center px-3 py-2">
                          <input
                            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50"
                            placeholder="e.g. Do you have brand guidelines?"
                            value={q}
                            onChange={(e) => {
                              const newQ = [...customQuestions];
                              newQ[i] = e.target.value;
                              setCustomQuestions(newQ);
                            }}
                          />
                        </div>
                        {customQuestions.length > 1 && (
                          <button 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                            onClick={() => setCustomQuestions(customQuestions.filter((_, idx) => idx !== i))}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setCustomQuestions([...customQuestions, ""])}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus size={12} /> Add question
                  </button>
                </div>
              )}

              {/* What happens next */}
              <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 mb-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">What happens next</p>
                {["Client opens the onboarding link", "They fill in your project form", "You get all details here instantly"].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 mb-1.5 last:mb-0">
                    <div className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">{i+1}</div>
                    <span className="text-[12px] text-muted-foreground">{step}</span>
                  </div>
                ))}
                <p className="text-[11px] text-success mt-2.5">✓ Most clients complete this within a few hours</p>
              </div>

              <div className="flex gap-2.5">
                <button onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-lg text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60">
                  {saving ? "Creating..." : "Create Client →"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {created && (
            <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-7">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-lg">🎉</div>
                <div>
                  <h3 className="font-display text-[20px] font-normal text-foreground">Client link ready</h3>
                  <p className="text-[12px] text-muted-foreground">{created.name} has been added{selectedTemplate ? ` · ${selectedTemplate}` : ""}</p>
                </div>
              </div>

              <p className="text-[13px] text-muted-foreground mb-4">
                Send this link to your client. They'll fill everything you need — no login required.
              </p>

              <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 mb-4">
                <p className="text-[11px] text-muted-foreground mb-1">Onboarding link</p>
                <p className="text-[12px] text-foreground font-mono break-all">{created.link}</p>
              </div>

              <div className="flex gap-2.5 mb-4">
                <button onClick={copyLink}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold border transition-all ${
                    copied ? "bg-success/10 border-success/30 text-success" : "bg-primary text-primary-foreground hover:brightness-110"
                  }`}>
                  {copied ? <Check size={14}/> : <Copy size={14}/>}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all">
                  <MessageCircle size={14}/> WhatsApp
                </a>
              </div>

              <div className="bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-warning animate-pulse"/>
                  <p className="text-[12px] font-medium text-warning">Waiting for client response...</p>
                </div>
                <p className="text-[11px] text-muted-foreground">You'll see their progress update here once they open the link.</p>
              </div>

              <button onClick={onClose}
                className="w-full py-2.5 rounded-lg text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all">
                Done — go to dashboard
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}