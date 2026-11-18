import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/hooks/useCatalog";
import { Category } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showSuccess } from "@/utils/toast";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CategoryManager() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [cover, setCover] = useState("");

  const reset = () => { setEditing(null); setName(""); setCover(""); };
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const save = useMutation({
    mutationFn: async () => {
      const n = name.trim();
      if (n.length < 2) throw new Error("Enter a category name");
      if (cover && !/^https:\/\//.test(cover.trim())) throw new Error("Cover image must be a https:// link");
      const row = { name: n, cover_image_url: cover.trim() || null };
      if (editing) {
        const { error } = await supabase.from("categories").update(row).eq("id", editing.id); // slug is fixed: houses use it as their type
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({ ...row, slug: slugify(n) });
        if (error) throw error;
      }
    },
    onSuccess: () => { showSuccess("Category saved"); reset(); refresh(); },
    onError: (e: Error) => showError(e.message.includes("duplicate") ? "A category with that name already exists" : e.message),
  });

  const remove = useMutation({
    mutationFn: async (c: Category) => {
      const { error } = await supabase.from("categories").delete().eq("id", c.id);
      if (error) throw new Error("This category still has houses. Move or delete them first.");
    },
    onSuccess: () => { showSuccess("Category deleted"); refresh(); },
    onError: (e: Error) => showError(e.message),
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-xl border bg-background p-4 space-y-3">
        <h3 className="font-semibold">{editing ? `Edit "${editing.name}"` : "Add a category"}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label htmlFor="cname">Name</Label><Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mini Flat" /></div>
          <div className="space-y-1.5"><Label htmlFor="ccover">Cover image link (optional)</Label><Input id="ccover" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}{editing ? "Save" : "Add"}
          </Button>
          {editing && <Button variant="ghost" onClick={reset}>Cancel</Button>}
        </div>
      </div>

      {isLoading && <div className="h-20 skeleton-shimmer rounded-xl" />}
      <div className="grid gap-2">
        {categories?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5">
            <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.slug}</p></div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setName(c.name); setCover(c.cover_image_url ?? ""); }}><Pencil className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate(c)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
