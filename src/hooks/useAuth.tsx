import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Profile, Role } from "@/types/database";

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface SignUpData {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { data: email, error: rpcError } = await supabase
        .rpc("resolve_username_to_email", { p_username: username });

      if (rpcError || !email) {
        return { error: new Error("Invalid username or password") };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error("Invalid username or password") };
      }

      return { error: null };
    } catch {
      return { error: new Error("Invalid username or password") };
    }
  };

  const signUp = async (data: SignUpData) => {
    try {
      if (!/^[A-Za-z0-9_]{3,20}$/.test(data.username)) {
        return {
          error: new Error("Username must be 3-20 characters: letters, numbers or underscore only"),
        };
      }

      const { data: available, error: rpcError } = await supabase.rpc("username_available", {
        p_username: data.username,
      });
      if (rpcError) throw rpcError;
      if (!available) {
        return { error: new Error("Username already taken") };
      }

      // The profile (and landlord profile) rows are created by the database trigger
      // `handle_new_user`, which also guarantees nobody can sign up as admin.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
            full_name: data.fullName,
            phone: data.phone,
            role: data.role,
          },
        },
      });

      if (authError) throw authError;

      return { error: null, needsEmailConfirmation: !authData.session };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}