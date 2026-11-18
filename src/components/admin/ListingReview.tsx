import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatBytes, formatDuration, formatNaira } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import RejectDialog from "@/components/admin/RejectDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showError, showSuccess } from "@/utils/toast";

type Filter = "pending" | "approved" | "rejected";

const one = (v: any) => (Array.isArray(v) ? v[0] : v);

function ReviewPanel({ house, onDone }: { house: any; onDone: () => void }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);

  const { data: media } = useQuery({
    queryKey: ["review_media", house.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("house_media").select("*").eq("house_id", house.id).order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });
  const { data: videos } = useQuery({
    queryKey: ["review_videos", house.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("house_videos").select("*").eq("house_id", house.id).order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const landlord = one(house.profiles);
  const verified = !!one(landlord?.landlord_profiles)?.verified;

  const decide = useMutation({
    mutationFn: async ({ status, reason }: { status: "approved" | "rejected"; reason: string | null }) => {
      const { error } = await supabase.from("houses").update({ approval_status: status, rejection_reason: reason }).eq("id", house.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      showSuccess(v.status === "approved" ? "Listing approved - it is now public" : "Listing rejected");
      setRejecting(false);
      onDone();
    },
    onError: (e: Error) => showError(e.message),
  });

  const moderateVideo = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("house_videos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review_videos", house.id] }),
    onError: (e: Error) => showError(e.message),
  });

  const photos = (media ?? []).filter((m) => m.kind === "photo");
  const tours = (media ?? []).filter((m) => m.kind === "tour360");

  return (
    <div className="space-y-5">
      <div className="text-sm space-y-1">
        <p>{house.description}</p>
        <p className="text-muted-foreground">
          {house.location_text}, {house.city} · {house.categories?.name} · {house.vacant_space} vacant · {house.tenancy_period_months} months · {house.house_status.replace("_", " ")}
        </p>
        <p><b className="text-primary">{formatNaira(house.annual_rent_kobo)}</b> / year</p>
        <p className={verified ? "text-green-700" : "text-destructive"}>
          Landlord: {landlord?.full_name} ({verified ? "verified" : "NOT verified - cannot be approved yet"})
        </p>
      </div>

      <section>
        <h4 className="font-semibold mb-2">Photos ({photos.length})</h4>
        {photos.length === 0 && <p className="text-sm text-destructive">No photos uploaded.</p>}
        <div className="grid grid-cols-3 gap-2">
          {photos.map((m) => <a key={m.id} href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt="" loading="lazy" className="aspect-[4/3] object-cover rounded-md border w-full" /></a>)}
        </div>
      </section>

      <section>
        <h4 className="font-semibold mb-2">360° views ({tours.length})</h4>
        <div className="grid grid-cols-2 gap-2">
          {tours.map((m) => (
            <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="relative">
              <img src={m.url} alt={m.room_label} loading="lazy" className="aspect-[2/1] object-cover rounded-md border w-full" />
              <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white rounded px-1.5">{m.room_label}</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h4 className="font-semibold mb-2">Videos ({videos?.length ?? 0})</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {videos?.map((v) => (
            <div key={v.id} className="rounded-lg border overflow-hidden">
              <video src={v.url} controls preload="metadata" className="w-full aspect-video bg-black" />
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{v.area_label}</span>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-xs text-muted-foreground">{formatDuration(v.duration_sec ?? 0)} · {formatBytes(v.size_bytes ?? 0)} (duration is reported by the landlord's browser - check it)</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={v.status === "approved" || moderateVideo.isPending} onClick={() => moderateVideo.mutate({ id: v.id, status: "approved" })}>Approve</Button>
                  <Button size="sm" variant="outline" className="text-destructive" disabled={v.status === "rejected" || moderateVideo.isPending} onClick={() => moderateVideo.mutate({ id: v.id, status: "rejected" })}>Reject</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {house.approval_status !== "approved" && (
          <Button disabled={decide.isPending} onClick={() => decide.mutate({ status: "approved", reason: null })}>
            {decide.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}Approve listing
          </Button>
        )}
        {house.approval_status !== "rejected" && (
          <Button variant="outline" className="text-destructive" onClick={() => setRejecting(true)}>
            <XCircle className="w-4 h-4 mr-2" />{house.approval_status === "approved" ? "Take down" : "Reject"}
          </Button>
        )}
      </div>
      <RejectDialog open={rejecting} onOpenChange={setRejecting} title="Reject this listing" busy={decide.isPending}
        onConfirm={(reason) => decide.mutate({ status: "rejected", reason })} />
    </div>
  );
}

export default function ListingReview() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [open, setOpen] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin_houses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("houses")
        .select("*, categories(name), profiles(full_name, username, landlord_profiles(verified))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const count = (s: Filter) => (data ?? []).filter((h) => h.approval_status === s).length;
  const shown = (data ?? []).filter((h) => h.approval_status === filter);

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({count("pending")})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({count("approved")})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({count("rejected")})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <div className="h-24 skeleton-shimmer rounded-xl" />}
      {!isLoading && shown.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing here.</p>}

      <div className="grid gap-3">
        {shown.map((h) => {
          const landlord = one(h.profiles);
          return (
            <div key={h.id} className="rounded-xl border bg-background p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{h.title} <StatusBadge status={h.approval_status} /></p>
                <p className="text-sm text-muted-foreground truncate">{h.location_text}, {h.city} · {formatNaira(h.annual_rent_kobo)}/yr · by {landlord?.full_name}</p>
              </div>
              <Button size="sm" onClick={() => setOpen(h)}><Eye className="w-4 h-4 mr-1.5" />Review</Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
            <DialogDescription>Check photos and videos show the real property, then approve or reject.</DialogDescription>
          </DialogHeader>
          {open && (
            <ReviewPanel house={open} onDone={() => { setOpen(null); qc.invalidateQueries({ queryKey: ["admin_houses"] }); qc.invalidateQueries({ queryKey: ["admin_pending_count"] }); }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
