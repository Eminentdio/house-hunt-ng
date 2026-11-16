import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { Home, Plus, FileText, CreditCard, Calendar, LogOut, Settings } from "lucide-react";

export default function LandlordDashboard() {
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
          <h2 className="text-3xl font-bold text-gray-900">Landlord Dashboard</h2>
          <p className="text-gray-600 mt-2">Manage your properties and tenants</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                My Houses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage your property listings</p>
              <Button className="mt-4 w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add House
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Inspections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View inspection requests</p>
              <Button variant="outline" className="mt-4 w-full">
                View Inspections
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Agreements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage tenancy agreements</p>
              <Button variant="outline" className="mt-4 w-full">
                View Agreements
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
              <p className="text-gray-600">Track payment status</p>
              <Button variant="outline" className="mt-4 w-full">
                View Payments
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage payout account</p>
              <Button variant="outline" className="mt-4 w-full">
                Update Bank Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}