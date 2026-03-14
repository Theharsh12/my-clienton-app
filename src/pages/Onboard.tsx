import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ChecklistItem {
  id: string;
  label: string;
  type: string;
  position: number;
  required: boolean;
}

interface ResponseMap {
  [itemId: string]: {
    value: string;
    file_url: string;
    completed: boolean;
  };
}

export default function Onboard() {
  const { token } = useParams<{ token: string }>();
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [responses, setResponses] = useState<ResponseMap>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [noTemplate, setNoTemplate] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, template_id")
      .eq("token", token!)
      .maybeSingle();

    if (!client) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (!client.template_id) {
      setNoTemplate(true);
      setLoading(false);
      return;
    }

    setClientName(client.name);
    setClientId(client.id);

    const { data: itemsData } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("template_id", client.template_id)
      .order("position");

    setItems(itemsData || []);

    const { data: responsesData } = await supabase
      .from("client_responses")
      .select("item_id, value, file_url, completed")
      .eq("client_id", client.id);

    const rMap: ResponseMap = {};
    (responsesData || []).forEach(r => {
      rMap[r.item_id] = { value: r.value || "", file_url: r.file_url || "", completed: r.completed };
    });
    setResponses(rMap);
    setLoading(false);
  };

  const saveResponse = useCallback(async (itemId: string, value: string, fileUrl?: string, isCheckbox?: boolean) => {
    setSaving(itemId);
    const completed = isCheckbox ? value === "true" : (value.trim().length > 0 || (fileUrl || "").length > 0);

    const { error } = await supabase
      .from("client_responses")
      .upsert(
        {
          client_id: clientId,
          item_id: itemId,
          value: value || null,
          file_url: fileUrl || null,
          completed,
        },
        { onConflict: "client_id,item_id" }
      );

    if (error) {
      toast.error("Failed to save");
    } else {
      setResponses(prev => ({
        ...prev,
        [itemId]: { value, file_url: fileUrl || prev[itemId]?.file_url || "", completed },
      }));
    }
    setSaving(null);
  }, [clientId]);

  const handleFileUpload = async (itemId: string, file: File) => {
    // Basic validation to prevent huge or unsupported uploads
    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File is too large. Max size is ${maxSizeMb}MB.`);
      return;
    }

    setUploading(itemId);
    const path = `${clientId}/${itemId}/${file.name}`;
    const { error } = await supabase.storage.from("client-uploads").upload(path, file, { upsert: true });

    if (error) {
      toast.error("Upload failed");
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("client-uploads").getPublicUrl(path);
    await saveResponse(itemId, file.name, urlData.publicUrl);
    setUploading(null);
  };

  const handleCheckboxToggle = (itemId: string) => {
    const current = responses[itemId]?.completed || false;
    saveResponse(itemId, (!current).toString(), undefined, true);
  };

  if (loading) {
    return (
      <div className="theme-light min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (noTemplate) {
    return (
      <div className="theme-light min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-[48px] mb-4">📋</div>
          <h2 className="font-display text-2xl text-foreground mb-2">Checklist not ready yet</h2>
          <p className="text-sm text-muted-foreground">
            This onboarding link is valid, but your checklist has not been set up yet. Please contact your designer.
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="theme-light min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-[48px] mb-4">🔗</div>
          <h2 className="font-display text-2xl text-foreground mb-2">Link not found</h2>
          <p className="text-sm text-muted-foreground">This onboarding link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const completedCount = Object.values(responses).filter(r => r.completed).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="theme-light min-h-screen bg-background">
      {/* HEADER */}
      <header className="bg-card border-b border-border sticky top-0 z-50 px-6">
        <div className="max-w-[640px] mx-auto h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-[34px] h-[34px] rounded-[9px] bg-primary flex items-center justify-center text-[15px] text-primary-foreground font-bold">⚡</div>
            <span className="text-[15px] font-semibold text-foreground">Handoff</span>
          </div>
          <span className="text-xs text-muted-foreground">{completedCount}/{totalCount} completed</span>
        </div>
      </header>

      {/* HERO */}
      <div className="bg-card border-b border-border py-9 px-6">
        <div className="max-w-[640px] mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 text-xs font-medium text-primary mb-3.5">
            <span>👋</span> Welcome, {clientName}
          </div>
          <h1 className="font-display text-[34px] font-normal text-foreground leading-tight mb-2">
            Your <em className="italic text-primary">onboarding</em> checklist
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[460px] mb-5">
            Please complete the items below. Your progress is saved automatically.
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-foreground">{pct}%</span>
          </div>
        </div>
      </div>

      {/* CHECKLIST */}
      <div className="max-w-[640px] mx-auto px-6 py-8 pb-16">
        <div className="space-y-4">
          {items.map((item, i) => {
            const resp = responses[item.id] || { value: "", file_url: "", completed: false };
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-card border rounded-[14px] p-5 transition-all ${
                  resp.completed ? "border-primary/30 bg-primary/[0.02]" : "border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    resp.completed ? "bg-primary border-primary text-primary-foreground" : "border-border"
                  }`}>
                    {resp.completed && <span className="text-[10px]">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[14px] font-medium text-foreground">{item.label}</span>
                      {item.required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">Required</span>
                      )}
                    </div>

                    {item.type === "text" && (
                      <input
                        className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-foreground text-[13.5px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                        placeholder="Type your answer..."
                        defaultValue={resp.value}
                        onBlur={e => saveResponse(item.id, e.target.value)}
                      />
                    )}

                    {item.type === "textarea" && (
                      <textarea
                        className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-foreground text-[13.5px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50 min-h-[80px] resize-y"
                        placeholder="Type your answer..."
                        defaultValue={resp.value}
                        onBlur={e => saveResponse(item.id, e.target.value)}
                      />
                    )}

                    {item.type === "url" && (
                      <input
                        className="w-full py-2.5 px-3.5 bg-background border border-border rounded-lg text-foreground text-[13.5px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                        placeholder="https://..."
                        type="url"
                        defaultValue={resp.value}
                        onBlur={e => saveResponse(item.id, e.target.value)}
                      />
                    )}

                    {item.type === "checkbox" && (
                      <label className="flex items-center gap-2.5 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={resp.completed}
                          onChange={() => handleCheckboxToggle(item.id)}
                          className="w-4 h-4 accent-primary rounded"
                        />
                        <span className="text-[13px] text-muted-foreground">
                          {resp.completed ? "Done" : "Mark as complete"}
                        </span>
                      </label>
                    )}

                    {item.type === "file" && (
                      <div>
                        {resp.file_url ? (
                          <div className="space-y-2.5">
                            {/* Image preview */}
                            {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(resp.value || resp.file_url) && (
                              <a href={resp.file_url} target="_blank" rel="noopener noreferrer" className="block">
                                <img
                                  src={resp.file_url}
                                  alt={resp.value || "Uploaded file"}
                                  className="max-h-[160px] rounded-lg border border-border object-contain bg-background"
                                />
                              </a>
                            )}
                            <div className="flex items-center gap-2 text-[13px]">
                              <span className="text-success">✓</span>
                              <span className="text-foreground truncate">{resp.value || "Uploaded file"}</span>
                              <label className="text-[11px] text-primary hover:underline cursor-pointer ml-auto font-medium">
                                Replace
                                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0])} />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center py-6 px-4 bg-background border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all ${uploading === item.id ? "opacity-50 pointer-events-none" : ""}`}
                            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary/50"); }}
                            onDragLeave={e => { e.currentTarget.classList.remove("border-primary/50"); }}
                            onDrop={e => {
                              e.preventDefault();
                              e.currentTarget.classList.remove("border-primary/50");
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleFileUpload(item.id, file);
                            }}
                          >
                            <span className="text-2xl mb-1.5">📁</span>
                            <span className="text-[13px] text-muted-foreground">
                              {uploading === item.id ? "Uploading..." : "Drag & drop or click to upload"}
                            </span>
                            <span className="text-[11px] text-muted-foreground/50 mt-0.5">
                              Images, PDFs, documents accepted
                            </span>
                            <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(item.id, e.target.files[0])} />
                          </label>
                        )}
                      </div>
                    )}

                    {saving === item.id && (
                      <span className="text-[11px] text-muted-foreground mt-1.5 block">Saving...</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {pct === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 text-center bg-card border border-primary/20 rounded-2xl p-8"
          >
            <div className="text-[48px] mb-3">🎉</div>
            <h3 className="font-display text-2xl text-foreground mb-2">All done!</h3>
            <p className="text-sm text-muted-foreground">
              Thank you for completing your onboarding checklist. Your designer has been notified.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
