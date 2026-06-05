"use client";

import { UseFormReturn } from "react-hook-form";
import { CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TravelDatesEditor from "./TravelDatesEditor";

interface TravelDatesModalProps {
  open: boolean;
  onClose: () => void;
  form: UseFormReturn<any>;
}

export default function TravelDatesModal({ open, onClose, form }: TravelDatesModalProps) {
  const dates = (form.watch("travelDates") as any[]) ?? [];
  const activeCount = dates.filter((d) => d?.isAvailable !== false).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="space-y-1 border-b border-light-grey px-6 py-5">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-midnight">
            <span className="grid size-9 place-items-center rounded-xl bg-crimson-red/10 text-crimson-red">
              <CalendarDays className="h-5 w-5" />
            </span>
            Tour Dates
          </DialogTitle>
          <DialogDescription className="pl-[2.875rem] text-sm text-dark-gray">
            Add the available travel windows for this tour. Inactive dates stay hidden on the site.
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-light-grey/30 px-6 py-5">
          <TravelDatesEditor form={form} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-light-grey bg-white px-6 py-4">
          <p className="text-sm text-dark-gray">
            <span className="font-semibold text-midnight">{dates.length}</span>{" "}
            date{dates.length === 1 ? "" : "s"}
            <span className="text-dark-gray/50"> · </span>
            <span className="font-semibold text-emerald-600">{activeCount}</span> active
          </p>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-full bg-crimson-red px-6 font-bold text-white hover:bg-light-red"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
