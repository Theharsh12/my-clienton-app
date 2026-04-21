import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

const PAIN_POINTS = [
  { icon: "🔁", text: "You ask the same questions every single project" },
  { icon: "🐌", text: "Clients reply late — or incompletely" },
  { icon: "❓", text: "Important details go missing until mid-project" },
  { icon: "💬", text: "You go back and forth for days before starting" },
  { icon: "🔄", text: "Revisions happen because requirements were unclear" },
];

const FEATURES = [
  {
    icon: "🔗",
    title: "Get all client info in one go — no follow-ups needed",
    text: "One link. No login, no account, no friction. Your client fills it in, you get everything. Most clients finish in under 15 minutes.",
    highlight: true,
  },
  {
    icon: "📋",
    title: "Pre-built templates for different website types",
    text: "Landing page, business site, e-commerce, portfolio — pick a template and every new client gets the right questions for their project.",
  },
  {
    icon: "📁",
    title: "Turn answers into a clear website structure",
    text: "Business goals, target audience, pages needed, style references — structured and ready to build from. No more guessing.",
  },
  {
    icon: "📊",
    title: "See exactly where every client stands",
    text: "Track who's done, who's in progress, who needs a nudge — without sending a single follow-up message.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create a client", text: "Add your client's name and project type. Takes 30 seconds." },
  { step: "02", title: "Send the link", text: "Copy one onboarding link. Send it via WhatsApp, email, anywhere." },
  { step: "03", title: "Client fills the form", text: "They answer structured questions about their business, goals, and style." },
  { step: "04", title: "Get a ready-to-use brief", text: "Instantly receive a clear website plan you can actually build from." },
];

const AFTER_SUBMIT_STEPS = [
  {
    icon: "📬",
    title: "Notified the moment they submit",
    text: "No need to chase or keep checking. You'll know the instant your client is done.",
  },
  {
    icon: "📄",
    title: "Everything structured and readable",
    text: "Business name, goals, pages, budget, tone, style references — organized in one place. Export as CSV if needed.",
  },
  {
    icon: "🚀",
    title: "Start the project with full clarity",
    text: "No vague brief. No missing assets. No assumptions. Just clear information and a client who feels heard.",
  },
];

const TESTIMONIALS = [
  { text: "I used to spend days chasing clients for assets. Now they complete everything in under an hour.", name: "Marcus Reid", role: "Freelance Designer", color: "#7C6EF2", init: "MR" },
  { text: "My clients actually compliment the onboarding experience. That never happened with Google Docs.", name: "Priya Mehta", role: "Solo Freelancer", color: "#F472B6", init: "PM" },
  { text: "Simple, clean, does exactly one thing well. I set it up in 5 minutes and never looked back.", name: "Jake Novak", role: "Web Designer", color: "#60A5FA", init: "JN" },
];

const PLANS = [
  {
    name: "Free", price: "$0", period: "forever",
    features: ["2 active clients", "1 template", "Onboardly branding"],
    cta: "Start Free", highlight: false,
  },
  {
    name: "Pro", price: "$9", period: "/month",
    features: ["Unlimited clients", "Unlimited templates", "File uploads", "Completion tracking", "Remove branding"],
    cta: "Go Pro", highlight: true,
  },
  {
    name: "Lifetime", price: "$79", period: "one-time", badge: "Best value",
    features: ["All Pro features", "Lifetime access", "Priority support", "Pay once, use forever"],
    cta: "Get Lifetime Access", highlight: false,
  },
];

// ── Output Preview Card ────────────────────────────────────────────────────────
function OutputPreviewCard() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.08)] max-w-[640px] mx-auto">
      {/* Card header */}
      <div className="bg-primary/5 border-b border-border px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[13px] font-semibold text-foreground">Client Website Brief</span>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
          ✓ Ready to build
        </span>
      </div>

      {/* Brief content */}
      <div className="p-5 space-y-4">
        {[
          { label: "Project overview", value: "Modern SaaS landing page" },
          { label: "Target audience", value: "Startup founders & early-stage teams" },
          { label: "Primary goal", value: "Generate demo bookings" },
          { label: "Tone & style", value: "Clean, professional, modern" },
          { label: "CTA button", value: "\"Book a Demo\"" },
        ].map((row) => (
          <div key={row.label} className="flex items-start gap-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[130px] shrink-0 pt-0.5">{row.label}</span>
            <span className="text-[13.5px] text-foreground">{row.value}</span>
          </div>
        ))}

        {/* Key sections */}
        <div className="flex items-start gap-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-[130px] shrink-0 pt-0.5">Key sections</span>
          <div className="flex flex-wrap gap-1.5">
            {["Hero with strong CTA", "Features breakdown", "Testimonials", "Pricing section"].map(s => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15 font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 py-3 flex items-center justify-between bg-secondary/30">
        <span className="text-[11px] text-muted-foreground">Generated in 2 minutes · 8 fields filled</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-primary cursor-pointer hover:underline">Copy brief</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-[11px] font-medium text-primary cursor-pointer hover:underline">Export CSV</span>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setCurrentPlan(data.plan); });
  }, [user]);

  const handlePlanClick = async (planName: string) => {
    if (!user) { navigate("/auth"); return; }
    const planKey = planName === "Free" ? "free" : planName === "Lifetime" ? "lifetime" : "pro";
    setUpgrading(planName);
    const { error } = await supabase.from("profiles")
      .upsert({ user_id: user.id, plan: planKey }, { onConflict: "user_id" });
    setUpgrading(null);
    if (error) toast.error("Failed to update plan. Please try again.");
    else {
      toast.success(planName === "Free" ? "Switched to Free plan!" : `Upgraded to ${planName}!`);
      setCurrentPlan(planKey);
      navigate("/clients");
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 inset-x-0 z-50 px-6 md:px-10 h-16 flex items-center justify-between transition-all ${scrolled ? "bg-background/94 backdrop-blur-xl border-b border-border" : ""}`}>
        <div className="flex items-center gap-2.5 font-display text-xl text-foreground">
          <img src="/favicon.svg" className="w-8 h-8" alt="Onboardly" />
          Onboardly
        </div>
        <div className="hidden md:flex items-center gap-8">
          {[["How it works", "#how-it-works"], ["Features", "#features"], ["Pricing", "#pricing"], ["Testimonials", "#testimonials"]].map(([l, href]) =>
            <a key={l} href={href} className="text-sm text-muted-foreground font-medium hover:text-foreground transition-colors">{l}</a>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {user ? (
            <Link to="/clients" className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md text-primary-foreground bg-primary">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/auth" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground border border-border hover:text-foreground hover:border-foreground transition-all">Log in</Link>
              <Link to="/auth" className="hidden sm:inline-flex px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md text-primary-foreground bg-primary">Start Free →</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 md:px-10 pt-[120px] pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_0%,hsl(var(--background))_70%)] pointer-events-none" />

        {/* Audience badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground mb-7">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            Built for web designers & agencies handling multiple clients
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="font-display text-[clamp(36px,7vw,80px)] font-bold leading-[1.05] text-foreground max-w-[820px] mb-5 relative z-10"
        >
          Turn messy client answers<br />into a clear website brief <em className="italic text-primary">in 2 minutes.</em>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-[17px] text-muted-foreground leading-relaxed max-w-[520px] mb-9 relative z-10"
        >
          Stop chasing clients for details. Collect everything once — and instantly get a structured website plan you can actually build from.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4 relative z-10"
        >
          <Link to="/auth" className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold text-primary-foreground bg-primary shadow-[0_4px_20px_hsl(var(--accent-glow))] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_hsl(var(--accent-glow))] transition-all">
            Generate Your First Client Brief →
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-[12px] text-muted-foreground/60 mb-10 relative z-10"
        >
          Free forever for up to 2 clients · No credit card needed
        </motion.p>

        {/* Browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}
          className="relative z-10 w-full max-w-[680px]"
        >
          <div className="bg-card/80 backdrop-blur-3xl border border-border/80 rounded-2xl overflow-hidden shadow-[0_32px_80px_-10px_rgba(var(--primary),0.15)] ring-1 ring-border shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="bg-secondary/60 backdrop-blur-md border-b border-border/60 h-10 flex items-center px-4 gap-1.5 relative z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning" />
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <div className="flex-1 text-center text-[11.5px] text-muted-foreground">onboardly.app/onboarding/abc123</div>
            </div>
            <div className="p-5 bg-background space-y-3">
              {[
                { label: "Brand guidelines PDF", type: "file", done: true },
                { label: "Primary brand colors", type: "text", done: true },
                { label: "Company logo (SVG)", type: "file", done: false },
                { label: "Approve homepage layout", type: "checkbox", done: false },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${item.done ? "border-primary/20 bg-primary/[0.03]" : "border-border"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] ${item.done ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                    {item.done && "✓"}
                  </div>
                  <span className={`text-[13px] ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">{item.type}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: "50%" }} />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">50%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── OUTPUT PREVIEW ── */}
      <section className="py-20 px-6 md:px-10 bg-card border-y border-border">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-10">
            <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center justify-center gap-2">
              <span className="w-5 h-[1.5px] bg-primary rounded-full" />The output
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-3.5">
              See exactly <em className="italic font-normal">what you get 👇</em>
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[480px] mx-auto">
              Every client submission generates a structured brief like this — ready to build from, no interpretation needed.
            </p>
          </div>
          <OutputPreviewCard />
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="py-20 px-6 md:px-10">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center gap-2">
            <span className="w-5 h-[1.5px] bg-primary rounded-full" />Sound familiar?
          </div>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-10 max-w-[560px]">
            You're wasting time on <em className="italic font-normal">every client.</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAIN_POINTS.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-card border border-border rounded-[13px]">
                <span className="text-lg shrink-0">{p.icon}</span>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed">{p.text}</p>
              </div>
            ))}
            {/* Solution teaser */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-[13px]">
              <span className="text-lg shrink-0">✅</span>
              <p className="text-[13.5px] text-primary font-medium leading-relaxed">Onboardly fixes all of this with one link.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BEFORE vs AFTER ── */}
      <section className="py-20 px-6 md:px-10 bg-card border-y border-border">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center gap-2">
            <span className="w-5 h-[1.5px] bg-primary rounded-full" />The difference
          </div>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-10 max-w-[560px]">
            From messy chats to <em className="italic font-normal">a clear plan.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[760px]">
            {/* Before */}
            <div className="border border-destructive/20 rounded-[13px] overflow-hidden">
              <div className="px-4 py-2.5 bg-destructive/5 border-b border-destructive/15">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive">Before Onboardly</p>
              </div>
              <div className="p-4 space-y-3">
                {["Scattered WhatsApp messages", "Missing requirements until mid-project", "Confusing and shifting project scope"].map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-destructive text-xs shrink-0">✕</span>
                    <span className="text-[13px] text-muted-foreground">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* After */}
            <div className="border border-success/20 rounded-[13px] overflow-hidden">
              <div className="px-4 py-2.5 bg-success/5 border-b border-success/15">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-success">After Onboardly</p>
              </div>
              <div className="p-4 space-y-3">
                {["One structured brief — everything in one place", "Clear sections, goals, and requirements from day one", "Ready-to-build website plan, no interpretation needed"].map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-success text-xs shrink-0">✓</span>
                    <span className="text-[13px] text-foreground">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 md:px-10">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center gap-2">
            <span className="w-5 h-[1.5px] bg-primary rounded-full" />How it works
          </div>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-3.5 max-w-[580px]">
            Up and running in <em className="italic font-normal">under 5 minutes.</em>
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[480px] mb-12">
            No complicated setup. No learning curve. Just create a client, send the link, and get a structured brief back.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative bg-card border border-border rounded-[13px] p-6">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-[2.2rem] left-[calc(100%+1px)] w-4 text-muted-foreground/30 text-lg z-10">→</div>
                )}
                <div className="font-display text-[32px] font-bold text-primary/20 mb-3 leading-none">{step.step}</div>
                <div className="text-[15px] font-semibold text-foreground mb-1.5">{step.title}</div>
                <div className="text-[13px] text-muted-foreground leading-relaxed">{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 md:px-10 bg-card border-y border-border">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center gap-2">
            <span className="w-5 h-[1.5px] bg-primary rounded-full" />Features
          </div>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-3.5 max-w-[580px]">
            Built around what<br /><em className="italic font-normal">actually matters.</em>
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[480px] mb-12">
            Not another project tool. Just the one thing you need before a project starts.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className={`border border-border rounded-[13px] p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg ${f.highlight ? "bg-foreground border-foreground" : "bg-background"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3.5 ${f.highlight ? "bg-primary-foreground/10" : "bg-secondary"}`}>{f.icon}</div>
                <div className={`text-[15.5px] font-semibold mb-1.5 ${f.highlight ? "text-background" : "text-foreground"}`}>{f.title}</div>
                <div className={`text-[13.5px] leading-relaxed ${f.highlight ? "text-background/60" : "text-muted-foreground"}`}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AFTER SUBMIT ── */}
      <section className="py-20 px-6 md:px-10">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center gap-2">
            <span className="w-5 h-[1.5px] bg-primary rounded-full" />After they submit
          </div>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-3.5 max-w-[580px]">
            You're ready to start.<br /><em className="italic font-normal">Immediately.</em>
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-[480px] mb-12">
            When your client hits submit, everything you need is already waiting in your dashboard.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AFTER_SUBMIT_STEPS.map((step, i) => (
              <div key={i} className="bg-card border border-border rounded-[13px] p-6 relative">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mb-4">{i + 1}</div>
                <div className="text-2xl mb-3">{step.icon}</div>
                <div className="text-[15px] font-semibold text-foreground mb-1.5">{step.title}</div>
                <div className="text-[13.5px] text-muted-foreground leading-relaxed">{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 px-6 md:px-10 bg-card border-y border-border">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center gap-2">
            <span className="w-5 h-[1.5px] bg-primary rounded-full" />What they say
          </div>
          <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-12 max-w-[580px]">
            Designers who switched to <em className="italic font-normal">Onboardly</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-background border border-border rounded-[13px] p-5 hover:shadow-md transition-shadow">
                <div className="text-xs text-warning mb-2.5 tracking-[2px]">★★★★★</div>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-4 italic">"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11px] font-bold text-primary-foreground" style={{ background: t.color }}>{t.init}</div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 md:px-10">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-14">
            <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-3.5 flex items-center justify-center gap-2">
              <span className="w-5 h-[1.5px] bg-primary rounded-full" />Pricing
            </div>
            <h2 className="font-display text-[clamp(28px,4vw,46px)] font-bold leading-tight text-foreground mb-3.5">
              Start free. <em className="italic font-normal">Upgrade when you're ready.</em>
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[440px] mx-auto">
              No pressure. The free plan is genuinely useful. Upgrade only when you need more.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[900px] mx-auto">
            {PLANS.map((plan) => {
              const planKey = plan.name === "Free" ? "free" : plan.name === "Lifetime" ? "lifetime" : "pro";
              const isCurrent = currentPlan === planKey;
              return (
                <div key={plan.name} className={`relative border rounded-[16px] p-6 flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg ${isCurrent ? "border-primary ring-2 ring-primary/30 bg-primary/[0.06]"
                    : plan.highlight ? "border-primary bg-primary/[0.03] shadow-[0_0_40px_hsl(var(--accent-glow))]"
                      : "border-border bg-card"
                  }`}>
                  {isCurrent && (
                    <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap">✓ Current Plan</div>
                  )}
                  {(plan as any).badge && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success/20 text-success border border-success/30 text-[11px] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      {(plan as any).badge}
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="text-[15px] font-semibold text-foreground mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-[40px] font-bold text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <span className="text-primary text-xs">✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handlePlanClick(plan.name)}
                    disabled={isCurrent || upgrading === plan.name}
                    className={`w-full py-2.5 rounded-lg text-[13px] font-semibold text-center transition-all disabled:opacity-70 ${isCurrent ? "bg-primary/10 text-primary cursor-default"
                        : plan.highlight ? "bg-primary text-primary-foreground hover:brightness-110"
                          : "bg-secondary text-foreground border border-border hover:bg-muted"
                      }`}>
                    {isCurrent ? "Current Plan" : upgrading === plan.name ? "Updating..." : plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 md:px-10 text-center bg-card border-t border-border">
        <div className="max-w-[640px] mx-auto">
          <p className="text-[12px] text-muted-foreground mb-6 flex items-center justify-center gap-4 flex-wrap">
            <span>✓ Free to start</span>
            <span>✓ No credit card</span>
            <span>✓ Setup in under 5 minutes</span>
          </p>
          <h2 className="font-display text-[clamp(30px,5vw,54px)] font-bold leading-[1.1] text-foreground mb-3.5">
            Generate your first client brief <em className="italic text-primary">in minutes.</em>
          </h2>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
            Stop wasting time on back-and-forth. Set up once, collect everything you need, start every project with confidence.
          </p>
          <Link to="/auth" className="inline-flex px-8 py-4 rounded-xl text-[15px] font-semibold text-primary-foreground bg-primary shadow-[0_4px_20px_hsl(var(--accent-glow))] hover:brightness-110 transition-all">
            Start Free →
          </Link>
          <p className="text-xs text-muted-foreground/50 mt-4">Free forever for up to 2 clients. No surprises.</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-6 md:px-10 py-6 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
          <img src="/favicon.svg" className="w-8 h-8" alt="Onboardly" />
          © 2026 Onboardly. All rights reserved.
        </div>
        <div className="flex gap-6">
          {["Privacy", "Terms", "Support"].map((l) => (
            <a key={l} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}