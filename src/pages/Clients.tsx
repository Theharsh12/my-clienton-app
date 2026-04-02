import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search, Clock, CheckCircle, Users, ChevronDown, Trash2,
  ArrowRight, Copy, ExternalLink, Bell, Plus, Eye,
} from "lucide-react";
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
const INITIALS = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

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
    not_started:    { label: "Link Not Opened",     cls: "bg-zinc-800/60 text-zinc-400 border-zinc-700/60",          dot: "bg-zinc-500" },
    in_progress:    { label: "Filling Form",        cls: "bg-amber-500/10 text-amber-400 border-amber-500/25",       dot: "bg-amber-400 animate-pulse" },
    needs_followup: { label: "Needs Follow-up",     cls: "bg-red-500/10 text-red-400 border-red-500/25",             dot: "bg-red-400" },
    completed:      { label: "Ready to Start",      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-semibold border whitespace-nowrap ${config.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ── Getting Started Checklist ──────────────────────────────────────────────────
function GettingStarted({ clients, onCreateClient }: { clients: ClientRow[]; onCreateClient: () => void }) {
  const hasClient    = clients.length > 0;
  const hasSentLink  = clients.some(c => c.link_opened_at);
  const hasResponse  = clients.some(c => c.progress > 0 || c.client_state === "completed");
  const steps = [
    { label: "Create your first client",     done: hasClient,   action: onCreateClient,  cta: "Create Client" },
    { label: "Send the onboarding link",     done: hasSentLink, action: null,             cta: "Copy from client card below" },
    { label: "Receive their first response", done: hasResponse, action: null,             cta: "Waiting..." },
  ];
  const completedCount = steps.filter(s => s.done).length;
  if (completedCount === 3) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Get started with Onboardly</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">{completedCount}/3 steps completed</p>
        </div>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={i} className={`w-8 h-1.5 rounded-full transition-all ${s.done ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            s.done
              ? "border-primary/15 bg-primary/[0.03] opacity-60"
              : i === completedCount
                ? "border-primary/30 bg-primary/[0.05]"
                : "border-border bg-surface/50 opacity-40"
          }`}>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-all ${
              s.done ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"
            }`}>
              {s.done ? "✓" : i + 1}
            </div>
            <span className={`flex-1 text-[13px] font-medium ${s.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {s.label}
            </span>
            {!s.done && i === completedCount && s.action && (
              <button onClick={s.action}
                className="text-[11px] font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-lg hover:brightness-110 transition-all shrink-0">
                {s.cta}
              </button>
            )}
            {!s.done && i === completedCount && !s.action && (
              <span className="text-[11px] text-muted-foreground">{s.cta}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Demo Client Card ───────────────────────────────────────────────────────────
function DemoClientCard() {
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

// ── Activity Feed ──────────────────────────────────────────────────────────────
function ActivityFeed({ clients }: { clients: ClientRow[] }) {
  const activities = clients
    .flatMap(c => {
      const items = [];
      if (c.client_state === "completed") {
        items.push({ time: c.updated_at, text: `${c.name} completed their onboarding`, icon: "✅", color: "text-emerald-400" });
      } else if (c.client_state === "in_progress") {
        items.push({ time: c.updated_at, text: `${c.name} started filling the form`, icon: "✏️", color: "text-amber-400" });
      } else if (c.link_opened_at) {
        items.push({ time: c.link_opened_at, text: `${c.name} opened the onboarding link`, icon: "👀", color: "text-blue-400" });
      } else {
        items.push({ time: c.created_at, text: `Client ${c.name} created`, icon: "➕", color: "text-primary" });
      }
      return items;
    })
    .filter(a => a.time)
    .sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
    .slice(0, 5);

  if (activities.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
      <h3 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Recent Activity
      </h3>
      <div className="space-y-2.5">
        {activities.map((a, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="text-[13px]">{a.icon}</span>
            <span className="text-[12px] text-muted-foreground flex-1">{a.text}</span>
            <span className="text-[10px] text-muted-foreground/40 shrink-0">{formatRelativeTime(a.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
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
  const [copiedId,       setCopiedId]       = useState<string | null>(null);

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

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "onboarding_responses" }, () => fetchClients())
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => fetchClients())
      .subscribe();
    const poll = setInterval(() => fetchClients(), 15000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [user, fetchClients]);

  if (authLoading) return <div className="flex items-center justify-center h-screen text-muted-foreground text-sm">Loading...</div>;
  if (!user)       return <Navigate to="/auth" replace />;

  const copyLink = (token: string, clientId: string) => {
    const url = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(clientId);
      toast.success("Link copied! Now send it to your client 🔗");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const sendWhatsApp = (token: string, name: string) => {
    const url   = `${window.location.origin}/onboarding/${token}`;
    const text  = encodeURIComponent(`Hi! Please fill out your onboarding form here: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

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
            <img src="/favicon.svg" className="w-8 h-8" alt="Onboardly" />
            <span className="font-display text-xl text-foreground tracking-tight">Onboardly</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground">
                Welcome, {user.user_metadata?.full_name?.split(" ")[0] || user.email} 👋
              </span>
            </div>
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
          <button onClick={() => setShowCreate(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all hover:-translate-y-0.5 shadow-[0_4px_16px_hsl(var(--accent-glow))] shrink-0">
            <Plus size={14} /> Create Client Intake
          </button>
        </div>

        {/* ── GETTING STARTED ── */}
        <GettingStarted clients={clients} onCreateClient={() => setShowCreate(true)} />

        {/* ── STAT CARDS ── */}
        {clients.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { icon: <Users size={15} className="text-primary"/>,             label: "Total",       value: totalClients,    bg: "bg-primary/5 border-primary/15" },
              { icon: <ArrowRight size={15} className="text-amber-400"/>,      label: "Avg Progress",value: `${avgCompletion}%`, bg: "bg-amber-500/5 border-amber-500/15" },
              { icon: <Clock size={15} className="text-blue-400"/>,            label: "In Progress", value: inProgressCount, bg: "bg-blue-500/5 border-blue-500/15" },
              { icon: <CheckCircle size={15} className="text-emerald-400"/>,   label: "Completed",   value: completedCount,  bg: "bg-emerald-500/5 border-emerald-500/15" },
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
              <button onClick={() => setShowCreate(true)}
                className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold bg-primary text-primary-foreground">
                <Plus size={12}/> New
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
              <div className="flex items-center gap-1.5">
                {(["name","date","progress"] as SortKey[]).map(key => (
                  <button key={key} onClick={() => handleSort(key)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-medium border transition-all hidden sm:flex items-center gap-1 ${
                      sortKey === key
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground"
                    }`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {sortKey === key && <ChevronDown size={10} className={`transition-transform ${sortAsc ? "rotate-180" : ""}`}/>}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
              {([
                { key: "all",            label: "All" },
                { key: "not_started",    label: "Not Opened" },
                { key: "in_progress",    label: "Filling Form" },
                { key: "needs_followup", label: "Follow-up" },
                { key: "completed",      label: "Ready" },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap flex-shrink-0 ${
                    statusFilter === f.key
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_hsl(var(--accent-glow))]"
                      : "border-border text-muted-foreground hover:text-foreground bg-surface"
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

        {/* ── CLIENT CARDS ── */}
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
          // Empty state
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl mx-auto mb-5">📋</div>
            <h3 className="font-display text-2xl text-foreground mb-2">No clients onboarded yet.</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-[340px] mx-auto leading-relaxed">
              Create your first client and send them an onboarding link. They'll fill everything you need in minutes.
            </p>
            <button onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-xl text-[14px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all hover:-translate-y-0.5 shadow-[0_4px_20px_hsl(var(--accent-glow))] mb-6">
              Create your first onboarding flow →
            </button>
            <p className="text-[11px] text-muted-foreground/50 mb-8">Takes 2 minutes · Free forever for 2 clients</p>
            {/* Demo client */}
            <div className="max-w-[560px] mx-auto text-left">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">See how it works</p>
              <DemoClientCard />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-muted-foreground">No clients match your search.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((client, i) => {
              const [color1, color2] = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const isCopied = copiedId === client.id;
              return (
                <div key={client.id}
                  className="group bg-surface border border-border rounded-2xl transition-all duration-200 overflow-hidden hover:border-primary/25 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)]">

                  {/* Main row — clickable */}
                  <div className="flex items-center gap-3.5 px-4 py-4 cursor-pointer"
                    onClick={() => setSelectedClient(client)}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
                      {INITIALS(client.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors">
                          {client.name}
                        </span>
                        <StateBadge state={client.client_state} />
                      </div>
                      <p className="text-[11.5px] text-muted-foreground">
                        {client.email || "No email"} · Added {formatRelativeTime(client.created_at)}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="w-[120px] hidden sm:block shrink-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground/60">
                          {client.client_state === "not_started" ? "Not opened" :
                           client.client_state === "completed" ? "Complete" :
                           client.client_state === "needs_followup" ? "Stalled" : "In progress"}
                        </span>
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
                        className="p-2 rounded-lg border border-transparent text-muted-foreground/30 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-all opacity-0 group-hover:opacity-100 ml-1">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>

                  {/* Action bar — always visible for not_started and needs_followup */}
                  {(client.client_state === "not_started" || client.client_state === "needs_followup") && (
                    <div className={`flex items-center gap-2 px-4 py-2.5 border-t ${
                      client.client_state === "needs_followup"
                        ? "border-red-500/15 bg-red-500/[0.03]"
                        : "border-border bg-surface-2/50"
                    }`}>
                      <span className="text-[11px] text-muted-foreground mr-auto">
                        {client.client_state === "needs_followup"
                          ? "⚠️ No activity in 48h — send a reminder"
                          : "Client hasn't opened the link yet"}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); copyLink(client.token, client.id); }}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          isCopied
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                        }`}>
                        <Copy size={11}/>
                        {isCopied ? "Copied!" : "Copy Link"}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); sendWhatsApp(client.token, client.name); }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all">
                        <ExternalLink size={11}/>
                        WhatsApp
                      </button>
                      {client.client_state === "needs_followup" && (
                        <button
                          onClick={e => { e.stopPropagation(); copyLink(client.token, client.id); toast.info("Copy the link and send it as a reminder!"); }}
                          className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-400/5 transition-all">
                          <Bell size={11}/>
                          Remind
                        </button>
                      )}
                    </div>
                  )}

                  {/* Completed action bar */}
                  {client.client_state === "completed" && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-emerald-500/15 bg-emerald-500/[0.02]">
                      <span className="text-[11px] text-emerald-400 mr-auto">✅ Brief complete — ready to start the project</span>
                      <button onClick={e => { e.stopPropagation(); setSelectedClient(client); }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-all">
                        <Eye size={11}/> View Brief
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {clients.length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground/30 mt-8">
            Click any client to view their full onboarding details
          </p>
        )}
      </div>

      {/* ── DIALOGS ── */}
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