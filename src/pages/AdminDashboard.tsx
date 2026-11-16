import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { Home, Users, FileText, CreditCard, Settings, LogOut, Shield } from "lucide-react";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">HouseHunt NG</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.full_name}</span>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <p className="text-gray-600 mt-2">Manage the platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Landlords
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Approve or reject landlord accounts</p>
              <Button className="mt-4 w-full">
                Review Landlords
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Review and approve house listings</p>
              <Button variant="outline" className="mt-4 w-full">
                Review Listings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage escrow and refunds</p>
              <Button variant="outline" className="mt-4 w-full">
                View Payments
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage fee rate and categories</p>
              <Button variant="outline" className="mt-4 w-full">
                Manage Config
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View admin actions and notifications</p>
              <Button variant="outline" className="mt-4 w-full">
                View Audit Log
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}