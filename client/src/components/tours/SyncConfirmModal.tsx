"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  HostedTour,
  ChangeLogEntry,
  SyncResult,
  SyncableField,
  getSyncFieldForChange,
  getSyncableFieldsFromChanges,
} from "@/types/hosted-tours";

interface SyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentTourName: string;
  hostedTours: HostedTour[];
  changes: ChangeLogEntry[];
  onSync: (selectedFields: SyncableField[]) => Promise<SyncResult>;
  onSkip: () => void;
}

const ARRAY_FIELDS = new Set([
  "travelDates",
  "travelDates.missingInHosted",
  "details.highlights",
  "details.itinerary",
  "details.requirements",
  "media.gallery",
]);

function formatValue(field: string, value: unknown): string {
  if (ARRAY_FIELDS.has(field)) {
    const arr = Array.isArray(value) ? value : [];
    return `${arr.length} item${arr.length !== 1 ? "s" : ""}`;
  }
  if (value === null || value === undefined || value === "") return "(empty)";
  if (field === "media.coverImage") {
    const str = String(value);
    return str.length > 40 ? `...${str.slice(-40)}` : str;
  }
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function isCoverImageField(field: string) {
  return field === "media.coverImage";
}

export default function SyncConfirmModal({
  isOpen,
  onClose,
  parentTourName,
  hostedTours,
  changes,
  onSync,
  onSkip,
}: SyncConfirmModalProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSyncFields, setSelectedSyncFields] = useState<
    Set<SyncableField>
  >(new Set());

  const unlockedTours = hostedTours.filter((t) => !t.isLocked);
  const allLocked = unlockedTours.length === 0;
  const selectableChanges = useMemo(
    () => changes.filter((change) => !!getSyncFieldForChange(change)),
    [changes],
  );
  const availableSyncFields = useMemo(
    () => getSyncableFieldsFromChanges(selectableChanges),
    [selectableChanges],
  );
  const defaultSelectedSyncFields = useMemo(() => {
    const defaults = new Set<SyncableField>();
    selectableChanges.forEach((change) => {
      const syncField = getSyncFieldForChange(change);
      if (!syncField) return;
      // Missing-date rows are informational suggestions and must be explicitly opted in.
      if (change.field === "travelDates.missingInHosted") return;
      defaults.add(syncField);
    });
    return Array.from(defaults);
  }, [selectableChanges]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSyncFields(new Set(defaultSelectedSyncFields));
  }, [isOpen, defaultSelectedSyncFields]);

  function setFieldSelection(syncField: SyncableField, checked: boolean) {
    setSelectedSyncFields((prev) => {
      const next = new Set(prev);
      if (checked) next.add(syncField);
      else next.delete(syncField);
      return next;
    });
  }

  async function handleSync() {
    if (selectedSyncFields.size === 0) {
      toast({
        title: "No changes selected",
        description: "Select at least one change to sync.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await onSync(Array.from(selectedSyncFields));
      const parts: string[] = [];
      if (result.synced.length > 0) parts.push(`${result.synced.length} synced`);
      if (result.skipped.length > 0) {
        parts.push(`${result.skipped.length} skipped (locked)`);
      }
      if (result.errors.length > 0) parts.push(`${result.errors.length} failed`);
      toast({
        title: "Sync complete",
        description: parts.join(", "),
        variant: result.errors.length > 0 ? "destructive" : "default",
      });
    } catch {
      toast({
        title: "Sync failed",
        description: "An error occurred while syncing hosted tours.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      onClose();
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSyncing) onClose();
      }}
    >
      <DialogContent className="max-w-xl border border-royal-purple/20 dark:border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-hk-grotesk">
            <RefreshCw className="h-5 w-5 text-royal-purple" />
            Sync Changes to Hosted Tours?
          </DialogTitle>
          <DialogDescription>
            You updated{" "}
            <span className="font-medium text-foreground">{parentTourName}</span>.
            Choose which changes to sync to attached hosted tours.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-1">
          <div className="space-y-5 py-1">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  What changed ({selectableChanges.length} field
                  {selectableChanges.length !== 1 ? "s" : ""})
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSyncing || allLocked}
                    className="h-7 px-2 text-xs"
                    onClick={() => setSelectedSyncFields(new Set(availableSyncFields))}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSyncing || allLocked}
                    className="h-7 px-2 text-xs"
                    onClick={() => setSelectedSyncFields(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-royal-purple/10 divide-y divide-border overflow-hidden">
                {selectableChanges.map((entry, index) => {
                  const syncField = getSyncFieldForChange(entry);
                  if (!syncField) return null;
                  const checked = selectedSyncFields.has(syncField);

                  return (
                    <div
                      key={`${entry.field}-${index}`}
                      className="flex items-start gap-3 px-3 py-2.5 bg-card text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          setFieldSelection(syncField, next === true)
                        }
                        disabled={isSyncing || allLocked}
                        className="mt-1"
                        aria-label={`Select ${entry.label}`}
                      />
                      <span className="font-medium text-foreground w-40 flex-shrink-0 pt-px">
                        {entry.label}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        {isCoverImageField(entry.field) ? (
                          <>
                            {entry.oldValue ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={String(entry.oldValue)}
                                alt="old cover"
                                className="h-8 w-12 object-cover rounded border opacity-60"
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">(none)</span>
                            )}
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            {entry.newValue ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={String(entry.newValue)}
                                alt="new cover"
                                className="h-8 w-12 object-cover rounded border"
                              />
                            ) : (
                              <span className="text-muted-foreground text-xs">(none)</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground line-through text-xs flex-shrink-0">
                              {formatValue(entry.field, entry.oldValue)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-spring-green font-medium text-xs">
                              {formatValue(entry.field, entry.newValue)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator className="border-border/50" />

            <div>
              <p className="text-sm font-semibold text-foreground mb-2">
                Attached Hosted Tours ({hostedTours.length})
              </p>
              <div className="space-y-2">
                {hostedTours.map((tour) => (
                  <div
                    key={tour.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                      tour.isLocked
                        ? "border-border/40 bg-muted/30 opacity-60"
                        : "border-royal-purple/15 bg-card"
                    }`}
                  >
                    <span className="font-medium text-foreground truncate">
                      {tour.name}
                    </span>
                    {tour.isLocked ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Lock className="h-3 w-3 text-crimson-red" />
                        <span className="text-xs text-muted-foreground">(skipped - locked)</span>
                      </div>
                    ) : (
                      <Badge className="bg-spring-green/15 text-spring-green border border-spring-green/25 text-xs flex-shrink-0">
                        Will sync
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {allLocked && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-sunglow-yellow/30 bg-sunglow-yellow/10 px-3 py-2 text-sm text-vivid-orange">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  All attached tours are locked - nothing will be synced.
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isSyncing}
            className="border border-border"
          >
            Skip Sync
          </Button>
          {allLocked ? (
            <Button onClick={onClose} className="bg-primary text-white hover:bg-primary/90">
              Close
            </Button>
          ) : (
            <Button
              onClick={handleSync}
              disabled={isSyncing || selectedSyncFields.size === 0}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync {selectedSyncFields.size} Change
                  {selectedSyncFields.size !== 1 ? "s" : ""} to{" "}
                  {unlockedTours.length} Tour{unlockedTours.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
