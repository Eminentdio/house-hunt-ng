import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---- stub Supabase: every query resolves to empty data, with optional fixtures per table ----
const fixtures: Record<string, any> = {};
const queryErrors: Record<string, Error> = {};
vi.mock("@/lib/supabase", () => {
  const chain = (table: string): any =>
    new Proxy(function () {}, {
      get: (_t, prop) => {
        if (prop === "then") {
          const rows = fixtures[table] ?? [];
          return (res: any) => res({ data: rows, error: queryErrors[table] ?? null, count: rows.length });
        }
        if (prop === "maybeSingle" || prop === "single") return () => chain(table + ":one");
        return () => chain(table);
      },
    });
  return {
    supabase: {
      from: (t: string) => chain(t),
      rpc: () => chain("rpc"),
      auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
      storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "x" } }), remove: async () => ({}), createSignedUrl: async () => ({ data: { signedUrl: "x" }, error: null }) }) },
    },
  };
});

let currentUser: any = { id: "u1", full_name: "Test Landlord", role: "landlord", username: "t", email: "t@x.ng", phone: "1" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: currentUser, loading: false, signOut: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), refreshUser: vi.fn() }),
  AuthProvider: ({ children }: any) => children,
}));

import LandlordDashboard from "@/pages/LandlordDashboard";
import HouseEditor from "@/pages/HouseEditor";
import AdminDashboard from "@/pages/AdminDashboard";
import Categories from "@/pages/Categories";
import CategoryHouses from "@/pages/CategoryHouses";
import { formatNaira, feeKobo, nairaToKobo } from "@/lib/format";

const wrap = (ui: React.ReactNode, path = "/") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("money helpers", () => {
  it("formats naira from kobo and adds the 15% fee on top of rent", () => {
    expect(formatNaira(90_000_000)).toBe("₦900,000");
    expect(feeKobo(nairaToKobo(900_000), 0.15)).toBe(nairaToKobo(135_000));
  });
});

describe("Phase 2 screens render without crashing", () => {
  it("landlord dashboard shows listings and verification prompt", async () => {
    wrap(<LandlordDashboard />);
    expect(await screen.findByText("Landlord dashboard")).toBeInTheDocument();
    expect(await screen.findByText(/No listings yet/)).toBeInTheDocument();
    expect(screen.getByText(/Complete your profile to get verified/)).toBeInTheDocument();
  });

  it("new-house form renders its fields", async () => {
    wrap(
      <Routes><Route path="/landlord/houses/:id" element={<HouseEditor />} /></Routes>,
      "/landlord/houses/new"
    );
    expect(await screen.findByText("Add a house")).toBeInTheDocument();
    expect(screen.getByLabelText("Listing title")).toBeInTheDocument();
    expect(screen.getByLabelText("Yearly rent (₦)")).toBeInTheDocument();
  });

  it("admin dashboard renders all three tabs", async () => {
    currentUser = { ...currentUser, role: "admin" };
    wrap(<AdminDashboard />);
    expect(await screen.findByText("Admin dashboard")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Landlords/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Categories/ })).toBeInTheDocument();
    expect(await screen.findByText(/Pending \(0\)/)).toBeInTheDocument();
  });

  it("public categories page lists categories with counts", async () => {
    fixtures.categories = [{ id: "c1", name: "Self Contain", slug: "self-contain", cover_image_url: null }];
    fixtures.houses = [{ category_id: "c1" }, { category_id: "c1" }];
    wrap(<Categories />);
    expect(await screen.findByText("Self Contain")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("2 available")).toBeInTheDocument());
  });

  it("category grid shows location and price under each photo", async () => {
    fixtures.categories = [{ id: "c1", name: "Self Contain", slug: "self-contain", cover_image_url: null }];
    fixtures.houses = [{ id: "h1", title: "Modern Self Contain", location_text: "12 Yaba Road", city: "Lagos", annual_rent_kobo: 90_000_000, house_status: "available", house_media: [] }];
    wrap(
      <Routes><Route path="/categories/:slug" element={<CategoryHouses />} /></Routes>,
      "/categories/self-contain"
    );
    expect(await screen.findByText("₦900,000")).toBeInTheDocument();
    expect(screen.getByText(/12 Yaba Road, Lagos/)).toBeInTheDocument();
  });

  it("reports category query failures instead of showing a false not-found message", async () => {
    queryErrors.categories = new Error("Network unavailable");
    wrap(
      <Routes><Route path="/categories/:slug" element={<CategoryHouses />} /></Routes>,
      "/categories/self-contain"
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load categories/i);
    delete queryErrors.categories;
  });

  it("shows a visible error when the category list cannot be loaded", async () => {
    queryErrors.categories = new Error("Network unavailable");
    wrap(<Categories />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load categories/i);
    delete queryErrors.categories;
  });

  it("house form previews the tenant price (rent + 15%) and validates before saving", async () => {
    currentUser = { ...currentUser, role: "landlord" };
    wrap(
      <Routes><Route path="/landlord/houses/:id" element={<HouseEditor />} /></Routes>,
      "/landlord/houses/new"
    );
    const rent = await screen.findByLabelText("Yearly rent (₦)");
    fireEvent.change(rent, { target: { value: "900000" } });
    expect(await screen.findByText("₦1,035,000")).toBeInTheDocument(); // 900,000 + 135,000
    expect(screen.getByText("₦135,000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Save and continue/ }));
    expect(await screen.findByText(/At least 5 characters/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("Choose a category").length).toBeGreaterThanOrEqual(2)); // placeholder + error
  });
});
