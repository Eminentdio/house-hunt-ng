import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Star, Trash2, Orbit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { HouseMedia } from "@/types/database";
import { BUCKETS, buildPath, compressImage, getImageSize, publicUrl, removeFile, uploadFile } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { showError, showSuccess } from "@/utils/toast";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTOS = 15;
const MAX_TOURS = 10;
const ROOMS = ["Living room", "Kitchen", "Bedroom", "Bathroom", "Compound", "Balcony"];

export default function MediaManager({ houseId }: { houseId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const photoInput = useRef<HTMLInputElement>(null);
  const tourInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [tourLabel, setTourLabel] = useState("");

  const { data: media, isLoading } = useQuery({
    queryKey: ["house_media", houseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("house_media").select("*").eq("house_id", houseId).order("sort_order");
      if (error) throw error;
      return data as HouseMedia[];
    },
  });
  const photos = (media ?? []).filter((m) => m.kind === "photo");
  const tours = (media ?? []).filter((m) => m.kind === "tour360");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["house_media", houseId] });
    qc.invalidateQueries({ queryKey: ["my_houses"] });
  };

  const addFiles = async (files: File[], kind: "photo" | "tour360", roomLabel: string) => {
    if (!user) return;
    let order = Math.max(0, ...(media ?? []).map((m) => m.sort_order)) + 1;
    for (const original of files) {
      const key = original.name + original.size;
      try {
        if (!ALLOWED.includes(original.type)) throw new Error(`${original.name}: use JPG, PNG or WebP images`);
        if (kind === "tour360") {
          const { width, height } = await getImageSize(original);
          const ratio = width / height;
          if (ratio < 1.8 || ratio > 2.2)
            throw new Error(`${original.name} is not a 360° panorama (needs a 2:1 wide image). Use your phone's Panorama / Photo Sphere mode.`);
        }
        setProgress((p) => ({ ...p, [key]: 0 }));
        const file = await compressImage(original, kind === "tour360" ? 4096 : 1600, kind === "tour360" ? 0.85 : 0.8);
        if (file.size > 10 * 1024 * 1024) throw new Error(`${original.name} is still over 10 MB after compression`);
        const path = buildPath(user.id, houseId, file);
        await uploadFile(BUCKETS.media, path, file, (pct) => setProgress((p) => ({ ...p, [key]: pct })));
        const url = publicUrl(BUCKETS.media, path);
        const { error } = await supabase.from("house_media").insert({
          house_id: houseId, kind, room_label: roomLabel, url, sort_order: order++,
        });
        if (error) {
          await removeFile(BUCKETS.media, url);
          throw error;
        }
        showSuccess(kind === "photo" ? "Photo added" : `${roomLabel} 360° added`);
      } catch (e) {
        showError((e as Error).message);
      } finally {
        setProgress((p) => {
          const { [key]: _drop, ...rest } = p;
          return rest;
        });
      }
    }
    refresh();
  };

  const remove = useMutation({
    mutationFn: async (m: HouseMedia) => {
      const { error } = await supabase.from("house_media").delete().eq("id", m.id);
      if (error) throw error;
      await removeFile(BUCKETS.media, m.url);
    },
    onSuccess: refresh,
    onError: (e: Error) => showError(e.message),
  });

  const makeCover = useMutation({
    mutationFn: async (m: HouseMedia) => {
      const min = Math.min(...photos.map((p) => p.sort_order));
      const { error } = await supabase.from("house_media").update({ sort_order: min - 1 }).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => showError(e.message),
  });

  const uploading = Object.keys(progress).length > 0;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* PHOTOS */}
      <section className="rounded-xl border bg-background p-4 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Camera className="w-4 h-4 text-primary" />Photos</h3>
            <p className="text-sm text-muted-foreground">{photos.length} of {MAX_PHOTOS}. The first photo is the cover tenants see on the listing card.</p>
          </div>
          <Button size="sm" disabled={photos.length >= MAX_PHOTOS || uploading} onClick={() => photoInput.current?.click()}>Add photos</Button>
          <input ref={photoInput} type="file" accept={ALLOWED.join(",")} multiple hidden
            onChange={(e) => { const f = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length); e.target.value = ""; addFiles(f, "photo", "Photo"); }} />
        </div>
        {isLoading && <div className="h-24 skeleton-shimmer rounded-lg" />}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((m, i) => (
            <div key={m.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-[4/3]">
              <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 text-[11px] bg-primary text-primary-foreground rounded px-1.5 py-0.5">Cover</span>}
              <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                {i !== 0 && (
                  <Button size="icon" variant="secondary" className="h-8 w-8" title="Make cover" onClick={() => makeCover.mutate(m)}><Star className="w-4 h-4" /></Button>
                )}
                <Button size="icon" variant="secondary" className="h-8 w-8" title="Delete" onClick={() => remove.mutate(m)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
        {Object.entries(progress).map(([k, v]) => (
          <div key={k} className="space-y-1"><p className="text-xs text-muted-foreground truncate">Uploading {k.replace(/\d+$/, "")}</p><Progress value={v} /></div>
        ))}
        {!isLoading && photos.length === 0 && <p className="text-sm text-amber-700">Add at least 5 clear photos (outside, living room, kitchen, bathroom, bedroom).</p>}
      </section>

      {/* 360 */}
      <section className="rounded-xl border bg-background p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Orbit className="w-4 h-4 text-primary" />360° room views</h3>
          <p className="text-sm text-muted-foreground">
            Take one panorama per room using your phone's <b>Panorama</b> or <b>Photo Sphere</b> mode. Tenants can look around the room. {tours.length} of {MAX_TOURS}.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="tourlabel">Which room?</Label>
            <Input id="tourlabel" list="rooms" value={tourLabel} onChange={(e) => setTourLabel(e.target.value)} placeholder="e.g. Living room" />
            <datalist id="rooms">{ROOMS.map((r) => <option key={r} value={r} />)}</datalist>
          </div>
          <Button disabled={!tourLabel.trim() || tours.length >= MAX_TOURS || uploading} onClick={() => tourInput.current?.click()}>Upload 360° photo</Button>
          <input ref={tourInput} type="file" accept={ALLOWED.join(",")} hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { addFiles([f], "tour360", tourLabel.trim()); setTourLabel(""); } }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tours.map((m) => (
            <div key={m.id} className="relative rounded-lg overflow-hidden border bg-muted aspect-[2/1]">
              <img src={m.url} alt={m.room_label} loading="lazy" className="w-full h-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 text-xs bg-black/60 text-white rounded px-1.5 py-0.5">{m.room_label}</span>
              <Button size="icon" variant="secondary" className="absolute top-1.5 right-1.5 h-7 w-7" onClick={() => remove.mutate(m)}>
                {remove.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">The interactive 360° viewer for tenants arrives in Phase 3. Your panoramas are stored now.</p>
      </section>
    </div>
  );
}
