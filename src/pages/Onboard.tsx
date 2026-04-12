import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Upload, FileText, Image, Trash2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CustomField { label: string; answer: string; }
interface UploadedFile { name: string; url: string; type: string; }

interface OnboardingForm {
  id?: string;
  business_name: string;
  business_description: string;
  target_audience: string;
  competitors: string;
  website_goal: string;
  pages_needed: string[];
  budget: string;
  timeline: string;
  extra_notes: string;
  files: UploadedFile[];
  custom_fields: CustomField[];
  status: "pending" | "submitted";
}

const EMPTY_FORM: OnboardingForm = {
  business_name: "", business_description: "", target_audience: "",
  competitors: "", website_goal: "", pages_needed: [],
  budget: "", timeline: "", extra_notes: "", files: [], custom_fields: [],
  status: "pending",
};

const PAGES_OPTIONS = [
  "Home", "About", "Services", "Contact", "Blog", "Portfolio",
  "Testimonials", "FAQ", "Pricing", "Team", "Gallery", "Shop",
];
const BUDGET_OPTIONS = [
  "Under ₹15,000", "₹15,000 – ₹30,000", "₹30,000 – ₹60,000",
  "₹60,000 – ₹1,00,000", "Above ₹1,00,000", "Let's discuss",
];
const TIMELINE_OPTIONS = [
  "ASAP (within 1 week)", "2–4 weeks", "1–2 months", "2–3 months", "Flexible / No rush",
];

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Onboard() {
  const { token } = useParams<{ token: string }>();
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState<OnboardingForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [extraPage, setExtraPage] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [activeExtra, setActiveExtra] = useState<"files" | "notes" | "fields" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load ──────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const t = token?.trim();
    if (!t) { setNotFound(true); setLoading(false); return; }
    try {
      const { data: client, error } = await supabase
        .from("clients").select("id, name").eq("token", t).maybeSingle();
      if (error || !client) { setNotFound(true); setLoading(false); return; }
      setClientName(client.name);
      setClientId(client.id);

      // Track that client opened the link
      await supabase
        .from("clients")
        .update({ link_opened_at: new Date().toISOString() })
        .eq("id", client.id)
        .is("link_opened_at", null); // only update if not already set

      const { data: existing } = await supabase
        .from("onboarding_responses").select("*").eq("client_id", client.id).maybeSingle();
      if (existing) {
        setForm({
          id: existing.id,
          business_name: existing.business_name ?? "",
          business_description: existing.business_description ?? "",
          target_audience: existing.target_audience ?? "",
          competitors: existing.competitors ?? "",
          website_goal: existing.website_goal ?? "",
          pages_needed: existing.pages_needed ?? [],
          budget: existing.budget ?? "",
          timeline: existing.timeline ?? "",
          extra_notes: existing.extra_notes ?? "",
          files: existing.files ?? [],
          custom_fields: existing.custom_fields ?? [],
          status: existing.status ?? "pending",
        });
        if (existing.extra_notes || (existing.files?.length > 0) || (existing.custom_fields?.length > 0)) {
          setShowExtra(true);
        }
      }
    } catch (err) {
      toast.error("Something went wrong. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // required fields filled?
  const requiredFilled = form.business_name.trim().length > 0 && form.website_goal.trim().length > 0;

  useEffect(() => {
    if (requiredFilled && !showExtra) setShowExtra(true);
  }, [requiredFilled]);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const set = (field: keyof OnboardingForm, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const togglePage = (page: string) => {
    const cur = form.pages_needed;
    set("pages_needed", cur.includes(page) ? cur.filter(p => p !== page) : [...cur, page]);
  };

  const addExtraPage = () => {
    const p = extraPage.trim();
    if (p && !form.pages_needed.includes(p)) set("pages_needed", [...form.pages_needed, p]);
    setExtraPage("");
  };

  const addCustomField = () =>
    set("custom_fields", [...form.custom_fields, { label: "", answer: "" }]);

  const updateCustomField = (i: number, key: "label" | "answer", val: string) =>
    set("custom_fields", form.custom_fields.map((f, idx) => idx === i ? { ...f, [key]: val } : f));

  const removeCustomField = (i: number) =>
    set("custom_fields", form.custom_fields.filter((_, idx) => idx !== i));

  // ── File Upload ───────────────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !clientId) return;
    setUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const file of files) {
      const path = `${clientId}/extra/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("client-uploads").upload(path, file, { upsert: true });
      if (error) { toast.error(`Failed to upload ${file.name}`); continue; }
      const { data } = supabase.storage.from("client-uploads").getPublicUrl(path);
      uploaded.push({ name: file.name, url: data.publicUrl, type: file.type });
    }
    const newFiles = [...form.files, ...uploaded];
    set("files", newFiles);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success(`${uploaded.length} file(s) uploaded`);
  };

  const removeFile = (i: number) =>
    set("files", form.files.filter((_, idx) => idx !== i));

  // ── Create empty draft on first keystroke ────────────────────────────────────
  // This makes "Started filling form" appear on dashboard immediately

  const createDraftIfNeeded = async () => {
    if (form.id || !clientId) return; // already exists
    try {
      const { data, error } = await supabase
        .from("onboarding_responses")
        .insert({
          client_id: clientId,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (!error && data) {
        setForm(prev => ({ ...prev, id: data.id }));
      }
    } catch (_) { }
  };

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = async (submit = false) => {
    if (!clientId) return;
    setSaving(true);
    try {
      const payload = {
        client_id: clientId,
        business_name: form.business_name || null,
        business_description: form.business_description || null,
        target_audience: form.target_audience || null,
        competitors: form.competitors || null,
        website_goal: form.website_goal || null,
        pages_needed: form.pages_needed.length > 0 ? form.pages_needed : null,
        budget: form.budget || null,
        timeline: form.timeline || null,
        extra_notes: form.extra_notes || null,
        files: form.files.length > 0 ? form.files : null,
        custom_fields: form.custom_fields.filter(f => f.label.trim()).length > 0
          ? form.custom_fields.filter(f => f.label.trim()) : null,
        status: submit ? "submitted" : "pending",
        submitted_at: submit ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (form.id) {
        result = await supabase.from("onboarding_responses")
          .update(payload).eq("id", form.id).select("id, status").single();
      } else {
        // upsert in case draft was created by createDraftIfNeeded concurrently
        result = await supabase.from("onboarding_responses")
          .upsert({ ...payload }, { onConflict: "client_id" })
          .select("id, status").single();
      }
      if (result.error) throw result.error;
      setForm(prev => ({ ...prev, id: result.data.id, status: result.data.status as any }));
      setLastSaved(new Date());
      if (submit) toast.success("Brief submitted! Your designer has been notified. 🎉");
      // else        toast.success("Draft saved.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────────

  const inputCls = `w-full py-2.5 px-3.5 bg-background border border-border rounded-lg
    text-foreground text-[13.5px] font-body outline-none
    focus:border-primary focus:ring-2 focus:ring-primary/10
    transition-colors placeholder:text-muted-foreground/50
    disabled:opacity-50 disabled:cursor-not-allowed`;

  const isSubmitted = form.status === "submitted";
  const canSubmit = !saving && form.business_name.trim() && form.website_goal.trim();

  const filledCount = [
    form.business_name, form.business_description, form.target_audience,
    form.competitors, form.website_goal,
    form.pages_needed.length > 0 ? "x" : "",
    form.budget, form.timeline,
  ].filter(Boolean).length;
  const pct = Math.round((filledCount / 8) * 100);

  // ── Loading / Not Found ───────────────────────────────────────────────────────

  if (loading) return (
    <div className="theme-light min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading your onboarding...</div>
    </div>
  );

  if (notFound) return (
    <div className="theme-light min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-[360px]">
        <div className="text-[52px] mb-4">🔗</div>
        <h2 className="font-display text-2xl text-foreground mb-2">Link not found</h2>
        <p className="text-sm text-muted-foreground">This onboarding link is invalid or has expired. Please contact your designer for a new link.</p>
      </div>
    </div>
  );

  // ── Submitted ─────────────────────────────────────────────────────────────────

  if (isSubmitted) return (
    <div className="theme-light min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50 px-6">
        <div className="max-w-[640px] mx-auto h-[60px] flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-[9px] bg-primary flex items-center justify-center text-[15px] text-primary-foreground font-bold">⚡</div>
          <span className="text-[15px] font-semibold text-foreground">Onboardly</span>
        </div>
      </header>
      <div className="max-w-[640px] mx-auto px-6 py-20 text-center flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ type: "spring", damping: 15 }}
          className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[48px] mb-6 shadow-[0_8px_30px_rgba(16,185,129,0.15)]"
        >
          ✨
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-display text-[40px] text-foreground tracking-tight leading-none mb-4">Brief submitted!</h2>
          <p className="text-[15px] text-muted-foreground max-w-[420px] mx-auto leading-relaxed mb-10">
            Thank you, <strong className="text-foreground font-semibold">{clientName}</strong>! Your project brief has been successfully sent.
          </p>

          <div className="bg-surface border border-border rounded-2xl p-6 text-left shadow-sm max-w-[420px] mx-auto">
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> What happens next?
            </p>
            <div className="space-y-4">
              {[
                { icon: "👀", text: "Your designer reviews your brief" },
                { icon: "💬", text: "They'll reach out to discuss the project" },
                { icon: "🚀", text: "Design work begins!" }
              ].map((step, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  key={i}
                  className="flex items-center gap-3.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-[14px] flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">{step.icon}</div>
                  <span className="text-[14px] font-medium text-foreground">{step.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );

  // ── Main Form ─────────────────────────────────────────────────────────────────

  return (
    <div className="theme-light min-h-screen bg-background">

      {/* HEADER */}
      <header className="bg-card border-b border-border sticky top-0 z-50 px-6">
        <div className="max-w-[640px] mx-auto h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-primary flex items-center justify-center text-[15px] text-primary-foreground font-bold">⚡</div>
            <span className="text-[15px] font-semibold text-foreground">Onboardly</span>
          </div>
          <span className="text-xs text-muted-foreground">{filledCount}/8 fields filled</span>
        </div>
      </header>

      {/* HERO */}
      <div className="bg-card border-b border-border py-9 px-6">
        <div className="max-w-[640px] mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 text-xs font-medium text-primary mb-3.5">
            <span>👋</span> Welcome, {clientName}
          </div>
          <h1 className="font-display text-[34px] font-normal text-foreground leading-tight mb-2">
            Let's plan <em className="italic text-primary">your website</em>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[460px] mb-5">
            Takes 2–3 minutes. The better you fill this, the better your website will turn out.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{pct}% Complete</span>
          </div>
          {lastSaved && (
            <p className="text-[11px] text-muted-foreground mt-2">Draft saved at {lastSaved.toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-6 py-8 pb-20">
        <div className="space-y-5">

          {/* ── SECTION: About your business ── */}
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">About your business</p>

          {/* 1. Business Name */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">
              Business Name <span className="text-destructive">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">What's the name of your business or brand?</p>
            <input className={inputCls} placeholder="e.g. Sharma Enterprises"
              value={form.business_name}
              onChange={e => { set("business_name", e.target.value); createDraftIfNeeded(); }}
              onBlur={() => handleSave(false)}
              disabled={isSubmitted} />
          </motion.div>

          {/* 2. Business Description */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">What does your business do?</label>
            <p className="text-[12px] text-muted-foreground mb-3">Describe what you sell or offer, and what makes you different.</p>
            <textarea className={inputCls + " min-h-[90px] resize-y"}
              placeholder="e.g. We are a boutique interior design studio specialising in modern residential spaces..."
              value={form.business_description}
              onChange={e => { set("business_description", e.target.value); createDraftIfNeeded(); }}
              onBlur={() => handleSave(false)}
              disabled={isSubmitted} />
          </motion.div>

          {/* 3. Target Audience */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">Who is your target audience?</label>
            <p className="text-[12px] text-muted-foreground mb-3">Describe your ideal customer — age, location, profession, needs.</p>
            <textarea className={inputCls + " min-h-[80px] resize-y"}
              placeholder="e.g. Home owners aged 30–55, looking for premium interior design services..."
              value={form.target_audience}
              onChange={e => { set("target_audience", e.target.value); createDraftIfNeeded(); }}
              onBlur={() => handleSave(false)}
              disabled={isSubmitted} />
          </motion.div>

          {/* 4. Competitors */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">Competitors or websites you admire</label>
            <p className="text-[12px] text-muted-foreground mb-3">Share competitor websites or sites whose design you love.</p>
            <textarea className={inputCls + " min-h-[80px] resize-y"}
              placeholder="e.g. www.competitor.com — I like their clean layout. Also love Apple.com..."
              value={form.competitors}
              onChange={e => { set("competitors", e.target.value); createDraftIfNeeded(); }}
              onBlur={() => handleSave(false)}
              disabled={isSubmitted} />
          </motion.div>

          {/* ── SECTION: Website goals ── */}
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1 pt-2">Website goals</p>

          {/* 5. Website Goal */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">
              Describe your dream website <span className="text-destructive">*</span>
            </label>
            <p className="text-[12px] text-muted-foreground mb-3">What kind of look, feel, or experience do you want?</p>
            <textarea className={inputCls + " min-h-[90px] resize-y"}
              placeholder="e.g. Modern, minimal, bold. I want visitors to immediately book a consultation..."
              value={form.website_goal}
              onChange={e => { set("website_goal", e.target.value); createDraftIfNeeded(); }}
              onBlur={() => handleSave(false)}
              disabled={isSubmitted} />
          </motion.div>

          {/* 6. Pages Needed */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">Pages needed</label>
            <p className="text-[12px] text-muted-foreground mb-3">Select all the pages you'd like on your website.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PAGES_OPTIONS.map(page => (
                <button key={page} type="button" onClick={() => togglePage(page)} disabled={isSubmitted}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${form.pages_needed.includes(page)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}>
                  {page}
                </button>
              ))}
            </div>
            {!isSubmitted && (
              <div className="flex gap-2">
                <input className={inputCls + " flex-1"} placeholder="Other page (e.g. Careers)"
                  value={extraPage} onChange={e => setExtraPage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addExtraPage())} />
                <button type="button" onClick={addExtraPage}
                  className="px-3 py-2.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all shrink-0">
                  Add
                </button>
              </div>
            )}
            {form.pages_needed.filter(p => !PAGES_OPTIONS.includes(p)).map(p => (
              <div key={p} className="inline-flex items-center gap-1 mt-2 mr-1.5 px-2.5 py-1 rounded-full text-[12px] bg-primary/10 text-primary border border-primary/20">
                {p}
                {!isSubmitted && <button onClick={() => togglePage(p)} className="ml-1 text-primary/60 hover:text-primary">×</button>}
              </div>
            ))}
          </motion.div>

          {/* ── SECTION: Budget & Timeline ── */}
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1 pt-2">Budget & timeline</p>

          {/* 7. Budget */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">Budget range</label>
            <p className="text-[12px] text-muted-foreground mb-3">Helps your designer suggest the right approach.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BUDGET_OPTIONS.map(b => (
                <button key={b} type="button"
                  onClick={() => { set("budget", b); form.id && setTimeout(() => handleSave(false), 0); }}
                  disabled={isSubmitted}
                  className={`px-3 py-2.5 rounded-lg text-[12px] font-medium border text-left transition-all ${form.budget === b ? "bg-primary/8 border-primary/30 text-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}>
                  {b}
                </button>
              ))}
            </div>
          </motion.div>

          {/* 8. Timeline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
            className="bg-card border border-border rounded-[14px] p-5">
            <label className="block text-[14px] font-medium text-foreground mb-0.5">Expected timeline</label>
            <p className="text-[12px] text-muted-foreground mb-3">When do you need the website ready?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TIMELINE_OPTIONS.map(t => (
                <button key={t} type="button"
                  onClick={() => { set("timeline", t); form.id && setTimeout(() => handleSave(false), 0); }}
                  disabled={isSubmitted}
                  className={`px-3 py-2.5 rounded-lg text-[12px] font-medium border text-left transition-all ${form.timeline === t ? "bg-primary/8 border-primary/30 text-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}>
                  {t}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── SECTION: Anything else? (shows after required fields filled) ── */}
          <AnimatePresence>
            {showExtra && !isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.35 }}
              >
                <div className="border-t border-border pt-6 mt-2">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Anything else to share?</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">Optional</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mb-4">Don't let anything slip through the cracks. Add files, notes, or extra details your designer should know.</p>

                  {/* Option buttons */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { key: "files", icon: <Upload size={16} />, label: "Upload Files", desc: "Logo, images, docs" },
                      { key: "notes", icon: <FileText size={16} />, label: "Add Notes", desc: "Anything else" },
                      { key: "fields", icon: <Plus size={16} />, label: "Custom Details", desc: "Extra Q&A" },
                    ].map(opt => (
                      <button key={opt.key} type="button"
                        onClick={() => setActiveExtra(activeExtra === opt.key as any ? null : opt.key as any)}
                        className={`flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl border text-center transition-all ${activeExtra === opt.key
                            ? "bg-primary/8 border-primary/30 text-primary"
                            : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          }`}>
                        {opt.icon}
                        <span className="text-[12px] font-medium">{opt.label}</span>
                        <span className="text-[10px] opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* File Upload Panel */}
                  <AnimatePresence>
                    {activeExtra === "files" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="bg-card border border-border rounded-[14px] p-5 mb-3">
                          <p className="text-[13px] font-medium text-foreground mb-3">Upload files</p>
                          <label className={`flex flex-col items-center justify-center py-6 px-4 bg-background border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-all ${uploading ? "opacity-50 pointer-events-none" : ""}`}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary/50"); }}
                            onDragLeave={e => e.currentTarget.classList.remove("border-primary/50")}
                            onDrop={async e => {
                              e.preventDefault();
                              e.currentTarget.classList.remove("border-primary/50");
                              const dt = e.dataTransfer.files;
                              if (dt && fileInputRef.current) {
                                // trigger upload manually
                                const syntheticEvent = { target: { files: dt } } as any;
                                await handleFileUpload(syntheticEvent);
                              }
                            }}>
                            <Upload size={22} className="text-muted-foreground mb-2" />
                            <span className="text-[13px] text-muted-foreground font-medium">
                              {uploading ? "Uploading..." : "Drag & drop or click to upload"}
                            </span>
                            <span className="text-[11px] text-muted-foreground/50 mt-1">Images, PDFs, docs accepted</span>
                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                          </label>

                          {form.files.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {form.files.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                                  {f.type.startsWith("image/")
                                    ? <Image size={14} className="text-primary shrink-0" />
                                    : <FileText size={14} className="text-primary shrink-0" />
                                  }
                                  <a href={f.url} target="_blank" rel="noopener noreferrer"
                                    className="text-[12px] text-foreground hover:text-primary truncate flex-1">{f.name}</a>
                                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Notes Panel */}
                  <AnimatePresence>
                    {activeExtra === "notes" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="bg-card border border-border rounded-[14px] p-5 mb-3">
                          <label className="block text-[13px] font-medium text-foreground mb-2">Additional notes</label>
                          <textarea className={inputCls + " min-h-[100px] resize-y"}
                            placeholder="Anything your designer should know that wasn't covered above... e.g. specific colors to avoid, inspiration, technical requirements, etc."
                            value={form.extra_notes}
                            onChange={e => set("extra_notes", e.target.value)}
                            onBlur={() => handleSave(false)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Custom Fields Panel */}
                  <AnimatePresence>
                    {activeExtra === "fields" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden">
                        <div className="bg-card border border-border rounded-[14px] p-5 mb-3">
                          <p className="text-[13px] font-medium text-foreground mb-3">Custom details</p>
                          <div className="space-y-3">
                            {form.custom_fields.map((field, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <div className="flex-1 space-y-1.5">
                                  <input className={inputCls} placeholder="Question / Label (e.g. Preferred color palette)"
                                    value={field.label} onChange={e => updateCustomField(i, "label", e.target.value)} />
                                  <input className={inputCls} placeholder="Your answer"
                                    value={field.answer} onChange={e => updateCustomField(i, "answer", e.target.value)}
                                    onBlur={() => handleSave(false)} />
                                </div>
                                <button onClick={() => removeCustomField(i)}
                                  className="mt-2 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                                  <X size={15} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button onClick={addCustomField}
                            className="mt-3 flex items-center gap-1.5 text-[12px] text-primary hover:underline font-medium">
                            <Plus size={12} /> Add detail
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── ACTIONS ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => handleSave(false)} disabled={saving}
              className="px-5 py-3 rounded-lg text-[13px] font-medium border border-border text-muted-foreground bg-card hover:bg-surface-2 hover:text-foreground disabled:opacity-50 transition-all">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" onClick={() => handleSave(true)} disabled={!canSubmit}
              className="flex-1 py-3.5 bg-primary rounded-lg text-primary-foreground text-[15px] font-semibold font-body transition-all hover:brightness-110 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 relative overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-br from-transparent to-white/10" />
              <span className="relative">{saving ? "Submitting..." : "Submit Brief →"}</span>
            </button>
          </motion.div>

          <p className="text-[11px] text-muted-foreground text-center">
            <span className="text-destructive">*</span> Business Name and Website description are required to submit.
          </p>

        </div>
      </div>
    </div>
  );
}
