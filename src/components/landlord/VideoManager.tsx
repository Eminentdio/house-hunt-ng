import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig } from "@/hooks/useCatalog";
import { HouseVideo } from "@/types/database";
import { BUCKETS, buildPath, getVideoDuration, publicUrl, removeFile, uploadFile } from "@/lib/media";
import { formatBytes, formatDuration } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { showError, showSuccess } from "@/utils/toast";

const TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const AREAS = ["Living room", "Kitchen", "Bathroom", "Bedroom", "Compound / exterior", "Whole house walkthrough"];

export default function VideoManager({ houseId }: { houseId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: config } = useAppConfig();
  const maxVideos = config?.maxVideos ?? 3;
  const maxSec = config?.maxVideoSeconds ?? 180;
  const maxMb = config?.maxVideoMb ?? 150;

  const input = useRef<HTMLInputElement>(null);
  const [area, setArea] = useState("");
  const [percent, setPercent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: videos, isLoading } = useQuery({
    queryKey: ["house_videos", houseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("house_videos").select("*").eq("house_id", houseId).order("sort_order");
      if (error) throw error;
      return data as HouseVideo[];
    },
  });
  const used = videos?.length ?? 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["house_videos", houseId] });

  const handleFile = async (file: File) => {
    if (!user) return;
    const label = area.trim();
    let uploadedUrl: string | null = null;
    setBusy(true);
    try {
      if (!label) throw new Error("Say which area this video shows first.");
      if (used >= maxVideos) throw new Error(`You can upload at most ${maxVideos} videos per house.`);
      if (!TYPES.includes(file.type)) throw new Error("Use an MP4, WebM or MOV video.");
      if (file.size > maxMb * 1024 * 1024) throw new Error(`Video is ${formatBytes(file.size)}. The limit is ${maxMb} MB - record at 720p or trim it.`);
      const seconds = await getVideoDuration(file);
      if (seconds > maxSec) throw new Error(`Video is ${formatDuration(seconds)} long. The limit is ${formatDuration(maxSec)}.`);

      setPercent(0);
      const path = buildPath(user.id, houseId, file);
      await uploadFile(BUCKETS.videos, path, file, setPercent);
      uploadedUrl = publicUrl(BUCKETS.videos, path);

      const nextOrder = Math.max(0, ...(videos ?? []).map((v) => v.sort_order)) + 1;
      const { error } = await supabase.from("house_videos").insert({
        house_id: houseId, area_label: label, duration_sec: seconds, size_bytes: file.size,
        url: uploadedUrl, sort_order: nextOrder,
      });
      if (error) throw error;
      uploadedUrl = null;
      setArea("");
      showSuccess("Video uploaded. It will appear to tenants after review.");
      refresh();
    } catch (e) {
      if (uploadedUrl) await removeFile(BUCKETS.videos, uploadedUrl); // don't leave orphan files
      showError((e as Error).message);
    } finally {
      setBusy(false);
      setPercent(null);
    }
  };

  const remove = useMutation({
    mutationFn: async (v: HouseVideo) => {
      const { error } = await supabase.from("house_videos").delete().eq("id", v.id);
      if (error) throw error;
      if (v.url) await removeFile(BUCKETS.videos, v.url);
    },
    onSuccess: refresh,
    onError: (e: Error) => showError(e.message),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <section className="rounded-xl border bg-background p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Film className="w-4 h-4 text-primary" />Walkthrough videos</h3>
          <p className="text-sm text-muted-foreground">
            Short clips let tenants see the place without visiting. Up to <b>{maxVideos} videos</b>, each at most <b>{formatDuration(maxSec)}</b> and {maxMb} MB. Cover the key areas.
            {" "}({used} of {maxVideos} used)
          </p>
          <ul className="text-xs text-muted-foreground list-disc pl-5 mt-2 space-y-0.5">
            <li>Film in landscape, in daylight, and walk slowly.</li>
            <li>Show the real property only. Videos of other places are rejected.</li>
            <li>To keep files small, record at 720p. MP4 works best.</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="area">What does this video show?</Label>
            <Input id="area" list="areas" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Kitchen" disabled={busy || used >= maxVideos} />
            <datalist id="areas">{AREAS.map((a) => <option key={a} value={a} />)}</datalist>
          </div>
          <Button disabled={busy || used >= maxVideos || !area.trim()} onClick={() => input.current?.click()}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Choose video
          </Button>
          <input ref={input} type="file" accept={TYPES.join(",")} hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }} />
        </div>
        {percent !== null && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Uploading… {percent}% (keep this page open)</p>
            <Progress value={percent} />
          </div>
        )}
      </section>

      {isLoading && <div className="h-24 skeleton-shimmer rounded-xl" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {videos?.map((v) => (
          <div key={v.id} className="rounded-xl border bg-background overflow-hidden">
            <video src={v.url ?? undefined} controls preload="metadata" className="w-full aspect-video bg-black" />
            <div className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{v.area_label}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(v.duration_sec ?? 0)} · {formatBytes(v.size_bytes ?? 0)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StatusBadge status={v.status} />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(v)} title="Delete"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
