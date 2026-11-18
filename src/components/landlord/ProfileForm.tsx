import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, Loader2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { LandlordProfile } from "@/types/database";
import { BUCKETS, buildPath, compressImage, uploadFile } from "@/lib/media";
import { NIGERIAN_BANKS } from "@/lib/banks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";

export type VerificationState = "verified" | "rejected" | "incomplete" | "pending";

export function verificationState(lp: LandlordProfile | null | undefined): VerificationState {
  if (!lp) return "incomplete";
  if (lp.verified) return "verified";
  if (lp.rejection_reason) return "rejected";
  if (!lp.date_of_birth || !lp.id_document_url || !lp.bank_code || !lp.account_number_last4) return "incomplete";
  return "pending";
}

export function useLandlordProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["landlord_profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("landlord_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as LandlordProfile | null;
    },
  });
}

export function VerificationBanner({ lp }: { lp: LandlordProfile | null | undefined }) {
  const state = verificationState(lp);
  const qc = useQueryClient();
  const resubmit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("resubmit_verification");
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Sent for another review");
      qc.invalidateQueries({ queryKey: ["landlord_profile"] });
    },
    onError: (e: Error) => showError(e.message),
  });

  if (state === "verified")
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Verified landlord</AlertTitle>
        <AlertDescription>Your listings can now be approved and shown to tenants.</AlertDescription>
      </Alert>
    );
  if (state === "pending")
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle>Verification under review</AlertTitle>
        <AlertDescription>
          We are checking your ID. You can prepare listings meanwhile, but none go live until you are verified.
        </AlertDescription>
      </Alert>
    );
  if (state === "rejected")
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Verification was not approved</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Reason: {lp?.rejection_reason}</p>
          <p>Fix the details below, then ask for another review.</p>
          <Button size="sm" variant="outline" className="text-foreground" onClick={() => resubmit.mutate()} disabled={resubmit.isPending}>
            {resubmit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}I've fixed it - review again
          </Button>
        </AlertDescription>
      </Alert>
    );
  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle>Complete your profile to get verified</AlertTitle>
      <AlertDescription>Add your date of birth, a valid ID and your bank details. Listings only go live after verification.</AlertDescription>
    </Alert>
  );
}

export default function ProfileForm() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: lp, isLoading } = useLandlordProfile();

  const [dob, setDob] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (lp) {
      setDob(lp.date_of_birth ?? "");
      setBankCode(lp.bank_code ?? "");
      setAccountName(lp.bank_account_name ?? "");
    }
  }, [lp]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (dob) {
        const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000);
        if (age < 18) throw new Error("You must be at least 18 years old to list a property.");
        if (age > 110) throw new Error("Please check your date of birth.");
      }
      if (accountNumber && !/^\d{10}$/.test(accountNumber)) throw new Error("Account number must be exactly 10 digits.");
      if (accountNumber && (!bankCode || !accountName.trim())) throw new Error("Choose a bank and enter the account name.");

      const patch: Record<string, unknown> = {
        date_of_birth: dob || null,
        bank_code: bankCode || null,
        bank_account_name: accountName.trim() || null,
      };
      // We only keep the LAST 4 digits. The full number is verified at payout setup (Phase 4).
      if (accountNumber) patch.account_number_last4 = accountNumber.slice(-4);

      if (idFile) {
        if (idFile.size > 5 * 1024 * 1024 && !idFile.type.startsWith("image/")) throw new Error("ID file must be under 5 MB.");
        const file = await compressImage(idFile, 2000, 0.85);
        if (file.size > 5 * 1024 * 1024) throw new Error("ID file must be under 5 MB.");
        const path = buildPath(user.id, "id", file);
        await uploadFile(BUCKETS.docs, path, file, setProgress);
        patch.id_document_url = path; // a PATH in a private bucket, not a public URL
        if (lp?.id_document_url) {
          await supabase.storage.from(BUCKETS.docs).remove([lp.id_document_url]);
        }
      }

      const { error } = await supabase.from("landlord_profiles").update(patch).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Profile saved");
      setAccountNumber("");
      setIdFile(null);
      setProgress(null);
      qc.invalidateQueries({ queryKey: ["landlord_profile"] });
    },
    onError: (e: Error) => {
      setProgress(null);
      showError(e.message);
    },
  });

  if (isLoading) return <div className="h-40 skeleton-shimmer rounded-xl" />;

  return (
    <div className="space-y-4 max-w-2xl">
      <VerificationBanner lp={lp} />
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>Only our admin team can see these details. Tenants never see them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="idfile">Valid government ID (NIN slip, driver's licence, passport, voter's card)</Label>
            <Input id="idfile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">
              {lp?.id_document_url ? "An ID is on file. Upload a new one only to replace it." : "JPG, PNG or PDF, up to 5 MB. Make sure all text is readable."}
            </p>
            {progress !== null && <p className="text-xs text-primary">Uploading… {progress}%</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout bank account</CardTitle>
          <CardDescription>The full rent goes to this account after the tenant moves in. We store only the last 4 digits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your bank" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_BANKS.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acctname">Account name</Label>
            <Input id="acctname" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Exactly as on your bank account" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acctnum">Account number</Label>
            <Input
              id="acctnum"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder={lp?.account_number_last4 ? `Saved: ••••••${lp.account_number_last4} (type a new one to change)` : "10-digit NUBAN"}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full sm:w-auto">
        {save.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        Save profile
      </Button>
    </div>
  );
}
