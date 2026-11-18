import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import DashboardShell from "@/components/DashboardShell";
import LandlordReview, { useLandlordApplications } from "@/components/admin/LandlordReview";
import ListingReview from "@/components/admin/ListingReview";
import CategoryManager from "@/components/admin/CategoryManager";
import { verificationState } from "@/components/landlord/ProfileForm";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "listings";

  const { data: landlords } = useLandlordApplications();
  const pendingLandlords = (landlords ?? []).filter((l) => verificationState(l) === "pending").length;
  const { data: pendingListings } = useQuery({
    queryKey: ["admin_pending_count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("houses").select("id", { count: "exact", head: true }).eq("approval_status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const bubble = (n?: number) => (n ? <Badge className="ml-1.5 h-5 px-1.5">{n}</Badge> : null);

  return (
    <DashboardShell title="Admin dashboard" subtitle="Verify landlords, review listings and manage categories.">
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="listings">Listings{bubble(pendingListings)}</TabsTrigger>
          <TabsTrigger value="landlords">Landlords{bubble(pendingLandlords)}</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="listings" className="mt-4"><ListingReview /></TabsContent>
        <TabsContent value="landlords" className="mt-4"><LandlordReview /></TabsContent>
        <TabsContent value="categories" className="mt-4"><CategoryManager /></TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
