import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/hooks/useCatalog";
import PublicShell from "@/components/PublicShell";

export default function Categories() {
  const { data: categories, isLoading, isError } = useCategories();

  // One cheap query: every approved, available house (id + category) to count per category
  const { data: counts } = useQuery({
    queryKey: ["category_counts"],
    queryFn: async () => {
      // Explicit filters: a logged-in landlord/admin can also read their own non-public rows
      const { data, error } = await supabase
        .from("houses")
        .select("category_id")
        .eq("approval_status", "approved")
        .eq("is_available", true);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((h) => { map[h.category_id] = (map[h.category_id] ?? 0) + 1; });
      return map;
    },
  });

  return (
    <PublicShell>
      <h1 className="text-3xl font-bold tracking-tight">Browse by category</h1>
      <p className="text-muted-foreground mt-1 mb-6">Verified houses from landlords directly. No agents.</p>
      {isError && !categories ? (
        <p role="alert" className="py-10 text-center text-destructive">
          We couldn't load categories. Please try again later.
        </p>
      ) : (
        <>
          {isLoading && <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-40 skeleton-shimmer rounded-xl" />)}</div>}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {categories?.map((c) => (
              <Link key={c.id} to={`/categories/${c.slug}`} className="group rounded-xl border bg-card overflow-hidden hover:border-primary hover:shadow-md transition-all">
                <div className="h-28 sm:h-36 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center overflow-hidden">
                  {c.cover_image_url ? <img src={c.cover_image_url} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Building2 className="w-10 h-10 text-brand-600" />}
                </div>
                <div className="p-3 sm:p-4">
                  <p className="font-semibold group-hover:text-primary">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{counts?.[c.id] ?? 0} available</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </PublicShell>
  );
}
