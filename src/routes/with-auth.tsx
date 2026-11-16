import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function useAuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // Let the app render while loading
  }

  if (!user) {
    // Store location to redirect after login
    // We'll redirect to the login page
    return <Navigate to="/" replace />;
  }

  return null; // User is authenticated, render children
}

export function useLandlordGuard() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user has landlord role
  const profile = user?.role;
  if (profile !== "landlord" && profile !== "admin") {
    return <Navigate to="/" replace />;
  }

  return null;
}

export function useTenantGuard() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const profile = user?.role;
  if (profile !== "tenant" && profile !== "admin") {
    return <Navigate to="/" replace />;
  }

  return null;
}

export function useAdminGuard() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return null;
}