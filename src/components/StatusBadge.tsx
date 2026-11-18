import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  pending_review: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  processing: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  approved: "bg-green-100 text-green-800 hover:bg-green-100",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
};
const LABELS: Record<string, string> = {
  pending: "Pending review",
  pending_review: "Pending review",
  processing: "Processing",
  approved: "Approved",
  rejected: "Rejected",
};

export default function StatusBadge({ status }: { status: string }) {
  return <Badge className={STYLES[status] ?? ""}>{LABELS[status] ?? status}</Badge>;
}
