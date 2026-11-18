import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Asks the admin for a reason. The landlord sees this text, so it should say how to fix the problem. */
export default function RejectDialog({
  open, onOpenChange, title, onConfirm, busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setReason(""); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>The landlord will see this reason. Say clearly what to fix.</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The ID photo is blurry. Please upload a clear photo of the whole card." />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={reason.trim().length < 5 || busy} onClick={() => onConfirm(reason.trim())}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
