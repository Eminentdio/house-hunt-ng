export type Role = "tenant" | "landlord" | "admin";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  created_at: string;
}

export interface LandlordProfile {
  user_id: string;
  date_of_birth: string | null;
  id_document_url: string | null;
  bank_account_name: string | null;
  bank_code: string | null;
  account_number_last4: string | null;
  paystack_recipient_code: string | null;
  verified: boolean;
}

export interface House {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  house_type: string;
  category_id: string;
  location_text: string;
  city: string;
  lat: number | null;
  lng: number | null;
  vacant_space: number;
  house_status: "available" | "rented" | "under_renovation";
  annual_rent_kobo: number;
  tenancy_period_months: number;
  is_available: boolean;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string | null;
}

export interface HouseMedia {
  id: string;
  house_id: string;
  kind: "photo" | "tour360";
  room_label: string;
  url: string;
  sort_order: number;
}

export interface HouseVideo {
  id: string;
  house_id: string;
  area_label: string;
  duration_sec: number | null;
  size_bytes: number | null;
  status: "processing" | "pending_review" | "approved" | "rejected";
  url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
}

export interface Inspection {
  id: string;
  house_id: string;
  tenant_id: string;
  requested_at: string;
  scheduled_at: string | null;
  status: string;
}

export interface Agreement {
  id: string;
  house_id: string;
  tenant_id: string;
  terms_snapshot: string;
  tenant_signed_name: string | null;
  signed_at: string | null;
  pdf_path: string | null;
}

export interface Payment {
  id: string;
  agreement_id: string;
  rent_kobo: number;
  fee_kobo: number;
  total_kobo: number;
  fee_rate: number;
  paystack_reference: string | null;
  status: "pending" | "paid" | "held" | "released" | "refunded" | "failed";
  paid_at: string | null;
  escrow_released_at: string | null;
  payout_reference: string | null;
  receipt_pdf_path: string | null;
}

export interface RenovationUpdate {
  id: string;
  house_id: string;
  area: "house" | "room" | "apartment";
  area_label: string;
  percent_complete: number;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  sent_at: string | null;
  status: string;
}

export interface AppConfig {
  key: string;
  value: string;
}