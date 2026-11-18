import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardShell from "@/components/DashboardShell";
import MyListings from "@/components/landlord/MyListings";
import ProfileForm, { VerificationBanner, useLandlordProfile, verificationState } from "@/components/landlord/ProfileForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LandlordDashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "listings";
  const { data: lp } = useLandlordProfile();
  const needsAttention = verificationState(lp) !== "verified";

  return (
    <DashboardShell title="Landlord dashboard" subtitle={`Welcome, ${user?.full_name}. List your houses and get paid the full rent.`}>
      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="listings">My listings</TabsTrigger>
          <TabsTrigger value="profile">
            Profile & verification
            {needsAttention && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-amber-500" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="listings" className="mt-4 space-y-4">
          {needsAttention && <VerificationBanner lp={lp} />}
          <MyListings />
        </TabsContent>
        <TabsContent value="profile" className="mt-4">
          <ProfileForm />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
