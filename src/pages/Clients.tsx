import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search, Clock, CheckCircle, Users, ChevronDown, Trash2,
  ArrowRight, Copy, ExternalLink, Bell, Plus, Eye, Sparkles, Zap, Crown, X, Check,
  Globe, ShoppingCart, User, Layout, Cpu, FileText,
} from "lucide-react";
import CreateClientDialog from "@/components/CreateClientDialog";
import ClientDetailDialog from "@/components/ClientDetailDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

import { ClientRow } from "@/types/client";
import { calcProgress, deriveState, formatRelativeTime, AVATAR_COLORS, INITIALS } from "@/lib/clientUtils";
import { StateBadge } from "@/components/clients/StateBadge";
import { GettingStarted } from "@/components/clients/GettingStarted";
import { DemoClientCard } from "@/components/clients/DemoClientCard";
import { ActivityFeed } from "@/components/clients/ActivityFeed";

type SortKey = "name" | "date" | "progress";
type Plan = "free" | "pro" | "lifetime";

// ── Plan Badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: Plan }) {
  const config = {
    free: { label: "Free", icon: <Sparkles size={11} />, cls: "bg-muted/40 text-muted-foreground border-border" },
    pro: { label: "Pro", icon: <Zap size={11} />, cls: "bg-primary/10 text-primary border-primary/25" },
    lifetime: { label: "Lifetime", icon: <Crown size={11} />, cls: "bg-amber-500/10 text-amber-400 border-amber-500/25" },
  }[plan] ?? { label: "Free", icon: <Sparkles size={11} />, cls: "bg-muted/40 text-muted-foreground border-border" };

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${config.cls}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Clients() {
  const { user, signOut, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_started" | "in_progress" | "needs_followup" | "completed">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan>("free");
  const [showPricing, setShowPricing] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  // Fetch current plan
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.plan) setCurrentPlan(data.plan as Plan);
      });
  }, [user]);

  const handlePlanClick = async (planName: string) => {
    if (!user) return;
    const planKey = planName === "Free" ? "free" : planName === "Lifetime" ? "lifetime" : "pro";
    setUpgrading(planName);
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, plan: planKey }, { onConflict: "user_id" });
    setUpgrading(null);
    if (error) {
      toast.error("Failed to update plan. Please try again.");
    } else {
      setCurrentPlan(planKey as Plan);
      toast.success(planName === "Free" ? "Switched to Free plan" : `🎉 Upgraded to ${planName}!`);
      if (planName !== "Free") setShowPricing(false);
    }
  };

  const { data: clients = [], isLoading: loading } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select(`
          id, name, email, token, status, created_at, link_opened_at,
          onboarding_responses (
            client_id, business_name, business_description, target_audience,
            competitors, website_goal, pages_needed, budget, timeline, updated_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) { toast.error("Failed to load clients."); throw error; }

      return (clientsData ?? []).map((c: any) => {
        const r = Array.isArray(c.onboarding_responses) ? c.onboarding_responses[0] : c.onboarding_responses;
        const progress = calcProgress(r);
        const updatedAt = r?.updated_at ?? null;
        return {
          ...c,
          status: (c.status === "completed" ? "completed" : "pending") as "pending" | "completed",
          progress,
          updated_at: updatedAt,
          link_opened_at: c.link_opened_at ?? null,
          client_state: deriveState(c.status, progress, updatedAt, c.link_opened_at),
        };
      }) as ClientRow[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_responses" }, () => {
        queryClient.invalidateQueries({ queryKey: ['clients', user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        queryClient.invalidateQueries({ queryKey: ['clients', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  if (authLoading) return <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const copyLink = (token: string, clientId: string) => {
    const url = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(clientId);
      toast.success("Link copied! Now send it to your client 🔗");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const sendWhatsApp = (token: string, name: string) => {
    const url = `${window.location.origin}/onboarding/${token}`;
    const text = encodeURIComponent(`Hi! Please fill out your onboarding form here: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("clients").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Failed to delete client.");
    else {
      toast.success("Client deleted.");
      queryClient.invalidateQueries({ queryKey: ['clients', user?.id] });
      if (selectedClient?.id === deleteTarget.id) setSelectedClient(null);
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  const filtered = clients
    .filter(c => statusFilter === "all" || c.client_state === statusFilter)
    .filter(c => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      if (sortKey === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortKey === "progress") cmp = a.progress - b.progress;
      return sortAsc ? cmp : -cmp;
    });

  const totalClients = clients.length;
  const completedCount = clients.filter(c => c.client_state === "completed").length;
  const inProgressCount = clients.filter(c => c.client_state === "in_progress").length;
  const needsFollowupCount = clients.filter(c => c.client_state === "needs_followup").length;
  const avgCompletion = totalClients > 0
    ? Math.round(clients.reduce((s, c) => s + c.progress, 0) / totalClients)
    : 0;

  return (
    <div className="min-h-screen bg-background">

      {/* ── HEADER ── */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 px-4 sm:px-6">
        <div className="max-w-[1000px] mx-auto h-[60px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" className="w-8 h-8" alt="Onboardly" />
            <span className="font-display text-xl text-foreground tracking-tight">Onboardly</span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Plan badge */}
            <a href="/#pricing" className="hidden sm:block hover:opacity-80 transition-opacity">
              <PlanBadge plan={currentPlan} />
            </a>
            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground">
                {user.user_metadata?.full_name?.split(" ")[0] || user.email}
              </span>
            </div>
            {/* Upgrade button — only for free users */}
            {currentPlan === "free" && (
              <button
                onClick={() => setShowPricing(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15 transition-all">
                <Zap size={11} /> Upgrade
              </button>
            )}
            <button onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-2 border border-transparent hover:border-border">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-[24px] sm:text-[28px] text-foreground leading-tight">
              {clients.length === 0
                ? "No clients onboarded yet."
                : needsFollowupCount > 0
                  ? `${needsFollowupCount} client${needsFollowupCount > 1 ? "s need" : " needs"} a follow-up`
                  : inProgressCount > 0
                    ? `${inProgressCount} client${inProgressCount > 1 ? "s are" : " is"} filling their form`
                    : "All caught up!"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {clients.length === 0
                ? "Start your first onboarding flow — takes 2 minutes."
                : "Click any client to view their details and take action."}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowTemplate(true)}
              disabled={currentPlan === "free" && clients.length >= 2}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all hover:-translate-y-0.5 shadow-[0_4px_16px_hsl(var(--accent-glow))] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
              <Plus size={14} /> Create Client Intake
            </button>
          </div>
        </div>

        {/* ── FREE PLAN LIMIT BANNER ── */}
        {currentPlan === "free" && clients.length >= 2 && (
          <div className="mb-5 flex items-center justify-between gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Zap size={15} className="text-amber-400 shrink-0" />
              <p className="text-[13px] text-foreground">
                Free plan limit reached — <span className="text-amber-400 font-semibold">2 active clients</span>. Upgrade to add unlimited clients.
              </p>
            </div>
            <button
              onClick={() => setShowPricing(true)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all whitespace-nowrap">
              Upgrade →
            </button>
          </div>
        )}

        {/* ── GETTING STARTED ── */}
        <GettingStarted clients={clients} onCreateClient={() => setShowTemplate(true)} />

        {/* ── STAT CARDS ── */}
        {clients.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: <Users size={15} className="text-primary" />, label: "Total", value: totalClients, bg: "bg-primary/5 border-primary/15" },
              { icon: <ArrowRight size={15} className="text-amber-400" />, label: "Avg Progress", value: `${avgCompletion}%`, bg: "bg-amber-500/5 border-amber-500/15" },
              { icon: <Clock size={15} className="text-blue-400" />, label: "In Progress", value: inProgressCount, bg: "bg-blue-500/5 border-blue-500/15" },
              { icon: <CheckCircle size={15} className="text-emerald-400" />, label: "Completed", value: completedCount, bg: "bg-emerald-500/5 border-emerald-500/15" },
            ].map(s => (
              <div key={s.label} className={`border rounded-2xl p-4 ${s.bg}`}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <div className="w-6 h-6 rounded-lg bg-background/40 flex items-center justify-center">{s.icon}</div>
                </div>
                <p className="font-display text-[28px] text-foreground leading-none">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── ACTIVITY FEED ── */}
        {clients.length > 0 && <ActivityFeed clients={clients} />}

        {/* ── CLIENT LIST HEADER ── */}
        {clients.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-[18px] text-foreground">Your Clients</h2>
              <button 
                onClick={() => setShowTemplate(true)}
                disabled={currentPlan === "free" && clients.length >= 2}
                className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-primary text-primary-foreground disabled:opacity-50">
                <Plus size={12} /> New
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full py-2.5 pl-9 pr-3 bg-surface border border-border rounded-xl text-[13px] text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/40"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1.5">
                {(["name", "date", "progress"] as SortKey[]).map(key => (
                  <button key={key} onClick={() => handleSort(key)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium border transition-all hidden sm:flex items-center gap-1 ${sortKey === key ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface border-border text-muted-foreground hover:text-foreground"
                      }`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {sortKey === key && <ChevronDown size={10} className={`transition-transform ${sortAsc ? "rotate-180" : ""}`} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
              {([
                { key: "all", label: "All" },
                { key: "not_started", label: "Not Opened" },
                { key: "in_progress", label: "Filling Form" },
                { key: "needs_followup", label: "Follow-up" },
                { key: "completed", label: "Ready" },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${statusFilter === f.key
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_hsl(var(--accent-glow))]"
                    : "border-border text-muted-foreground hover:text-foreground bg-surface"
                    }`}>
                  {f.label}
                  {f.key !== "all" && (
                    <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${statusFilter === f.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"
                      }`}>
                      {clients.filter(c => c.client_state === f.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── CLIENT CARDS ── */}
        {loading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 w-full max-w-sm">
                  <div className="w-10 h-10 rounded-xl bg-muted-foreground/10 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted-foreground/10 rounded-md w-3/4 animate-pulse" />
                    <div className="h-3 bg-muted-foreground/10 rounded-md w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : clients.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl mx-auto mb-5">📋</div>
            <h3 className="font-display text-2xl text-foreground mb-2">No clients yet</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-[340px] mx-auto leading-relaxed">
              Create your first client and send them an onboarding link in under 2 minutes.
            </p>
            <button onClick={() => setShowTemplate(true)}
              className="group px-6 py-3 rounded-xl text-[14px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all hover:-translate-y-0.5 shadow-[0_4px_20px_hsl(var(--accent-glow))] flex items-center justify-center gap-2 mx-auto mb-4">
              Create your first client <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[11px] text-muted-foreground/50 mb-10">Takes 2 minutes · No login needed for your client</p>
            <div className="max-w-[560px] mx-auto text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">See how it looks</p>
              <DemoClientCard />
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p className="text-sm text-muted-foreground">No clients match your search or filter.</p>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filtered.map((client, i) => {
                const [color1, color2] = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const isCopied = copiedId === client.id;
                return (
                  <motion.div layout key={client.id}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/25 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all">

                    <div className="flex items-center gap-3.5 px-4 py-4 cursor-pointer" onClick={() => setSelectedClient(client)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
                        {INITIALS(client.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">{client.name}</span>
                          <StateBadge state={client.client_state} />
                          {(client as any).template_type && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-muted-foreground font-medium">
                              {(client as any).template_type}
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-muted-foreground">
                          {client.email || "No email"} · Added {formatRelativeTime(client.created_at)}
                        </p>
                      </div>
                      <div className="w-[120px] hidden sm:block shrink-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground/60">
                            {client.client_state === "not_started" ? "Not opened"
                              : client.client_state === "completed" ? "Complete"
                                : client.client_state === "needs_followup" ? "Stalled"
                                  : "In progress"}
                          </span>
                          <span className="text-[11px] font-semibold text-foreground">{client.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${client.client_state === "completed" ? "bg-emerald-400"
                            : client.client_state === "needs_followup" ? "bg-red-400"
                              : "bg-primary"
                            }`} style={{ width: `${client.progress}%` }} />
                        </div>
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDeleteTarget(client)}
                          className="p-2 rounded-lg border border-transparent text-muted-foreground/30 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-all opacity-0 group-hover:opacity-100 ml-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {(client.client_state === "not_started" || client.client_state === "needs_followup") && (
                      <div className={`flex items-center gap-2 px-4 py-2.5 border-t ${client.client_state === "needs_followup" ? "border-red-500/15 bg-red-500/[0.03]" : "border-border bg-surface-2/50"
                        }`}>
                        <span className="text-[11px] text-muted-foreground mr-auto">
                          {client.client_state === "needs_followup" ? "⚠️ No activity in 48h — send a reminder" : "Client hasn't opened the link yet"}
                        </span>
                        <button onClick={e => { e.stopPropagation(); copyLink(client.token, client.id); }}
                          className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${isCopied ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                            }`}>
                          <Copy size={11} /> {isCopied ? "Copied!" : "Copy Link"}
                        </button>
                        <button onClick={e => { e.stopPropagation(); sendWhatsApp(client.token, client.name); }}
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all">
                          <ExternalLink size={11} /> WhatsApp
                        </button>
                      </div>
                    )}

                    {client.client_state === "completed" && (
                      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-emerald-500/15 bg-emerald-500/[0.02]">
                        <span className="text-[11px] text-emerald-400 mr-auto">✅ Brief complete — ready to start the project</span>
                        <button onClick={e => { e.stopPropagation(); setSelectedClient(client); }}
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all">
                          <Eye size={11} /> View Brief
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {clients.length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground/30 mt-8">
            Click any client to view their full onboarding details
          </p>
        )}
      </div>

      {showCreate && (
        <CreateClientDialog
          userId={user.id}
          selectedTemplate={selectedTemplate}
          onClose={() => { setShowCreate(false); setSelectedTemplate(null); }}
          onCreated={() => { setShowCreate(false); setSelectedTemplate(null); queryClient.invalidateQueries({ queryKey: ['clients', user?.id] }); }}
        />
      )}

      {selectedClient && (
        <ClientDetailDialog client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdated={() => { queryClient.invalidateQueries({ queryKey: ['clients', user?.id] }); setSelectedClient(null); }} />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); handleDelete(); }} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* ── TEMPLATE SELECTION MODAL ── */}
      <AnimatePresence>
        {showTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            onClick={() => setShowTemplate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="bg-surface border border-border rounded-[20px] w-full max-w-[680px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.3)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4">
                <div>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">New Client</p>
                  <h2 className="font-display text-[24px] text-foreground tracking-tight leading-tight">Choose a Template</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">Start with a pre-built onboarding structure</p>
                </div>
                <button onClick={() => setShowTemplate(false)}
                  className="p-2 rounded-xl hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Templates grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-6 pb-6">
                {[
                  { name: "Landing Page", desc: "Single-page site to capture leads", icon: <FileText size={22} />, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { name: "Business Website", desc: "Full website for established businesses", icon: <Globe size={22} />, color: "text-purple-400", bg: "bg-purple-500/10" },
                  { name: "E-commerce", desc: "Online store with products & checkout", icon: <ShoppingCart size={22} />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { name: "Portfolio", desc: "Showcase work, case studies & skills", icon: <User size={22} />, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { name: "SaaS", desc: "Product site with features & pricing", icon: <Cpu size={22} />, color: "text-pink-400", bg: "bg-pink-500/10" },
                  { name: "Custom", desc: "Start blank and build your own flow", icon: <Layout size={22} />, color: "text-muted-foreground", bg: "bg-surface-2" },
                ].map(t => (
                  <motion.button
                    key={t.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedTemplate(t.name);
                      setShowTemplate(false);
                      setShowCreate(true);
                    }}
                    className="group text-left p-4 rounded-[14px] border border-border bg-surface-2 hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center mb-3 ${t.color} group-hover:scale-110 transition-transform`}>
                      {t.icon}
                    </div>
                    <p className="text-[13px] font-semibold text-foreground mb-1">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{t.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PRICING MODAL ── */}
      <AnimatePresence>
        {showPricing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            onClick={() => setShowPricing(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              className="bg-surface border border-border rounded-[20px] w-full max-w-[820px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.3)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-0">
                <div>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Choose Your Plan</p>
                  <h2 className="font-display text-[26px] text-foreground tracking-tight leading-tight">
                    Start free. <em className="italic">Upgrade when ready.</em>
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-1">No pressure — the free plan is genuinely useful.</p>
                </div>
                <button
                  onClick={() => setShowPricing(false)}
                  className="p-2 rounded-xl hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-all mt-1">
                  <X size={18} />
                </button>
              </div>

              {/* Plans */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
                {[
                  {
                    name: "Free",
                    price: "$0",
                    period: "forever",
                    features: ["2 active clients", "1 template", "Onboardly branding"],
                    cta: "Stay on Free",
                    highlight: false,
                  },
                  {
                    name: "Pro",
                    price: "$9",
                    period: "/month",
                    features: ["Unlimited clients", "Unlimited templates", "File uploads", "Completion tracking", "Remove branding"],
                    cta: "Go Pro",
                    highlight: true,
                    badge: "Most popular",
                  },
                  {
                    name: "Lifetime",
                    price: "$79",
                    period: "one-time",
                    badge: "Best value",
                    features: ["All Pro features", "Lifetime access", "Priority support", "Pay once, use forever"],
                    cta: "Get Lifetime Access",
                    highlight: false,
                  },
                ].map((plan) => {
                  const planKey = plan.name === "Free" ? "free" : plan.name === "Lifetime" ? "lifetime" : "pro";
                  const isCurrent = currentPlan === planKey;
                  return (
                    <div key={plan.name} className={`relative border rounded-[16px] p-5 flex flex-col transition-all ${isCurrent
                      ? "border-primary ring-2 ring-primary/20 bg-primary/[0.04]"
                      : plan.highlight
                        ? "border-primary bg-primary/[0.03] shadow-[0_0_30px_hsl(var(--accent-glow))]"
                        : "border-border bg-surface-2"
                      }`}>
                      {isCurrent && (
                        <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                          ✓ Current Plan
                        </div>
                      )}
                      {plan.badge && !isCurrent && (
                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-3 py-1 rounded-full border whitespace-nowrap ${plan.name === "Lifetime"
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : "bg-primary/10 text-primary border-primary/25"
                          }`}>
                          {plan.badge}
                        </div>
                      )}
                      <div className="mb-4">
                        <h3 className="text-[14px] font-semibold text-foreground mb-1">{plan.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-[36px] text-foreground leading-none">{plan.price}</span>
                          <span className="text-[12px] text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>
                      <ul className="space-y-2 mb-5 flex-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                            <Check size={12} className="text-primary shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handlePlanClick(plan.name)}
                        disabled={isCurrent || upgrading === plan.name}
                        className={`w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-60 ${isCurrent
                          ? "bg-primary/10 text-primary cursor-default"
                          : plan.highlight
                            ? "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_4px_16px_hsl(var(--accent-glow))]"
                            : "bg-surface border border-border text-foreground hover:bg-surface-2"
                          }`}>
                        {isCurrent ? "Current Plan" : upgrading === plan.name ? "Updating..." : plan.cta}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer note */}
              <div className="border-t border-border px-6 py-4 text-center">
                <p className="text-[11px] text-muted-foreground">Secure payment. Cancel anytime. Questions? <a href="mailto:support@onboardly.app" className="text-primary hover:underline">support@onboardly.app</a></p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}