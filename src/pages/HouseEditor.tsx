import { useParams, useSearchParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { House } from "@/types/database";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import HouseDetailsForm from "@/components/landlord/HouseDetailsForm";
import MediaManager from "@/components/landlord/MediaManager";
import VideoManager from "@/components/landlord/VideoManager";
import { useLandlordProfile, verificationState } from "@/components/landlord/ProfileForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";

export default function HouseEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "details";
  const qc = useQueryClient();
  const { data: lp } = useLandlordProfile();

  const { data: house, isLoading, error } = useQuery({
    queryKey: ["house", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase.from("houses").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as House | null;
    },
  });

  const resubmit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("resubmit_house", { p_house_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Sent for review again");
      qc.invalidateQueries({ queryKey: ["house", id] });
      qc.invalidateQueries({ queryKey: ["my_houses"] });
    },
    onError: (e: Error) => showError(e.message),
  });

  const content = () => {
    if (isNew) return <HouseDetailsForm />;
    if (isLoading) return <div className="h-40 skeleton-shimmer rounded-xl" />;
    if (error || !house)
      return (
        <p className="text-muted-foreground">
          We couldn't find this listing. <Link to="/landlord" className="text-primary underline">Back to your listings</Link>
        </p>
      );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={house.approval_status} />
          {house.approval_status === "pending" && <span className="text-sm text-muted-foreground">We are reviewing this listing.</span>}
        </div>
        {house.approval_status === "rejected" && (
          <Alert variant="destructive">
            <AlertTitle>This listing was not approved</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Reason: {house.rejection_reason ?? "No reason given."}</p>
              <Button size="sm" variant="outline" className="text-foreground" onClick={() => resubmit.mutate()} disabled={resubmit.isPending}>
                {resubmit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}I've fixed it - resubmit
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {verificationState(lp) !== "verified" && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTitle>Your landlord account isn't verified yet</AlertTitle>
            <AlertDescription>
              This listing cannot go live until you are verified. <Link to="/landlord?tab=profile" className="underline text-primary">Complete verification</Link>
            </AlertDescription>
          </Alert>
        )}
        <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="media">Photos & 360°</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4"><HouseDetailsForm house={house} /></TabsContent>
          <TabsContent value="media" className="mt-4"><MediaManager houseId={house.id} /></TabsContent>
          <TabsContent value="videos" className="mt-4"><VideoManager houseId={house.id} /></TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <DashboardShell
      title={isNew ? "Add a house" : house?.title ?? "Edit listing"}
      subtitle={isNew ? "Start with the basics. You'll add photos and videos next." : undefined}
      back={{ to: "/landlord", label: "My listings" }}
    >
      {content()}
    </DashboardShell>
  );
}
