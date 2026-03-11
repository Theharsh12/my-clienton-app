import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { GripVertical, Plus, Trash2 } from "lucide-react";

interface Props {
  templateId: string;
  templateName: string;
  onClose: () => void;
  onSaved: () => void;
}

interface TemplateItem {
  id?: string;
  label: string;
  type: string;
  position: number;
  required: boolean;
  isNew?: boolean;
}

const ITEM_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "file", label: "File Upload" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
];

export default function EditTemplateDialog({ templateId, templateName, onClose, onSaved }: Props) {
  const [name, setName] = useState(templateName);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("checklist_items")
        .select("id, label, type, position, required")
        .eq("template_id", templateId)
        .order("position", { ascending: true });

      if (error) {
        toast.error("Failed to load template items");
        return;
      }
      setItems(data || []);
      setLoading(false);
    };
    fetchItems();
  }, [templateId]);

  const addItem = () => {
    setItems([...items, { label: "", type: "text", position: items.length, required: false, isNew: true }]);
  };

  const removeItem = (index: number) => {
    const item = items[index];
    if (item.id) setDeletedIds(prev => [...prev, item.id!]);
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: any) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[j]] = [newItems[j], newItems[index]];
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Template name is required"); return; }
    const validItems = items.filter(i => i.label.trim());
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }

    setSaving(true);

    // Update template name
    const { error: nameErr } = await supabase
      .from("checklist_templates")
      .update({ name: name.trim() })
      .eq("id", templateId);

    if (nameErr) { toast.error("Failed to update template name"); setSaving(false); return; }

    // Delete removed items
    if (deletedIds.length > 0) {
      // Delete responses for removed items first
      await supabase.from("client_responses").delete().in("item_id", deletedIds);
      await supabase.from("checklist_items").delete().in("id", deletedIds);
    }

    // Update existing items and insert new ones
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      if (item.id && !item.isNew) {
        await supabase.from("checklist_items").update({
          label: item.label.trim(),
          type: item.type,
          position: i,
          required: item.required,
        }).eq("id", item.id);
      } else {
        await supabase.from("checklist_items").insert({
          template_id: templateId,
          label: item.label.trim(),
          type: item.type,
          position: i,
          required: item.required,
        });
      }
    }

    setSaving(false);
    toast.success("Template updated!");
    onSaved();
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
        className="bg-surface border border-border rounded-2xl p-7 w-[520px] max-w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display text-[22px] font-normal mb-1.5">Edit Template</h3>
        <p className="text-[13px] text-muted-foreground mb-6">Modify template name and checklist items.</p>

        {/* Template name */}
        <div className="mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Template Name *</label>
          <input
            className="w-full py-2.5 px-3.5 bg-surface-2 border border-border rounded-[9px] text-foreground text-[13.5px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Items */}
        <div className="border-t border-border pt-5 mb-5">
          <label className="text-xs font-medium text-muted-foreground mb-3 block">Checklist Items</label>

          {loading ? (
            <div className="text-[13px] text-muted-foreground py-4 text-center">Loading items...</div>
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={item.id || `new-${i}`} className="flex items-center gap-2 group">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground text-[10px] leading-none disabled:opacity-30 transition-colors">▲</button>
                    <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="text-muted-foreground hover:text-foreground text-[10px] leading-none disabled:opacity-30 transition-colors">▼</button>
                  </div>
                  <input
                    className="flex-1 py-2 px-3 bg-surface-2 border border-border rounded-lg text-foreground text-[13px] font-body outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                    placeholder={`Item ${i + 1}`}
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
                  <button
                    onClick={() => removeItem(i)}
                    className="text-muted-foreground hover:text-destructive text-sm transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addItem}
            className="mt-3 flex items-center gap-1.5 text-[12px] text-primary hover:underline font-medium"
          >
            <Plus size={12} /> Add item
          </button>
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
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
