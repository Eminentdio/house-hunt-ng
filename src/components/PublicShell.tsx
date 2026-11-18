import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function PublicShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const dash = user?.role === "admin" ? "/admin" : user?.role === "landlord" ? "/landlord" : "/tenant";
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center"><Home className="w-5 h-5 text-primary-foreground" /></div>
            <span className="font-bold text-lg tracking-tight">HouseHunt NG</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild><Link to={dash}>Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
                <Button asChild><Link to="/signup">Get started</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
