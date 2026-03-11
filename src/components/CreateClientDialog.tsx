import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  userId: string;
  canCreateTemplate: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface TemplateOption {
  id: string;
  name: string;
}

interface NewItem {
  label: string;
  type: string;
  required: boolean;
}

const ITEM_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "file", label: "File Upload" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
];

export default function CreateClientDialog({ userId, canCreateTemplate, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [templateMode, setTemplateMode] = useState<"existing" | "new">("new");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [items, setItems] = useState<NewItem[]>([
    { label: "", type: "text", required: false },
  ]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("checklist_templates").select("id, name").then(({ data }) => {
      if (data && data.length > 0) {
        setTemplates(data);
        setTemplateMode("existing");
        setSelectedTemplate(data[0].id);
      }
    });
  }, []);

  const addItem = () => setItems([...items, { label: "", type: "text", required: false }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof NewItem, value: any) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  const moveItem = (i: number, dir: -1 | 1) => {
    const newItems = [...items];
    const j = i + dir;
    if (j < 0 || j >= newItems.length) return;
    [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Client name is required"); return; }

    let templateId: string | null = null;

    if (templateMode === "existing") {
      templateId = selectedTemplate || null;
    } else {
      if (!canCreateTemplate) {
        toast.error("Free plan allows 1 template. Upgrade to Pro for unlimited.");
        return;
      }
      if (!newTemplateName.trim()) { toast.error("Template name is required"); return; }
      const validItems = items.filter(i => i.label.trim());
      if (validItems.length === 0) { toast.error("Add at least one checklist item"); return; }

      setSaving(true);

      const { data: tmpl, error: tmplErr } = await supabase
        .from("checklist_templates")
        .insert({ user_id: userId, name: newTemplateName.trim() })
        .select("id")
        .single();

      if (tmplErr || !tmpl) { toast.error(tmplErr?.message || "Failed to create template"); setSaving(false); return; }
      templateId = tmpl.id;

      const { error: itemsErr } = await supabase
        .from("checklist_items")
        .insert(validItems.map((item, idx) => ({
          template_id: templateId!,
          label: item.label.trim(),
          type: item.type,
          position: idx,
          required: item.required,
        })));

      if (itemsErr) { toast.error(itemsErr.message); setSaving(false); return; }
    }

    if (!saving) setSaving(true);

    const { error } = await supabase.from("clients").insert({
      user_id: userId,
      name: name.trim(),
      email: email.trim() || null,
      template_id: templateId,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Client created!");
      onCreated();
    }
    setSaving(false);
  };

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
        className="bg-surface border border-border rounded-2xl p-7 w-[500px] max-w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display text-[22px] font-normal mb-1.5">New Client</h3>
        <p className="text-[13px] text-muted-foreground mb-6">Create a client and assign a checklist template.</p>

        {/* Client details */}
        <div className="space-y-3.5 mb-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client Name *</label>
            <input
              className="w-full py-2.5 px-3.5 bg-surface-2 border border-border rounded-[9px] text-foreground text-[13.5px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
              placeholder="e.g. Sarah Johnson"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Client Email</label>
            <input
              className="w-full py-2.5 px-3.5 bg-surface-2 border border-border rounded-[9px] text-foreground text-[13.5px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
              placeholder="sarah@company.com (optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Template section */}
        <div className="border-t border-border pt-5 mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-2.5 block">Checklist Template</label>

          {templates.length > 0 && (
            <div className="flex bg-surface-2 border border-border rounded-lg p-0.5 mb-4">
              {(["existing", "new"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setTemplateMode(m)}
                  className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                    templateMode === m ? "bg-surface text-foreground border border-border" : "text-muted-foreground"
                  }`}
                >
                  {m === "existing" ? "Use Existing" : "Create New"}
                </button>
              ))}
            </div>
          )}

          {templateMode === "existing" && templates.length > 0 ? (
            <select
              className="w-full py-2.5 px-3.5 bg-surface-2 border border-border rounded-[9px] text-foreground text-[13.5px] font-body outline-none cursor-pointer"
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <>
              {!canCreateTemplate && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-3 text-[12px] text-foreground">
                  Free plan allows 1 template. <a href="/#pricing" className="text-primary hover:underline font-medium">Upgrade →</a>
                </div>
              )}
              <input
                className="w-full py-2.5 px-3.5 bg-surface-2 border border-border rounded-[9px] text-foreground text-[13.5px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50 mb-3"
                placeholder="Template name, e.g. Website Redesign"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
              />

              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 py-2 px-3 bg-surface-2 border border-border rounded-lg text-foreground text-[13px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                      placeholder={`Item ${i + 1}, e.g. "Brand guidelines PDF"`}
                      value={item.label}
                      onChange={e => updateItem(i, "label", e.target.value)}
                    />
                    <select
                      className="py-2 px-2 bg-surface-2 border border-border rounded-lg text-foreground text-[12px] font-body outline-none cursor-pointer"
                      value={item.type}
                      onChange={e => updateItem(i, "type", e.target.value)}
                    >
                      {ITEM_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                      <input
                        type="checkbox"
                        checked={item.required}
                        onChange={e => updateItem(i, "required", e.target.checked)}
                        className="accent-primary"
                      />
                      Req
                    </label>
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground text-[10px] leading-none disabled:opacity-30 transition-colors">▲</button>
                      <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="text-muted-foreground hover:text-foreground text-[10px] leading-none disabled:opacity-30 transition-colors">▼</button>
                    </div>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(i)}
                        className="text-muted-foreground hover:text-destructive text-sm transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addItem}
                className="mt-2 text-[12px] text-primary hover:underline font-medium"
              >
                + Add item
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg text-[13px] font-medium border border-border text-muted-foreground bg-surface-2 hover:border-muted-foreground/30 hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 px-4 rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Client"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
