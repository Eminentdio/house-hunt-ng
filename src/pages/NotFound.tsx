import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Home className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="text-xl font-semibold mt-2">Oops! Page not found</p>
        <p className="text-muted-foreground mt-2">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;