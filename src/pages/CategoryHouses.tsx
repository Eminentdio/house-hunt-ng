import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/hooks/useCatalog";
import PublicShell from "@/components/PublicShell";
import HouseCard from "@/components/HouseCard";

export default function CategoryHouses() {
  const { slug } = useParams();
  const { data: categories, isLoading: loadingCats, isError: categoriesError } = useCategories();
  const category = categories?.find((c) => c.slug === slug);

  const { data: houses, isLoading } = useQuery({
    queryKey: ["category_houses", category?.id],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("houses")
        .select("id,title,location_text,city,annual_rent_kobo,house_status,house_media(url,kind,sort_order)")
        .eq("category_id", category!.id)
        .eq("approval_status", "approved")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <PublicShell>
      <Link to="/categories" className="text-sm text-muted-foreground hover:text-primary">← All categories</Link>
      {categoriesError && !categories ? (
        <p role="alert" className="py-10 text-center text-destructive">
          We couldn't load categories. Please try again later.
        </p>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight mt-1 mb-6">{category?.name ?? (loadingCats ? "" : "Category not found")}</h1>
          {(isLoading || loadingCats) && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-60 skeleton-shimmer rounded-xl" />)}</div>}
        </>
      )}
      {!isLoading && category && houses?.length === 0 && <p className="text-muted-foreground py-10 text-center">No houses in this category yet. Check back soon.</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {houses?.map((h) => <HouseCard key={h.id} house={h} />)}
      </div>
    </PublicShell>
  );
}
