import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Clock, CheckCircle, Users, ChevronDown, Trash2, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import CreateClientDialog from "@/components/CreateClientDialog";
import ClientDetailDialog from "@/components/ClientDetailDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ClientRow {
  id:             string;
  name:           string;
  email:          string | null;
  token:          string;
  status:         "pending" | "completed";
  created_at:     string;
  progress:       number;
  updated_at:     string | null;
  link_opened_at: string | null;
  client_state:   "not_started" | "in_progress" | "needs_followup" | "completed";
}

type SortKey = "name" | "date" | "progress";

const AVATAR_COLORS = [
  ["#7C6EF2","#9B8FF5"], ["#F59E0B","#F7B731"], ["#34D399","#10B981"],
  ["#60A5FA","#3B82F6"], ["#F472B6","#EC4899"], ["#EF4444","#DC2626"], ["#8B5CF6","#7C3AED"],
];
const INITIALS = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0,2);

function calcProgress(r: any): number {
  if (!r) return 0;
  const fields = [
    r.business_name, r.business_description, r.target_audience,
    r.competitors, r.website_goal, r.budget, r.timeline,
    r.pages_needed?.length > 0 ? "x" : "",
  ];
  return Math.round(fields.filter(Boolean).length / 8 * 100);
}

function deriveState(status: string, progress: number, updatedAt: string | null, linkOpenedAt?: string | null): ClientRow["client_state"] {
  if (status === "completed") return "completed";
  if (progress === 0 && !linkOpenedAt) return "not_started";
  if (updatedAt) {
    const hoursAgo = (Date.now() - new Date(updatedAt).getTime()) / 36e5;
    if (hoursAgo > 48) return "needs_followup";
  }
  return "in_progress";
}

function dynamicStatusLabel(state: ClientRow["client_state"], linkOpenedAt?: string | null, progress?: number): string {
  if (state === "completed") return "Onboarding complete";
  if (state === "needs_followup") return "No response in 48h — send reminder";
  if (state === "in_progress") {
    if (linkOpenedAt && (progress ?? 0) === 0) return "Client viewed the onboarding form";
    return "Client started filling details";
  }
  return "Waiting for client to open link";
}

function nextAction(state: ClientRow["client_state"]): string {
  switch (state) {
    case "not_started":    return "Send onboarding link";
    case "in_progress":    return "Review progress";
    case "needs_followup": return "Send reminder";
    case "completed":      return "Start project";
  }
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function StateBadge({ state }: { state: ClientRow["client_state"] }) {
  const config = {
    not_started:    { label: "Not Started",     cls: "bg-zinc-800/60 text-zinc-400 border-zinc-700/60",         dot: "bg-zinc-500" },
    in_progress:    { label: "In Progress",     cls: "bg-amber-500/10 text-amber-400 border-amber-500/25",      dot: "bg-amber-400" },
    needs_followup: { label: "Needs Follow-up", cls: "bg-red-500/10 text-red-400 border-red-500/25",            dot: "bg-red-400" },
    completed:      { label: "Completed",       cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",dot: "bg-emerald-400" },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${config.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function GuidedEmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl mx-auto mb-5">📋</div>
      <h3 className="font-display text-2xl text-foreground mb-2">No clients yet</h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-[340px] mx-auto leading-relaxed">
        Create your first client and send them an onboarding link. They'll fill everything you need in minutes.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 mb-10 max-w-[480px] mx-auto">
        {[
          { icon: "➕", label: "Create client" },
          { icon: "🔗", label: "Send link" },
          { icon: "📋", label: "Get details" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-0">
            <div className="flex flex-col items-center px-4">
              <div className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-xl mb-2">{s.icon}</div>
              <p className="text-[12px] font-medium text-foreground">{s.label}</p>
            </div>
            {i < 2 && <ArrowRight size={14} className="text-muted-foreground/30 hidden sm:block mb-5 flex-shrink-0"/>}
          </div>
        ))}
      </div>
      <button onClick={onStart}
        className="px-6 py-3 rounded-xl text-[14px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all hover:-translate-y-0.5 shadow-[0_4px_20px_hsl(var(--accent-glow))]">
        + Create Your First Client
      </button>
      <p className="text-[11px] text-muted-foreground/60 mt-3">✓ Most clients complete onboarding within a few hours</p>
    </div>
  );
}

export default function Clients() {
  const { user, signOut, loading: authLoading } = useAuth();

  const [clients,        setClients]        = useState<ClientRow[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<ClientRow | null>(null);
  const [deleting,       setDeleting]       = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [statusFilter,   setStatusFilter]   = useState<"all"|"not_started"|"in_progress"|"needs_followup"|"completed">("all");
  const [sortKey,        setSortKey]        = useState<SortKey>("date");
  const [sortAsc,        setSortAsc]        = useState(false);
  const [showSortMenu,   setShowSortMenu]   = useState(false);
  const [hasAutoOpened,  setHasAutoOpened]  = useState(false);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    try {
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select("id, name, email, token, status, created_at, link_opened_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (clientsData ?? []).map(c => c.id);
      const { data: responses } = ids.length > 0
        ? await supabase
            .from("onboarding_responses")
            .select("client_id, business_name, business_description, target_audience, competitors, website_goal, pages_needed, budget, timeline, updated_at")
            .in("client_id", ids)
        : { data: [] };

      const responseMap = new Map((responses ?? []).map(r => [r.client_id, r]));

      setClients((clientsData ?? []).map(c => {
        const r         = responseMap.get(c.id) ?? null;
        const progress  = calcProgress(r);
        const updatedAt = r?.updated_at ?? null;
        return {
          ...c,
          status:         (c.status === "completed" ? "completed" : "pending") as "pending"|"completed",
          progress,
          updated_at:     updatedAt,
          link_opened_at: c.link_opened_at ?? null,
          client_state:   deriveState(c.status, progress, updatedAt, c.link_opened_at),
        };
      }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Realtime subscription — auto-refresh when onboarding_responses or clients change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "onboarding_responses" },
        () => { fetchClients(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => { fetchClients(); }
      )
      .subscribe();

    // Polling fallback — refresh every 15 seconds
    const poll = setInterval(() => { fetchClients(); }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [user, fetchClients]);

  // Auto-open create modal on first visit
  useEffect(() => {
    if (!loading && clients.length === 0 && !hasAutoOpened) {
      setHasAutoOpened(true);
      setTimeout(() => setShowCreate(true), 600);
    }
  }, [loading, clients.length, hasAutoOpened]);

  if (authLoading) return <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">Loading...</div>;
  if (!user)       return <Navigate to="/auth" replace />;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("clients").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Failed to delete client.");
    else {
      toast.success("Client deleted.");
      setClients(prev => prev.filter(c => c.id !== deleteTarget.id));
      if (selectedClient?.id === deleteTarget.id) setSelectedClient(null);
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(key === "name"); }
    setShowSortMenu(false);
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
      if (sortKey === "name")     cmp = a.name.localeCompare(b.name);
      if (sortKey === "date")     cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortKey === "progress") cmp = a.progress - b.progress;
      return sortAsc ? cmp : -cmp;
    });

  const totalClients       = clients.length;
  const completedCount     = clients.filter(c => c.client_state === "completed").length;
  const inProgressCount    = clients.filter(c => c.client_state === "in_progress").length;
  const needsFollowupCount = clients.filter(c => c.client_state === "needs_followup").length;
  const avgCompletion      = totalClients > 0
    ? Math.round(clients.reduce((s, c) => s + c.progress, 0) / totalClients)
    : 0;

  const userName = user.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">

      {/* ── HEADER ── */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 px-4 sm:px-6">
        <div className="max-w-[1000px] mx-auto h-[60px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-[9px] flex items-center justify-center text-[15px] text-primary-foreground shadow-[0_2px_8px_hsl(var(--accent-glow))]">⚡</div>
            <span className="font-display text-xl text-foreground tracking-tight">Onboardly</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground">{user.user_metadata?.full_name || user.email}</span>
            </div>
            <button onClick={signOut}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-2 border border-transparent hover:border-border">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-10">

        {/* ── WELCOME BAR ── */}
        {clients.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-[26px] sm:text-[30px] text-foreground leading-tight">
                Hey, {userName} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {needsFollowupCount > 0
                  ? `${needsFollowupCount} client${needsFollowupCount > 1 ? "s need" : " needs"} a follow-up`
                  : inProgressCount > 0
                    ? `${inProgressCount} client${inProgressCount > 1 ? "s are" : " is"} filling their form`
                    : "All caught up — looking good!"}
              </p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all hover:-translate-y-0.5 shadow-[0_4px_16px_hsl(var(--accent-glow))]">
              <span className="text-base leading-none">+</span> New Client
            </button>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        {clients.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              {
                icon:  <Users size={15} className="text-primary"/>,
                label: "Total",
                value: totalClients,
                bg:    "bg-primary/5 border-primary/15",
                sub:   null,
              },
              {
                icon:  <TrendingUp size={15} className="text-amber-400"/>,
                label: "Avg. Progress",
                value: `${avgCompletion}%`,
                bg:    "bg-amber-500/5 border-amber-500/15",
                sub:   null,
              },
              {
                icon:  <Clock size={15} className="text-blue-400"/>,
                label: "In Progress",
                value: inProgressCount,
                bg:    "bg-blue-500/5 border-blue-500/15",
                sub:   null,
              },
              {
                icon:  <CheckCircle size={15} className="text-emerald-400"/>,
                label: "Completed",
                value: completedCount,
                bg:    "bg-emerald-500/5 border-emerald-500/15",
                sub:   needsFollowupCount > 0 ? `${needsFollowupCount} need follow-up` : null,
              },
            ].map(s => (
              <div key={s.label} className={`border rounded-2xl p-4 sm:p-5 ${s.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <div className="w-7 h-7 rounded-lg bg-background/40 flex items-center justify-center">{s.icon}</div>
                </div>
                <p className="font-display text-[28px] sm:text-[32px] text-foreground leading-none">{s.value}</p>
                {s.sub && <p className="text-[10px] text-red-400 mt-1.5 font-medium">{s.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── TOOLBAR ── */}
        {clients.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-display text-xl text-foreground">Your Clients</h2>
              <button onClick={() => setShowCreate(true)}
                className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all">
                + New Client
              </button>
            </div>

            {/* Search + Sort */}
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
              <div className="hidden sm:flex items-center gap-1.5">
                {(["name","date","progress"] as SortKey[]).map(key => (
                  <button key={key} onClick={() => handleSort(key)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 ${
                      sortKey === key
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                    }`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {sortKey === key && <ChevronDown size={10} className={`transition-transform ${sortAsc ? "rotate-180" : ""}`}/>}
                  </button>
                ))}
              </div>
              <div className="relative sm:hidden">
                <button onClick={() => setShowSortMenu(p => !p)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-medium border border-border bg-surface text-muted-foreground">
                  Sort <ChevronDown size={11}/>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-20 overflow-hidden min-w-[130px]">
                    {(["name","date","progress"] as SortKey[]).map(key => (
                      <button key={key} onClick={() => handleSort(key)}
                        className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${sortKey === key ? "text-primary bg-primary/5" : "text-foreground hover:bg-surface-2"}`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}{sortKey === key && (sortAsc ? " ↑" : " ↓")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
              {([
                { key: "all",            label: "All" },
                { key: "not_started",    label: "Not Started" },
                { key: "in_progress",    label: "In Progress" },
                { key: "needs_followup", label: "Follow-up" },
                { key: "completed",      label: "Completed" },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${
                    statusFilter === f.key
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_hsl(var(--accent-glow))]"
                      : "border-border text-muted-foreground hover:text-foreground bg-surface hover:border-muted-foreground/30"
                  }`}>
                  {f.label}
                  {f.key !== "all" && (
                    <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      statusFilter === f.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"
                    }`}>
                      {clients.filter(c => c.client_state === f.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── CLIENT LIST ── */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted-foreground/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-muted-foreground/10 rounded w-1/3" />
                    <div className="h-3 bg-muted-foreground/10 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : clients.length === 0 ? (
          <GuidedEmptyState onStart={() => setShowCreate(true)} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-muted-foreground">No clients match your search.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((client, i) => {
              const [color1, color2] = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={client.id}
                  className="group bg-surface border border-border rounded-2xl px-4 py-4 hover:border-primary/30 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedClient(client)}>

                  <div className="flex items-center gap-3.5">
                    {/* Avatar with gradient */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
                      {INITIALS(client.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                          {client.name}
                        </span>
                        <StateBadge state={client.client_state} />
                      </div>

                      {/* Status description */}
                      <p className="text-[11.5px] text-muted-foreground mb-1">{dynamicStatusLabel(client.client_state, client.link_opened_at, client.progress)}</p>

                      {/* Next action + time */}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                          <ArrowRight size={9}/> {nextAction(client.client_state)}
                        </span>
                        {client.updated_at && (
                          <span className="text-[10px] text-muted-foreground/50">
                            · {formatRelativeTime(client.updated_at)}
                          </span>
                        )}
                      </div>

                      {/* Progress bar — mobile */}
                      <div className="flex items-center gap-2 mt-2.5 sm:hidden">
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${
                            client.client_state === "completed" ? "bg-emerald-400"
                            : client.client_state === "needs_followup" ? "bg-red-400"
                            : "bg-primary"
                          }`} style={{ width: `${client.progress}%` }}/>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{client.progress}%</span>
                      </div>
                    </div>

                    {/* Right: progress bar (desktop) + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Progress bar desktop */}
                      <div className="w-[130px] hidden sm:block">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground/60">Progress</span>
                          <span className="text-[11px] font-semibold text-foreground">{client.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${
                            client.client_state === "completed" ? "bg-emerald-400"
                            : client.client_state === "needs_followup" ? "bg-red-400"
                            : "bg-primary"
                          }`} style={{ width: `${client.progress}%` }}/>
                        </div>
                      </div>

                      {/* Delete */}
                      <div onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDeleteTarget(client)}
                          className="p-2 rounded-lg border border-transparent text-muted-foreground/40 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FOOTER TIP ── */}
        {clients.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40">
            <Sparkles size={11}/>
            <span>Click any client to view their onboarding details and activity timeline</span>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateClientDialog userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchClients(); }}/>
      )}

      {selectedClient && (
        <ClientDetailDialog client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdated={() => { fetchClients(); setSelectedClient(null); }}/>
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
    </div>
  );
}
