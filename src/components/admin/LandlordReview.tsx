import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BUCKETS, signedUrl } from "@/lib/media";
import { NIGERIAN_BANKS } from "@/lib/banks";
import { verificationState, VerificationState } from "@/components/landlord/ProfileForm";
import RejectDialog from "@/components/admin/RejectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showError, showSuccess } from "@/utils/toast";

const LABEL: Record<VerificationState, string> = {
  pending: "Needs review", verified: "Verified", rejected: "Rejected", incomplete: "Incomplete",
};

export function useLandlordApplications() {
  return useQuery({
    queryKey: ["admin_landlords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landlord_profiles")
        .select("*, profiles(full_name, username, email, phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export default function LandlordReview() {
  const qc = useQueryClient();
  const { data, isLoading } = useLandlordApplications();
  const [filter, setFilter] = useState<VerificationState>("pending");
  const [rejecting, setRejecting] = useState<any | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin_landlords"] });

  const decide = useMutation({
    mutationFn: async ({ id, verified, reason }: { id: string; verified: boolean; reason: string | null }) => {
      const { error } = await supabase.from("landlord_profiles").update({ verified, rejection_reason: reason }).eq("user_id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      showSuccess(v.verified ? "Landlord verified" : "Landlord rejected");
      setRejecting(null);
      refresh();
    },
    onError: (e: Error) => showError(e.message),
  });

  const openId = async (path: string) => {
    try {
      window.open(await signedUrl(BUCKETS.docs, path, 300), "_blank", "noopener");
    } catch (e) {
      showError((e as Error).message);
    }
  };

  const groups = (data ?? []).map((lp) => ({ lp, state: verificationState(lp) }));
  const count = (s: VerificationState) => groups.filter((g) => g.state === s).length;
  const shown = groups.filter((g) => g.state === filter);

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as VerificationState)}>
        <TabsList className="flex-wrap h-auto">
          {(["pending", "verified", "rejected", "incomplete"] as VerificationState[]).map((s) => (
            <TabsTrigger key={s} value={s}>{LABEL[s]} ({count(s)})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <div className="h-24 skeleton-shimmer rounded-xl" />}
      {!isLoading && shown.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing here.</p>}

      <div className="grid gap-3">
        {shown.map(({ lp, state }) => {
          const p = Array.isArray(lp.profiles) ? lp.profiles[0] : lp.profiles;
          const bank = NIGERIAN_BANKS.find((b) => b.code === lp.bank_code)?.name ?? lp.bank_code;
          return (
            <div key={lp.user_id} className="rounded-xl border bg-background p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{p?.full_name} <span className="text-muted-foreground font-normal">@{p?.username}</span></p>
                  <p className="text-sm text-muted-foreground">{p?.email} · {p?.phone}</p>
                </div>
                <Badge variant={state === "verified" ? "default" : "secondary"}>{LABEL[state]}</Badge>
              </div>
              <dl className="grid sm:grid-cols-3 gap-2 text-sm">
                <div><dt className="text-muted-foreground">Date of birth</dt><dd>{lp.date_of_birth ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Bank</dt><dd>{bank ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Account</dt><dd>{lp.bank_account_name ?? "—"} {lp.account_number_last4 && `(••••${lp.account_number_last4})`}</dd></div>
              </dl>
              {lp.rejection_reason && <p className="text-sm text-destructive">Rejected: {lp.rejection_reason}</p>}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!lp.id_document_url} onClick={() => openId(lp.id_document_url)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />View ID
                </Button>
                {state !== "verified" && (
                  <Button size="sm" disabled={decide.isPending || state === "incomplete"} onClick={() => decide.mutate({ id: lp.user_id, verified: true, reason: null })}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Approve
                  </Button>
                )}
                {state !== "rejected" && (
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejecting(lp)}>
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />{state === "verified" ? "Revoke" : "Reject"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <RejectDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Reject this landlord"
        busy={decide.isPending}
        onConfirm={(reason) => decide.mutate({ id: rejecting.user_id, verified: false, reason })}
      />
    </div>
  );
}
