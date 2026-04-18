import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Copy, Check, ChevronLeft, Sparkles, AlertTriangle } from "lucide-react";
import { templateMap, templateMeta, type TemplateKey } from "@/data/templates";
import { formatters } from "@/utils/formatters";

// ── Brief output renderer ──────────────────────────────────────────────────────
function BriefOutput({ text }: { text: string }) {
  return (
    <div className="space-y-0.5">
      {text.split("\n").map((line, i) => {
        const isDivider = /^─+$/.test(line.trim());
        const isHeading = i === 0 || (line === line.toUpperCase() && line.trim().length > 2 && !line.startsWith("→"));
        const isSectionLabel = line.endsWith(":") && !line.startsWith("→");
        const isArrow = line.startsWith("→");

        if (isDivider) return null;

        return (
          <p
            key={i}
            className={
              isHeading
                ? "text-[14px] font-bold text-foreground mb-2"
                : isSectionLabel
                ? "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-0.5"
                : isArrow
                ? "text-[13px] text-foreground leading-relaxed"
                : "text-[13px] text-muted-foreground"
            }
          >
            {line || "\u00A0"}
          </p>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { template } = useParams<{ template: string }>();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [brief, setBrief] = useState("");
  const [copied, setCopied] = useState(false);

  // Guard: invalid template
  if (!template || !(template in templateMap)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-destructive" />
          </div>
          <h1 className="font-display text-2xl text-foreground mb-2">Invalid Template</h1>
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-mono bg-surface-2 px-2 py-0.5 rounded text-xs">
              {template || "(none)"}
            </span>{" "}
            is not a recognised template.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Valid templates:{" "}
            {Object.keys(templateMap).map((k) => (
              <Link
                key={k}
                to={`/onboarding/template/${k}`}
                className="font-mono text-primary hover:underline mx-1"
              >
                {k}
              </Link>
            ))}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <ChevronLeft size={14} /> Go home
          </Link>
        </motion.div>
      </div>
    );
  }

  const key = template as TemplateKey;
  const questions = templateMap[key];
  const meta = templateMeta[key];
  const hasAnyResponse = Object.values(responses).some((v) => v.trim() !== "");

  const handleGenerate = () => {
    const output = formatters[key](responses);
    setBrief(output);
    setTimeout(() => {
      document.getElementById("brief-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(brief).then(() => {
      setCopied(true);
      toast.success("Brief copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleReset = () => {
    setBrief("");
    setResponses({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 px-4 sm:px-6">
        <div className="max-w-[680px] mx-auto h-[60px] flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <ChevronLeft size={16} className="text-muted-foreground" />
            <img src="/favicon.svg" className="w-7 h-7" alt="Onboardly" />
            <span className="font-display text-lg text-foreground tracking-tight">Onboardly</span>
          </Link>
          <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full capitalize">
            {key}
          </span>
        </div>
      </header>

      <main className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Page title ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-2">
            {key} template
          </p>
          <h1 className="font-display text-[28px] sm:text-[32px] text-foreground leading-tight mb-2">
            {meta.title}
          </h1>
          <p className="text-[13px] text-muted-foreground">{meta.description}</p>
        </motion.div>

        {/* ── Question form ── */}
        <AnimatePresence mode="wait">
          {!brief && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {questions.map((q, index) => (
                <motion.div
                  key={q.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-1.5"
                >
                  <label
                    htmlFor={`q-${index}`}
                    className="flex items-center gap-2 text-[13px] font-semibold text-foreground"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    {q.label}
                  </label>
                  <textarea
                    id={`q-${index}`}
                    rows={2}
                    placeholder={q.placeholder}
                    value={responses[q.label] || ""}
                    onChange={(e) =>
                      setResponses((prev) => ({ ...prev, [q.label]: e.target.value }))
                    }
                    className="w-full py-2.5 px-3.5 bg-surface border border-border rounded-[10px] text-foreground text-[13px] outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40 resize-none leading-relaxed"
                  />
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: questions.length * 0.05 + 0.1 }}
                className="pt-2"
              >
                <button
                  id="generate-btn"
                  onClick={handleGenerate}
                  disabled={!hasAnyResponse}
                  className="w-full py-3 rounded-xl text-[14px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_16px_hsl(var(--accent-glow))] flex items-center justify-center gap-2"
                >
                  <Sparkles size={15} />
                  Generate Brief
                </button>
                <p className="text-center text-[11px] text-muted-foreground/40 mt-2">
                  Fill at least one field to generate
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ── Brief output ── */}
          {brief && (
            <motion.div
              id="brief-output"
              key="output"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Output card */}
              <div className="rounded-[16px] border border-primary/20 bg-primary/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-primary/10 bg-primary/[0.03]">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-primary" />
                    <span className="text-[12px] font-semibold text-primary">
                      {meta.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 font-mono capitalize">
                    {key} · {questions.length} fields
                  </span>
                </div>
                <div className="px-5 py-5">
                  <BriefOutput text={brief} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5">
                <button
                  id="copy-brief-btn"
                  onClick={handleCopy}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold border transition-all ${
                    copied
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-surface border-border text-foreground hover:border-primary/40"
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy Brief"}
                </button>
                <button
                  id="edit-answers-btn"
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl text-[13px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  ← Edit Answers
                </button>
              </div>

              <p className="text-center text-[11px] text-muted-foreground/40">
                Your brief is ready — paste it anywhere you need
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
