import { Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/format";

export interface HouseCardData {
  id: string;
  title: string;
  location_text: string;
  city: string;
  annual_rent_kobo: number;
  house_status: string;
  house_media?: { url: string; kind: string; sort_order: number }[];
}

export const coverPhoto = (media: HouseCardData["house_media"]) =>
  [...(media ?? [])].filter((m) => m.kind === "photo").sort((a, b) => a.sort_order - b.sort_order)[0]?.url;

/** Photo with LOCATION and PRICE directly underneath (Phase 3 adds the link to the detail page). */
export default function HouseCard({ house }: { house: HouseCardData }) {
  const cover = coverPhoto(house.house_media);
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="aspect-[4/3] bg-muted relative">
        {cover ? (
          <img src={cover} alt={house.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Home className="w-10 h-10" />
          </div>
        )}
        {house.house_status === "under_renovation" && (
          <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500 text-white">
            Renovation in progress
          </Badge>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {house.location_text}, {house.city}
          </span>
        </p>
        <p className="text-lg font-bold text-primary">
          {formatNaira(house.annual_rent_kobo)}
          <span className="text-xs font-normal text-muted-foreground"> / year</span>
        </p>
        <p className="text-sm font-medium truncate">{house.title}</p>
      </div>
    </div>
  );
}
