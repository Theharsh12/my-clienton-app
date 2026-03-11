import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, Loader2, FileDown } from "lucide-react";
import { downloadCsv } from "@/lib/exportCsv";

interface ClientRow {
  id: string;
  name: string;
  email: string | null;
  token: string;
  template_id: string | null;
  totalItems: number;
  completedItems: number;
}

interface ItemWithResponse {
  id: string;
  label: string;
  type: string;
  position: number;
  response?: {
    value: string | null;
    file_url: string | null;
    completed: boolean;
  };
}

interface Props {
  client: ClientRow;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function ClientDetailDialog({ client, onClose, onUpdated }: Props) {
  const [items, setItems] = useState<ItemWithResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(client.name);
  const [editEmail, setEditEmail] = useState(client.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (fileUrl: string, fileName: string, itemId: string) => {
    setDownloading(itemId);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("File downloaded");
    } catch {
      toast.error("Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [client.id]);

  const loadDetails = async () => {
    if (!client.template_id) { setLoading(false); return; }

    const [{ data: itemsData }, { data: responsesData }] = await Promise.all([
      supabase.from("checklist_items").select("*").eq("template_id", client.template_id).order("position"),
      supabase.from("client_responses").select("item_id, value, file_url, completed").eq("client_id", client.id),
    ]);

    const responseMap = new Map((responsesData || []).map(r => [r.item_id, r]));

    setItems((itemsData || []).map(item => ({
      ...item,
      response: responseMap.get(item.id) || undefined,
    })));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Client name is required");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({ name: editName.trim(), email: editEmail.trim() || null })
      .eq("id", client.id);

    if (error) {
      toast.error("Failed to update client");
    } else {
      toast.success("Client updated");
      setIsEditing(false);
      onUpdated?.();
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditName(client.name);
    setEditEmail(client.email || "");
    setIsEditing(false);
  };

  const handleExportCsv = () => {
    if (items.length === 0) {
      toast.error("No items to export");
      return;
    }
    const headers = ["Item", "Type", "Response", "File URL", "Completed"];
    const rows = items.map(item => [
      item.label,
      item.type,
      item.response?.value || "",
      item.response?.file_url || "",
      item.response?.completed ? "Yes" : "No",
    ]);
    downloadCsv(`${client.name.replace(/\s+/g, "_")}_responses.csv`, headers, rows);
    toast.success("CSV exported!");
  };

  const pct = client.totalItems > 0 ? Math.round((client.completedItems / client.totalItems) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-surface border border-border rounded-2xl p-7 w-[560px] max-w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="flex-1 font-display text-[22px] font-normal bg-surface-2 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Client name"
              autoFocus
            />
          ) : (
            <h3 className="font-display text-[22px] font-normal">{editName}</h3>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg ml-3 shrink-0">✕</button>
        </div>
        
        {isEditing ? (
          <div className="mb-4 space-y-3">
            <input
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              className="w-full text-[13px] bg-surface-2 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Email (optional)"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-border text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">
              {editEmail || "No email"} · {pct}% complete
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all"
                title="Export responses as CSV"
              >
                <FileDown size={12} />
                CSV
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-all"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-semibold text-foreground">{pct}%</span>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground text-sm py-8">Loading responses...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">No checklist items.</div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div
                key={item.id}
                className={`border rounded-xl p-4 ${
                  item.response?.completed ? "border-primary/20 bg-primary/[0.03]" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] shrink-0 ${
                    item.response?.completed ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  }`}>
                    {item.response?.completed && "✓"}
                  </div>
                  <span className="text-[13.5px] font-medium text-foreground">{item.label}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">{item.type}</span>
                </div>

                {item.response ? (
                  <div className="ml-[30px]">
                    {item.type === "file" && item.response.file_url ? (
                      <div className="space-y-2">
                        {/* Image preview */}
                        {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.response.value || item.response.file_url) && (
                          <a href={item.response.file_url} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={item.response.file_url}
                              alt={item.response.value || "Uploaded file"}
                              className="max-h-[140px] rounded-lg border border-border object-contain bg-surface-2"
                            />
                          </a>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-muted-foreground truncate max-w-[280px]">
                            📎 {item.response.value || "Uploaded file"}
                          </span>
                          <button
                            onClick={() => handleDownload(item.response!.file_url!, item.response!.value || "download", item.id)}
                            disabled={downloading === item.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-border text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                          >
                            {downloading === item.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Download size={12} />
                            )}
                            {downloading === item.id ? "Downloading..." : "Download"}
                          </button>
                        </div>
                      </div>
                    ) : item.type === "checkbox" ? (
                      <span className="text-[13px] text-muted-foreground">
                        {item.response.completed ? "✓ Checked" : "Not checked"}
                      </span>
                    ) : item.response.value ? (
                      <p className="text-[13px] text-muted-foreground">{item.response.value}</p>
                    ) : (
                      <span className="text-[12px] text-muted-foreground/50 italic">No response yet</span>
                    )}
                  </div>
                ) : (
                  <div className="ml-[30px]">
                    <span className="text-[12px] text-muted-foreground/50 italic">No response yet</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
