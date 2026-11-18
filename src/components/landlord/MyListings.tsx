import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatNaira } from "@/lib/format";
import { BUCKETS, removeFile } from "@/lib/media";
import StatusBadge from "@/components/StatusBadge";
import { coverPhoto } from "@/components/HouseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showError, showSuccess } from "@/utils/toast";

export default function MyListings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: houses, isLoading } = useQuery({
    queryKey: ["my_houses", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("houses")
        .select("*, categories(name), house_media(url,kind,sort_order)")
        .eq("landlord_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["my_houses"] });

  const resubmit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("resubmit_house", { p_house_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Sent for review again");
      refresh();
    },
    onError: (e: Error) => showError(e.message),
  });

  const remove = useMutation({
    mutationFn: async (house: any) => {
      // delete files first, then the row (rows cascade)
      const [{ data: media }, { data: videos }] = await Promise.all([
        supabase.from("house_media").select("url").eq("house_id", house.id),
        supabase.from("house_videos").select("url").eq("house_id", house.id),
      ]);
      await Promise.all([
        ...(media ?? []).map((m) => removeFile(BUCKETS.media, m.url)),
        ...(videos ?? []).filter((v) => v.url).map((v) => removeFile(BUCKETS.videos, v.url)),
      ]);
      const { error } = await supabase.from("houses").delete().eq("id", house.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Listing deleted");
      refresh();
    },
    onError: (e: Error) => showError(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Every listing is checked by our team before tenants can see it.</p>
        <Button asChild>
          <Link to="/landlord/houses/new">
            <Plus className="w-4 h-4 mr-2" />
            Add house
          </Link>
        </Button>
      </div>

      {isLoading && <div className="h-28 skeleton-shimmer rounded-xl" />}

      {!isLoading && houses?.length === 0 && (
        <div className="rounded-xl border border-dashed bg-background p-10 text-center">
          <Home className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">No listings yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add your first house with photos and short videos.</p>
          <Button asChild>
            <Link to="/landlord/houses/new">Add your first house</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {houses?.map((h) => {
          const cover = coverPhoto(h.house_media);
          return (
            <div key={h.id} className="rounded-xl border bg-background p-3 sm:p-4 flex gap-3 sm:gap-4">
              <div className="w-24 h-24 sm:w-32 sm:h-28 rounded-lg bg-muted overflow-hidden shrink-0">
                {cover ? <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Home className="w-8 h-8 text-muted-foreground" /></div>}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold truncate">{h.title}</h3>
                  <StatusBadge status={h.approval_status} />
                  {!h.is_available && <Badge variant="secondary">Hidden</Badge>}
                  {h.house_status === "under_renovation" && <Badge variant="outline">Renovating</Badge>}
                </div>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{h.location_text}, {h.city}</span>
                </p>
                <p className="text-sm">
                  <span className="font-semibold text-primary">{formatNaira(h.annual_rent_kobo)}</span> / year · {h.categories?.name}
                </p>
                {h.approval_status === "rejected" && h.rejection_reason && (
                  <p className="text-sm text-destructive">Reason: {h.rejection_reason}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/landlord/houses/${h.id}`}>
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Link>
                  </Button>
                  {h.approval_status === "rejected" && (
                    <Button size="sm" onClick={() => resubmit.mutate(h.id)} disabled={resubmit.isPending}>
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                      Resubmit
                    </Button>
                  )}
                  {h.approval_status !== "approved" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{h.title}" and all its photos and videos will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(h)}>
                            {remove.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
