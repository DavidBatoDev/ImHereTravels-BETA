"use client";

import { useState } from "react";
import { Lock, Unlock, RefreshCw, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TourPackage, TourFormDataWithStringDates } from "@/types/tours";
import { HostedTour } from "@/types/hosted-tours";
import TourForm from "./TourForm";
import { toggleLock, syncFromParent } from "@/services/hosted-tours-service";

interface HostedTourFormProps {
  isOpen: boolean;
  onClose: () => void;
  hostedTour: HostedTour | null;
  onSubmit: (data: TourFormDataWithStringDates) => Promise<void | string>;
  onSynced?: () => void;
  onLockToggled?: (newLocked: boolean) => void;
  isLoading?: boolean;
}

/**
 * Maps a HostedTour to the TourPackage shape that TourForm expects.
 * Stubs out parent-only fields (pricingHistory, currentVersion, bookingsCount).
 */
function toTourPackage(hostedTour: HostedTour): TourPackage {
  return {
    id: hostedTour.id,
    name: hostedTour.name,
    slug: hostedTour.slug,
    url: hostedTour.url,
    tourCode: hostedTour.tourCode,
    description: hostedTour.description,
    location: hostedTour.location,
    duration: hostedTour.duration,
    travelDates: hostedTour.travelDates,
    pricing: hostedTour.pricing,
    details: hostedTour.details,
    media: hostedTour.media,
    status: hostedTour.status,
    brochureLink: hostedTour.brochureLink,
    stripePaymentLink: hostedTour.stripePaymentLink,
    preDeparturePack: hostedTour.preDeparturePack,
    pricingHistory: [],
    currentVersion: 0,
    metadata: {
      createdAt: hostedTour.metadata.createdAt,
      updatedAt: hostedTour.metadata.updatedAt,
      createdBy: hostedTour.metadata.createdBy,
      bookingsCount: 0,
    },
  };
}

export default function HostedTourForm({
  isOpen,
  onClose,
  hostedTour,
  onSubmit,
  onSynced,
  onLockToggled,
  isLoading,
}: HostedTourFormProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);

  const tourPackage = hostedTour ? toTourPackage(hostedTour) : null;

  async function handleSyncFromParent() {
    if (!hostedTour) return;
    setIsSyncing(true);
    try {
      await syncFromParent(hostedTour.id);
      toast({ title: "Synced", description: "Changes pulled from parent tour." });
      onSynced?.();
      onClose();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync from parent.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  function handleSyncClick() {
    setIsSyncConfirmOpen(true);
  }

  async function handleToggleLock() {
    if (!hostedTour) return;
    const newLocked = !hostedTour.isLocked;
    setIsTogglingLock(true);
    try {
      await toggleLock(hostedTour.id, newLocked);
      toast({
        title: newLocked ? "Tour locked" : "Tour unlocked",
        description: newLocked
          ? "Sync from parent tour is now prevented."
          : "Sync from parent tour is now allowed.",
      });
      onLockToggled?.(newLocked);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update lock.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingLock(false);
    }
  }

  return (
    <>
      <TourForm
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={onSubmit}
        tour={tourPackage}
        isLoading={isLoading}
        sidebarExtra={hostedTour ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-royal-purple/20 bg-muted/30 p-2">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wide mb-1">
                <GitBranch className="h-3 w-3" />
                Parent Tour
              </div>
              <p className="text-xs text-foreground truncate" title={hostedTour.parentTourName}>
                {hostedTour.parentTourName}
              </p>
            </div>

            {!hostedTour.isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncClick}
                disabled={isSyncing}
                className="w-full justify-start text-xs border-royal-purple/30 text-royal-purple hover:bg-royal-purple/10"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync from Parent"}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleLock}
              disabled={isTogglingLock}
              title={hostedTour.isLocked ? "Unlock - allow sync" : "Lock - prevent sync"}
              className={`w-full justify-start text-xs ${
                hostedTour.isLocked
                  ? "border-crimson-red/40 text-crimson-red hover:bg-crimson-red/10"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {hostedTour.isLocked ? (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  Unlocked
                </>
              )}
            </Button>
          </div>
        ) : undefined}
      />

      <AlertDialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
        <AlertDialogContent className="border border-royal-purple/20 dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Sync from Parent Tour?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current data in &quot;{hostedTour?.name}&quot; with the latest content from &quot;{hostedTour?.parentTourName}&quot;. Your custom changes to this hosted tour will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSyncFromParent}
              className="bg-royal-purple text-white hover:bg-royal-purple/90"
            >
              Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
