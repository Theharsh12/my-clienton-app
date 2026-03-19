import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate , Link , useNavigate} from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUpDown, FileDown, Archive, Copy, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import CreateClientDialog from "@/components/CreateClientDialog";
import EditTemplateDialog from "@/components/EditTemplateDialog";
import ClientDetailDialog from "@/components/ClientDetailDialog";
import { downloadCsv } from "@/lib/exportCsv";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  token: string;
  template_id: string | null;
  status: string;
  created_at: string;
  templateName?: string;
  totalItems: number;
  completedItems: number;
}

interface Template {
  id: string;
  name: string;
  itemCount: number;
  usedByClients: number;
}

const AVATAR_COLORS = ["#7C6EF2", "#F59E0B", "#34D399", "#60A5FA", "#F472B6", "#EF4444", "#8B5CF6"];
const INITIALS = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const PLAN_LIMITS: Record<string, { clients: number; templates: number }> = {
  free: { clients: 2, templates: 1 },
  pro: { clients: Infinity, templates: Infinity },
  lifetime: { clients: Infinity, templates: Infinity },
};

type SortKey = "name" | "created_at" | "completion";
type StatusFilter = "all" | "in_progress" | "completed" | "archived";

export default function Clients() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [plan, setPlan] = useState("free");
  const [templateCount, setTemplateCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Phase 2: Search, filter, sort
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Phase 1: Template editing
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [editItemsTemplate, setEditItemsTemplate] = useState<{ id: string; name: string } | null>(null);

  const fetchClients = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 = row not found; fall back to free
        throw profileError;
      }

      if (profile) setPlan(profile.plan || "free");

      const { data: templatesData, error: templatesError } = await supabase
        .from("checklist_templates")
        .select("id, name")
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;

      setTemplateCount(templatesData?.length || 0);

      const { data: itemsData } = templatesData && templatesData.length > 0
        ? await supabase.from("checklist_items").select("template_id")
        : { data: [] };

      const { data: clientsAllData, error: clientsAllError } = await supabase
        .from("clients")
        .select("template_id");

      if (clientsAllError) throw clientsAllError;

      const itemCountMap = new Map<string, number>();
      (itemsData || []).forEach(i =>
        itemCountMap.set(i.template_id, (itemCountMap.get(i.template_id) || 0) + 1)
      );

      const usageMap = new Map<string, number>();
      (clientsAllData || []).forEach(c => {
        if (c.template_id) usageMap.set(c.template_id, (usageMap.get(c.template_id) || 0) + 1);
      });

      setTemplates((templatesData || []).map(t => ({
        id: t.id,
        name: t.name,
        itemCount: itemCountMap.get(t.id) || 0,
        usedByClients: usageMap.get(t.id) || 0,
      })));

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      if (!clientsData || clientsData.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const templateIds = [...new Set(clientsData.filter(c => c.template_id).map(c => c.template_id!))];
      const { data: templatesForClients } = templateIds.length > 0
        ? await supabase.from("checklist_templates").select("id, name").in("id", templateIds)
        : { data: [] };

      const { data: items } = templateIds.length > 0
        ? await supabase.from("checklist_items").select("id, template_id").in("template_id", templateIds)
        : { data: [] };

      const clientIds = clientsData.map(c => c.id);
      const { data: responses } = await supabase
        .from("client_responses")
        .select("client_id, completed")
        .in("client_id", clientIds);

      const templateMap = new Map((templatesForClients || []).map(t => [t.id, t.name]));
      const itemCountMapClients = new Map<string, number>();
      (items || []).forEach(i => itemCountMapClients.set(i.template_id, (itemCountMapClients.get(i.template_id) || 0) + 1));
      const completedMap = new Map<string, number>();
      (responses || []).filter(r => r.completed).forEach(r => completedMap.set(r.client_id, (completedMap.get(r.client_id) || 0) + 1));

      setClients(clientsData.map(c => ({
        ...c,
        status: c.status || "in_progress",
        templateName: c.template_id ? templateMap.get(c.template_id) || "Unknown" : undefined,
        totalItems: c.template_id ? itemCountMapClients.get(c.template_id) || 0 : 0,
        completedItems: completedMap.get(c.id) || 0,
      })));
      setLoading(false);
    } catch (err) {
      console.error("Failed to load clients", err);
      toast.error("Failed to load clients. Please refresh.");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  if (authLoading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const canCreateClient = clients.length < limits.clients;
  const canCreateTemplate = templateCount < limits.templates;

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/onboarding/${token}`;

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error("Clipboard access is not available. Please copy the link manually.");
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(token);
        toast.success("Link copied! Send it to your client to get started.");
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {
        toast.error("Could not copy link. Please copy it manually.");
      });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("client_responses").delete().eq("client_id", deleteTarget.id);
    const { error } = await supabase.from("clients").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete client");
    } else {
      toast.success("Client deleted");
      setClients(prev => prev.filter(c => c.id !== deleteTarget.id));
      if (selectedClient?.id === deleteTarget.id) setSelectedClient(null);
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    setDeleting(true);
    const templateId = deleteTemplate.id;

    // Unlink clients using this template
    await supabase.from("clients").update({ template_id: null }).eq("template_id", templateId);
    // Delete checklist items first
    await supabase.from("checklist_items").delete().eq("template_id", templateId);
    // Delete the template
    const { error } = await supabase.from("checklist_templates").delete().eq("id", templateId);
    setDeleting(false);
    setDeleteTemplate(null);
    if (error) {
      toast.error("Failed to delete template");
    } else {
      toast.success("Template deleted");
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      fetchClients();
    }
  };

  const handleCreateClick = () => {
    if (!canCreateClient) {
      toast.error(`Free plan allows ${limits.clients} clients. Upgrade to Pro for unlimited.`);
      return;
    }
    setShowCreate(true);
  };

  // Phase 1: Duplicate template
  const handleDuplicateTemplate = async (template: Template) => {
    setDuplicating(template.id);
    try {
      // Create template copy
      const { data: newTmpl, error: tmplErr } = await supabase
        .from("checklist_templates")
        .insert({ user_id: user.id, name: `${template.name} (Copy)` })
        .select("id")
        .single();

      if (tmplErr || !newTmpl) {
        toast.error("Failed to duplicate template");
        return;
      }

      // Copy items
      const { data: existingItems } = await supabase
        .from("checklist_items")
        .select("label, type, position, required")
        .eq("template_id", template.id)
        .order("position");

      if (existingItems && existingItems.length > 0) {
        await supabase.from("checklist_items").insert(
          existingItems.map(item => ({
            template_id: newTmpl.id,
            label: item.label,
            type: item.type,
            position: item.position,
            required: item.required,
          }))
        );
      }

      toast.success("Template duplicated!");
      fetchClients();
    } catch {
      toast.error("Failed to duplicate template");
    } finally {
      setDuplicating(null);
    }
  };

  // Phase 1: Rename template
  const handleRenameTemplate = async (templateId: string) => {
    if (!editingTemplateName.trim()) {
      toast.error("Template name cannot be empty");
      return;
    }
    const { error } = await supabase
      .from("checklist_templates")
      .update({ name: editingTemplateName.trim() })
      .eq("id", templateId);

    if (error) {
      toast.error("Failed to rename template");
    } else {
      toast.success("Template renamed");
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, name: editingTemplateName.trim() } : t));
    }
    setEditingTemplateId(null);
  };

  // Phase 2: Archive client
  const handleArchive = async (client: ClientRow, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = client.status === "archived" ? "in_progress" : "archived";
    const { error } = await supabase.from("clients").update({ status: newStatus }).eq("id", client.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(newStatus === "archived" ? "Client archived" : "Client restored");
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: newStatus } : c));
    }
  };

  // Phase 3: Export all clients CSV
  const handleExportAllCsv = () => {
    if (filteredClients.length === 0) {
      toast.error("No clients to export");
      return;
    }
    const headers = ["Name", "Email", "Status", "Template", "Items Completed", "Total Items", "Completion %", "Created"];
    const rows = filteredClients.map(c => {
      const pct = c.totalItems > 0 ? Math.round((c.completedItems / c.totalItems) * 100) : 0;
      return [c.name, c.email || "", c.status, c.templateName || "", String(c.completedItems), String(c.totalItems), `${pct}%`, new Date(c.created_at).toLocaleDateString()];
    });
    downloadCsv("all_clients_export.csv", headers, rows);
    toast.success("CSV exported!");
  };

  // Filtering & sorting
  const filteredClients = clients
    .filter(c => {
      if (statusFilter === "all") return c.status !== "archived";
      if (statusFilter === "archived") return c.status === "archived";
      if (statusFilter === "completed") return c.totalItems > 0 && c.completedItems >= c.totalItems;
      return c.status === "in_progress" && !(c.totalItems > 0 && c.completedItems >= c.totalItems);
    })
    .filter(c => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else {
        const pA = a.totalItems > 0 ? a.completedItems / a.totalItems : 0;
        const pB = b.totalItems > 0 ? b.completedItems / b.totalItems : 0;
        cmp = pA - pB;
      }
      return sortAsc ? cmp : -cmp;
    });

  const totalClients = clients.filter(c => c.status !== "archived").length;
  const avgCompletion = totalClients > 0
    ? Math.round(clients.filter(c => c.status !== "archived").reduce((a, c) => a + (c.totalItems > 0 ? (c.completedItems / c.totalItems) * 100 : 0), 0) / totalClients)
    : 0;
  const doneCount = clients.filter(c => c.status !== "archived" && c.totalItems > 0 && c.completedItems >= c.totalItems).length;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "archived", label: "Archived" },
  ];


  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="bg-surface border-b border-border sticky top-0 z-50 px-4 sm:px-6">
        <div className="max-w-[960px] mx-auto h-[60px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-[9px] flex items-center justify-center text-[15px] text-primary-foreground shadow-[0_4px_12px_hsl(var(--accent-glow))]">⚡</div>
            <span className="font-display text-xl text-foreground">Onboardly</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap justify-end text-xs">
    <div className="hidden sm:flex items-center gap-2">
    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
      {(user.user_metadata?.full_name || user.email)?.[0].toUpperCase()}
    </div>
    <span className="text-xs text-muted-foreground">
  Welcome, {user.user_metadata?.full_name || user.email} 👋
</span>
  </div>
  <span className="text-xs text-muted-foreground font-medium">Clients</span>
  {plan === "free" && (
    <button
      onClick={() => {
        navigate("/");
        setTimeout(() => {
          document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
        }, 500);
      }}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
    >
      Pricing
    </button>
  )}
  <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-body">
    Sign out
  </button>
          </div>
        </div>
      </header>

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8">
         {/* PLAN BADGE */}
        <div
          className={
            plan === "free"
              ? "bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              : "bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          }
        >
           <div className="text-sm text-foreground">
             {plan === "free" ? (
               <>
                 <strong>Free Plan</strong> — {clients.length}/{limits.clients} clients · {templateCount}/{limits.templates} template
               </>
             ) : (
               <>
                 <strong>{plan === "pro" ? "Pro Plan" : "Lifetime Plan"}</strong> — Unlimited clients & templates
               </>
             )}
           </div>
           
 {plan === "free" && (
  <button
    onClick={() => {
      navigate("/");
      setTimeout(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    }}
    className="text-xs font-semibold text-primary hover:underline"
  >
    Upgrade →
  </button>
)}
         </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
          {[
            { label: "Total Clients", value: totalClients, icon: "👥" },
            { label: "Avg. Completion", value: `${avgCompletion}%`, icon: "◷" },
            { label: "Completed", value: doneCount, icon: "✓" },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{s.icon}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="font-display text-[32px] text-foreground leading-none">{s.value}</div>
            </div>
          ))}
        </div>

        {/* HEADER ROW */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h1 className="font-display text-[26px] text-foreground">Your Clients</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAllCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium bg-surface-2 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all"
              title="Export all clients as CSV"
              aria-label="Export all clients as CSV"
            >
              <FileDown size={14} />
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-surface-2 border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all"
            >
              📋 Templates ({templates.length})
            </button>
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-primary border border-primary text-primary-foreground shadow-[0_2px_12px_hsl(var(--accent-glow))] transition-all hover:brightness-110 hover:-translate-y-0.5"
            >
              + New Client
            </button>
          </div>
        </div>

        {/* TEMPLATES SECTION */}
        <AnimatePresence>
          {showTemplates && templates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-surface border border-border rounded-xl p-5 mb-6 overflow-hidden"
            >
              <h2 className="font-display text-[16px] font-semibold text-foreground mb-4">Templates</h2>
              <div className="space-y-2">
                {templates.map(template => (
                  <div key={template.id} className="flex items-center justify-between bg-surface-2 rounded-lg p-3.5 border border-border">
                    <div className="flex-1 min-w-0">
                      {editingTemplateId === template.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 py-1 px-2.5 bg-surface border border-border rounded-lg text-[13px] text-foreground font-body outline-none focus:border-primary transition-colors"
                            value={editingTemplateName}
                            onChange={e => setEditingTemplateName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleRenameTemplate(template.id)}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameTemplate(template.id)}
                            className="px-2 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTemplateId(null)}
                            className="px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-[13px] font-medium text-foreground">{template.name}</div>
                          <div className="text-[12px] text-muted-foreground">{template.itemCount} items · Used by {template.usedByClients} client{template.usedByClients !== 1 ? 's' : ''}</div>
                        </>
                      )}
                    </div>
                    {editingTemplateId !== template.id && (
                      <div className="flex items-center gap-1.5 ml-3">
                        <button
                          onClick={() => setEditItemsTemplate({ id: template.id, name: template.name })}
                          className="px-2 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all"
                          title="Edit template"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDuplicateTemplate(template)}
                          disabled={duplicating === template.id}
                          className="px-2 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all disabled:opacity-50"
                          title="Duplicate"
                          aria-label={`Duplicate template ${template.name}`}
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteTemplate(template)}
                          className="px-2 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                          aria-label={`Delete template ${template.name}`}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full py-2.5 pl-9 pr-3.5 bg-surface border border-border rounded-lg text-foreground text-[13px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                placeholder="Search clients by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              {(["name", "created_at", "completion"] as SortKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => toggleSort(key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-medium border transition-all ${
                    sortKey === key
                      ? "border-primary/30 text-primary bg-primary/5"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  {key === "name" ? "Name" : key === "created_at" ? "Date" : "Progress"}
                  {sortKey === key && (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                  statusFilter === f.key
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                {f.key === "archived" && clients.filter(c => c.status === "archived").length > 0 && (
                  <span className="ml-1 text-[10px]">({clients.filter(c => c.status === "archived").length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CLIENT LIST */}
        {loading ? (
          <div className="text-center text-muted-foreground py-16 text-sm">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-[48px] mb-4">📋</div>
            <h3 className="font-display text-2xl text-foreground mb-2">No clients yet</h3>
            <p className="text-sm text-muted-foreground max-w-[360px] mx-auto mb-6">
              Create your first client and send them a magic link to start onboarding.
            </p>
            <button
              onClick={handleCreateClick}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
            >
              + Create First Client
            </button>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[32px] mb-3">🔍</div>
            <p className="text-sm text-muted-foreground">No clients match your filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client, i) => {
              const pct = client.totalItems > 0 ? Math.round((client.completedItems / client.totalItems) * 100) : 0;
              const isDone = client.totalItems > 0 && client.completedItems >= client.totalItems;
              const isArchived = client.status === "archived";
              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`bg-surface border border-border rounded-[14px] p-5 hover:border-muted-foreground/20 transition-all cursor-pointer ${isArchived ? "opacity-60" : ""}`}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0"
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {INITIALS(client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[15px] font-semibold text-foreground">{client.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isArchived ? "bg-muted text-muted-foreground border border-border"
                          : isDone ? "bg-success/10 text-success border border-success/20"
                          : "bg-warning/10 text-warning border border-warning/20"
                        }`}>
                          {isArchived ? "Archived" : isDone ? "Completed" : "In Progress"}
                        </span>
                        {client.templateName && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 border border-border text-muted-foreground">
                            {client.templateName}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        {client.email || "No email"} · {client.completedItems}/{client.totalItems} items · Created {new Date(client.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 justify-end">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 h-[5px] bg-surface-3 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); copyLink(client.token); }}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                          copied === client.token
                            ? "bg-success/10 border-success/30 text-success"
                            : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                        }`}
                        aria-label={`Copy onboarding link for ${client.name}`}
                      >
                        {copied === client.token ? "✓ Copied" : "Copy Link"}
                      </button>
                      <button
                        onClick={e => handleArchive(client, e)}
                        className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border transition-all ${
                          isArchived ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                        }`}
                        title={isArchived ? "Restore" : "Archive"}
                        aria-label={isArchived ? `Restore client ${client.name}` : `Archive client ${client.name}`}
                      >
                        <Archive size={12} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(client); }}
                        className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"
                        aria-label={`Delete client ${client.name}`}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* DIALOGS */}
      <AnimatePresence>
        {showCreate && (
          <CreateClientDialog
            userId={user.id}
            canCreateTemplate={canCreateTemplate}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); fetchClients(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedClient && (
          <ClientDetailDialog
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdated={fetchClients}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client and all their responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete template confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={open => !open && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTemplate?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template and unlink it from any clients. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteTemplate(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit template items dialog */}
      <AnimatePresence>
        {editItemsTemplate && (
          <EditTemplateDialog
            templateId={editItemsTemplate.id}
            templateName={editItemsTemplate.name}
            onClose={() => setEditItemsTemplate(null)}
            onSaved={() => {
              setEditItemsTemplate(null);
              fetchClients();
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
