import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface ResetChangesModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetChangesModal({
  open,
  onClose,
  onConfirm,
}: ResetChangesModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle className="text-lg font-semibold">
              Discard all changes?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            This reverts every change — text, reordering, and images — back to
            how it was when you opened it. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
