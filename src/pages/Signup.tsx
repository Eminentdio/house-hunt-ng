import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home, Loader2 } from "lucide-react";

interface SignupForm {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  role: "tenant" | "landlord";
}

export default function SignupPage() {
  const [form, setForm] = useState<SignupForm>({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    role: "tenant",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signUp(form);
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 p-4">
      <div className="max-w-md w-full space-y-6 bg-card rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Home className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your Home at a Pocket Friendly Price
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
              placeholder="Choose a unique username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Phone</label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+234 800 000 0000"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">I am a</label>
            <Select
              value={form.role}
              onValueChange={(value) =>
                setForm({ ...form, role: value as "tenant" | "landlord" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Tenant — looking for a home</SelectItem>
                <SelectItem value="landlord">Landlord — listing a property</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="underline text-primary font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}