import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut } from "lucide-react";

interface ConfirmLeaveModalProps {
  open: boolean;
  /** Stay on the page (keep editing). */
  onClose: () => void;
  /** Leave, discarding unsaved changes. */
  onConfirm: () => void;
}

/**
 * Shown when the user tries to navigate away from an editor with unsaved
 * changes. "Keep editing" stays put; "Leave without saving" proceeds.
 */
export default function ConfirmLeaveModal({
  open,
  onClose,
  onConfirm,
}: ConfirmLeaveModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle className="text-lg font-semibold">
              Leave without saving?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            You have unsaved changes. If you leave now, your edits will be lost.
            Save first, or leave to discard them.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep editing
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="gap-2">
            <LogOut className="h-4 w-4" />
            Leave without saving
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
