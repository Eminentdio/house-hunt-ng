import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types/database";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

/** Platform settings (fee rate, video limits) from app_config. */
export function useAppConfig() {
  return useQuery({
    queryKey: ["app_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_config").select("key,value");
      if (error) throw error;
      const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
      return {
        feeRate: parseFloat(map.fee_rate ?? "0.15"),
        maxVideos: parseInt(map.max_videos ?? "3", 10),
        maxVideoSeconds: parseInt(map.max_video_seconds ?? "180", 10),
        maxVideoMb: parseInt(map.max_video_size_mb ?? "150", 10),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
