import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig, useCategories } from "@/hooks/useCatalog";
import { feeKobo, formatNaira, koboToNaira, nairaToKobo } from "@/lib/format";
import { House } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";

const optionalCoord = (min: number, max: number, name: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), `${name} must be between ${min} and ${max}`);

const schema = z.object({
  title: z.string().trim().min(5, "At least 5 characters").max(100, "Keep it under 100 characters"),
  description: z.string().trim().min(20, "Describe the property (at least 20 characters)").max(2000),
  category_id: z.string().min(1, "Choose a category"),
  location_text: z.string().trim().min(5, "Enter the street and area").max(150),
  city: z.string().trim().min(2, "Enter the city").max(60),
  lat: optionalCoord(-90, 90, "Latitude"),
  lng: optionalCoord(-180, 180, "Longitude"),
  vacant_space: z.number({ invalid_type_error: "Enter a number" }).int("Whole numbers only").min(0).max(1000),
  house_status: z.enum(["available", "rented", "under_renovation"]),
  rent_naira: z.number({ invalid_type_error: "Enter the yearly rent" }).min(10000, "Minimum is ₦10,000").max(1_000_000_000),
  tenancy_period_months: z.number().int().min(1).max(60),
  is_available: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const CITIES = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Kano", "Ilorin", "Abeokuta", "Benin City", "Enugu", "Kaduna"];

export default function HouseDetailsForm({ house }: { house?: House }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const { data: config } = useAppConfig();

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", description: "", category_id: "", location_text: "", city: "Lagos", lat: "", lng: "",
      vacant_space: 1, house_status: "available", rent_naira: undefined as unknown as number,
      tenancy_period_months: 12, is_available: true,
    },
  });

  useEffect(() => {
    if (house) {
      reset({
        title: house.title, description: house.description, category_id: house.category_id,
        location_text: house.location_text, city: house.city,
        lat: house.lat?.toString() ?? "", lng: house.lng?.toString() ?? "",
        vacant_space: house.vacant_space, house_status: house.house_status,
        rent_naira: koboToNaira(house.annual_rent_kobo), tenancy_period_months: house.tenancy_period_months,
        is_available: house.is_available,
      });
    }
  }, [house, reset]);

  const rent = watch("rent_naira");
  const rentKobo = Number.isFinite(rent) ? nairaToKobo(rent) : 0;
  const rate = config?.feeRate ?? 0.15;

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const category = categories?.find((c) => c.id === v.category_id);
      const row = {
        title: v.title, description: v.description, category_id: v.category_id,
        house_type: category?.slug ?? "other",
        location_text: v.location_text, city: v.city,
        lat: v.lat === "" ? null : Number(v.lat), lng: v.lng === "" ? null : Number(v.lng),
        vacant_space: v.vacant_space, house_status: v.house_status,
        annual_rent_kobo: nairaToKobo(v.rent_naira), tenancy_period_months: v.tenancy_period_months,
        is_available: v.is_available,
      };
      if (house) {
        const { data, error } = await supabase.from("houses").update(row).eq("id", house.id).select().single();
        if (error) throw error;
        return { data: data as House, created: false };
      }
      const { data, error } = await supabase.from("houses").insert({ ...row, landlord_id: user!.id }).select().single();
      if (error) throw error;
      return { data: data as House, created: true };
    },
    onSuccess: ({ data, created }) => {
      qc.invalidateQueries({ queryKey: ["my_houses"] });
      qc.invalidateQueries({ queryKey: ["house", data.id] });
      if (created) {
        showSuccess("Saved. Now add photos and videos.");
        navigate(`/landlord/houses/${data.id}?tab=media`, { replace: true });
      } else if (house?.approval_status === "approved" && data.approval_status === "pending") {
        showSuccess("Saved. Because price/location changed, the listing is back in review.");
      } else {
        showSuccess("Changes saved");
      }
    },
    onError: (e: Error) => showError(e.message),
  });

  const field = (label: string, id: keyof FormValues, node: React.ReactNode, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {node}
      {hint && !errors[id] && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors[id] && <p className="text-xs text-destructive">{errors[id]?.message as string}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5 max-w-2xl">
      <div className="rounded-xl border bg-background p-4 sm:p-6 space-y-4">
        {field("Listing title", "title", <Input id="title" placeholder="e.g. Clean 2 Bedroom Flat in Yaba" {...register("title")} />)}
        {field("Category", "category_id",
          <Select value={watch("category_id")} onValueChange={(v) => setValue("category_id", v, { shouldValidate: true })}>
            <SelectTrigger id="category_id"><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>{categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {field("Description", "description", <Textarea id="description" rows={5} placeholder="Water, light, security, parking, nearby landmarks, what is included…" {...register("description")} />)}
        <div className="grid sm:grid-cols-2 gap-4">
          {field("Street / area", "location_text", <Input id="location_text" placeholder="12 Herbert Macaulay Way, Yaba" {...register("location_text")} />)}
          {field("City", "city", <Input id="city" list="cities" {...register("city")} />)}
          <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("Latitude (optional)", "lat", <Input id="lat" inputMode="decimal" placeholder="6.5244" {...register("lat")} />, "Right-click the spot in Google Maps and copy the coordinates")}
          {field("Longitude (optional)", "lng", <Input id="lng" inputMode="decimal" placeholder="3.3792" {...register("lng")} />)}
        </div>
      </div>

      <div className="rounded-xl border bg-background p-4 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {field("Yearly rent (₦)", "rent_naira", <Input id="rent_naira" type="number" inputMode="numeric" min={0} step="1000" placeholder="900000" {...register("rent_naira", { valueAsNumber: true })} />, "The amount you receive. You are paid 100% of this.")}
          {field("Vacant units / rooms", "vacant_space", <Input id="vacant_space" type="number" min={0} {...register("vacant_space", { valueAsNumber: true })} />, "How many are available to rent now")}
          {field("Tenancy period", "tenancy_period_months",
            <Select value={String(watch("tenancy_period_months"))} onValueChange={(v) => setValue("tenancy_period_months", Number(v))}>
              <SelectTrigger id="tenancy_period_months"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[6, 12, 24, 36].map((m) => <SelectItem key={m} value={String(m)}>{m} months</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {field("House status", "house_status",
            <Select value={watch("house_status")} onValueChange={(v) => setValue("house_status", v as FormValues["house_status"])}>
              <SelectTrigger id="house_status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Ready to move in</SelectItem>
                <SelectItem value="under_renovation">Under renovation</SelectItem>
                <SelectItem value="rented">Already rented</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {rentKobo > 0 && (
          <div className="rounded-lg bg-accent/60 p-3 text-sm space-y-1">
            <p className="font-medium">What the tenant will see</p>
            <div className="flex justify-between"><span>Yearly rent (to you)</span><span>{formatNaira(rentKobo)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Platform fee ({Math.round(rate * 100)}%, paid by tenant)</span><span>{formatNaira(feeKobo(rentKobo, rate))}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1"><span>Tenant pays</span><span>{formatNaira(rentKobo + feeKobo(rentKobo, rate))}</span></div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="is_available">Show this listing to tenants</Label>
            <p className="text-xs text-muted-foreground">Turn off to hide it temporarily without deleting.</p>
          </div>
          <Switch id="is_available" checked={watch("is_available")} onCheckedChange={(v) => setValue("is_available", v)} />
        </div>
        {house?.approval_status === "approved" && (
          <p className="text-xs text-amber-700">Changing the price, location, city or category of an approved listing sends it back for re-approval.</p>
        )}
      </div>

      <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {house ? "Save changes" : "Save and continue to photos"}
      </Button>
    </form>
  );
}
