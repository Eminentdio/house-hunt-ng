import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, Loader2 } from "lucide-react";

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [form, setForm] = useState<LoginForm>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(form.username, form.password);
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      // Role-based redirect happens via the auth state change;
      // default to tenant dashboard, guards will redirect if needed.
      navigate("/tenant");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="max-w-md w-full space-y-6 bg-card rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Home className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your HouseHunt NG account
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="underline text-primary font-medium">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}