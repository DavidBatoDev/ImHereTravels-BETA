"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  Timestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Booking } from "@/types/bookings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Pencil, Save, X, Play } from "lucide-react";
import ScheduledEmailService from "@/services/scheduled-email-service";

type TermKey = "p1" | "p2" | "p3" | "p4";

interface LateFeeRow {
  rowId: string;
  bookingDocId: string;
  bookingCode: string;
  fullName: string;
  emailAddress: string;
  tourPackageName: string;
  term: string;
  termKey: TermKey;
  dueDate: Date | null;
  amount: number;
  penalty: number;
  remainingBalance: number;
  daysOverdue: number;
  hasOverdueUnpaid: boolean;
  noticeStatus: "sent" | "none";
  noticeLink?: string;
}

const TERM_KEYS: TermKey[] = ["p1", "p2", "p3", "p4"];

function asDate(value: any): Date | null {
  if (!value) return null;

  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const parsed = value.toDate();
      return parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : null;
    }

    if (typeof value.seconds === "number") {
      const parsed = new Date(value.seconds * 1000);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof value._seconds === "number") {
      const parsed = new Date(value._seconds * 1000);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

function parseTermDueDate(dueDateRaw: any, termIndex: number): Date | null {
  if (!dueDateRaw) return null;

  if (typeof dueDateRaw === "string" && dueDateRaw.includes(",")) {
    const parts = dueDateRaw.split(",").map((part) => part.trim());
    const partStart = termIndex * 2;
    const partEnd = partStart + 1;

    if (parts.length > partEnd) {
      return asDate(`${parts[partStart]}, ${parts[partEnd]}`);
    }
  }

  return asDate(dueDateRaw);
}

function formatGBP(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value || 0);
}

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return value.toLocaleDateString("en-GB", { timeZone: "Asia/Manila" });
}

export default function LateFeesSection() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [draftEffectiveDate, setDraftEffectiveDate] = useState("");
  const [isEditingEffectiveDate, setIsEditingEffectiveDate] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isProcessingNow, setIsProcessingNow] = useState(false);

  useEffect(() => {
    const lateFeesConfigRef = doc(db, "config", "late-fees");
    const unsubscribe = onSnapshot(
      lateFeesConfigRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const config = snapshot.data();
        const parsedDate = asDate(config.effectiveDate);
        if (parsedDate) {
          const isoDate = parsedDate.toISOString().slice(0, 10);
          setEffectiveDate(isoDate);
          if (!isEditingEffectiveDate) {
            setDraftEffectiveDate(isoDate);
          }
        }
      },
      (error) => {
        console.error("Failed to load late-fees config", error);
      },
    );

    return () => unsubscribe();
  }, [isEditingEffectiveDate]);

  useEffect(() => {
    const bookingsQuery = query(collection(db, "bookings"));
    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const nextBookings = snapshot.docs.map((bookingDoc) => ({
          id: bookingDoc.id,
          ...bookingDoc.data(),
        })) as Booking[];
        nextBookings.sort((a, b) => {
          const aDate = asDate((a as any).reservationDate)?.getTime() || 0;
          const bDate = asDate((b as any).reservationDate)?.getTime() || 0;
          return bDate - aDate;
        });
        setBookings(nextBookings);
      },
      (error) => {
        console.error("Failed to load bookings for late fees tab", error);
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive",
        });
      },
    );

    return () => unsubscribe();
  }, []);

  const rows = useMemo(() => {
    const now = new Date();
    const expandedRows: LateFeeRow[] = [];

    for (const booking of bookings) {
      for (let index = 0; index < TERM_KEYS.length; index++) {
        const termKey = TERM_KEYS[index];
        const termLabel = termKey.toUpperCase();
        const dueDate = parseTermDueDate(
          (booking as any)[`${termKey}DueDate`],
          index,
        );
        const amount = Number((booking as any)[`${termKey}Amount`] || 0);
        const datePaid = asDate((booking as any)[`${termKey}DatePaid`]);
        const penalty = Number(
          (booking as any)[`${termKey}LateFeesPenalty`] || 0,
        );
        const noticeLink = String(
          (booking as any)[`${termKey}LateFeesNoticeLink`] || "",
        );

        const hasOverdueUnpaid =
          !!dueDate && !datePaid && dueDate.getTime() < now.getTime();

        const hasHistory = penalty > 0 || !!noticeLink;
        if (!hasOverdueUnpaid && !hasHistory) {
          continue;
        }

        const daysOverdue = dueDate
          ? Math.max(
              0,
              Math.floor(
                (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
              ),
            )
          : 0;

        expandedRows.push({
          rowId: `${booking.id}-${termKey}`,
          bookingDocId: booking.id,
          bookingCode: booking.bookingId || booking.bookingCode || booking.id,
          fullName: booking.fullName || "",
          emailAddress: booking.emailAddress || "",
          tourPackageName: booking.tourPackageName || "",
          term: termLabel,
          termKey,
          dueDate,
          amount,
          penalty,
          remainingBalance: Number(booking.remainingBalance || 0),
          daysOverdue,
          hasOverdueUnpaid,
          noticeStatus: noticeLink ? "sent" : "none",
          noticeLink,
        });
      }
    }

    return expandedRows
      .sort((a, b) => {
        if (a.hasOverdueUnpaid !== b.hasOverdueUnpaid) {
          return a.hasOverdueUnpaid ? -1 : 1;
        }
        return b.daysOverdue - a.daysOverdue;
      })
      .filter((row) => {
        if (!searchTerm.trim()) return true;
        const haystack = [
          row.bookingCode,
          row.fullName,
          row.emailAddress,
          row.tourPackageName,
          row.term,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchTerm.toLowerCase());
      });
  }, [bookings, searchTerm]);

  const handleSaveEffectiveDate = async () => {
    if (!draftEffectiveDate) {
      toast({
        title: "Missing date",
        description: "Please select an effective date.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingConfig(true);
    try {
      const selectedDate = new Date(`${draftEffectiveDate}T00:00:00`);

      await setDoc(
        doc(db, "config", "late-fees"),
        {
          effectiveDate: Timestamp.fromDate(selectedDate),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );

      toast({
        title: "Saved",
        description: "Late-fees effective date updated.",
      });
      setEffectiveDate(draftEffectiveDate);
      setIsEditingEffectiveDate(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update late-fees effective date.",
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleStartEditEffectiveDate = () => {
    setDraftEffectiveDate(effectiveDate);
    setIsEditingEffectiveDate(true);
  };

  const handleCancelEditEffectiveDate = () => {
    setDraftEffectiveDate(effectiveDate);
    setIsEditingEffectiveDate(false);
  };

  const handleProcessNow = async () => {
    setIsProcessingNow(true);
    try {
      const result = await ScheduledEmailService.triggerLateFeesProcessing();
      toast({
        title: "Late Fees Processed",
        description: `${result.applied ?? 0} penalties applied, ${result.emailed ?? result.scheduled ?? 0} notices sent.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to process late fees now.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingNow(false);
    }
  };

  const handleApplyNotice = async (row: LateFeeRow) => {
    setBusyRowId(row.rowId);
    try {
      const result = await ScheduledEmailService.sendLateFeeNotice(
        row.bookingDocId,
        row.termKey,
      );
      toast({
        title: "Notice Applied",
        description: result.appliedPenaltyNow
          ? `${row.term} notice sent and penalty applied.`
          : `${row.term} notice sent successfully.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to apply late fee notice.",
        variant: "destructive",
      });
    } finally {
      setBusyRowId(null);
    }
  };

  const handleResendNotice = async (row: LateFeeRow) => {
    setBusyRowId(row.rowId);
    try {
      await ScheduledEmailService.sendLateFeeNotice(row.bookingDocId, row.termKey, {
        resend: true,
      });
      toast({
        title: "Notice Resent",
        description: `${row.term} notice resent successfully.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to resend late fee notice.",
        variant: "destructive",
      });
    } finally {
      setBusyRowId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Late Fees</h2>
        <Button
          variant="destructive"
          onClick={handleProcessNow}
          disabled={isProcessingNow}
          className="border-0"
        >
          <Play className="mr-2 h-4 w-4" />
          {isProcessingNow ? "Processing..." : "Process Now"}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-md border bg-white p-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Late Fees Effective Date</p>
          <p className="text-xs text-muted-foreground">
            Bookings with reservation dates on/after this date are eligible for
            late-fee checks.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          {isEditingEffectiveDate ? (
            <>
              <Button
                size="icon"
                onClick={handleSaveEffectiveDate}
                disabled={isSavingConfig}
                title="Save effective date"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCancelEditEffectiveDate}
                disabled={isSavingConfig}
                title="Cancel edit"
              >
                <X className="h-4 w-4" />
              </Button>
              <Input
                type="date"
                value={draftEffectiveDate}
                onChange={(event) => setDraftEffectiveDate(event.target.value)}
                className="md:w-[220px]"
              />
            </>
          ) : (
            <>
              <div className="text-sm font-medium min-w-[160px]">
                {effectiveDate
                  ? formatDate(new Date(`${effectiveDate}T00:00:00`))
                  : "-"}
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={handleStartEditEffectiveDate}
                title="Edit effective date"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search booking, customer, email, tour, or term..."
      />

      <div className="border border-border bg-white overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pb-2">
          <Table className="min-w-[940px] text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-4 py-2 text-xs">Booking</TableHead>
                <TableHead className="py-2 text-xs">Customer</TableHead>
                <TableHead className="py-2 text-xs">Term</TableHead>
                <TableHead className="py-2 text-xs">Due Date</TableHead>
                <TableHead className="py-2 text-xs">Amount</TableHead>
                <TableHead className="py-2 text-xs">Late Fee</TableHead>
                <TableHead className="py-2 text-xs">Overdue</TableHead>
                <TableHead className="py-2 text-xs">Notice</TableHead>
                <TableHead className="w-[260px] py-2 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No late fee rows found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isBusy = busyRowId === row.rowId;
                  return (
                    <TableRow
                      key={row.rowId}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="pl-4 py-2 align-top">
                        <div className="font-medium">{row.bookingCode}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.tourPackageName}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 align-top">
                        <div>{row.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.emailAddress}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 font-medium">{row.term}</TableCell>
                      <TableCell className="py-2 text-muted-foreground">
                        {formatDate(row.dueDate)}
                      </TableCell>
                      <TableCell className="py-2">{formatGBP(row.amount)}</TableCell>
                      <TableCell className="py-2">
                        {row.penalty > 0 ? (
                          formatGBP(row.penalty)
                        ) : (
                          <span className="font-medium text-amber-600">
                            {formatGBP(Math.round(row.amount * 0.03 * 100) / 100)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        {row.hasOverdueUnpaid ? (
                          <Badge variant="destructive">{row.daysOverdue} days</Badge>
                        ) : (
                          <Badge variant="secondary">0 days</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant={
                            row.noticeStatus === "sent"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {row.noticeStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {row.noticeStatus === "none" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3"
                              disabled={isBusy}
                              onClick={() => handleApplyNotice(row)}
                            >
                              Apply Notice
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3"
                              disabled={isBusy}
                              onClick={() => handleResendNotice(row)}
                            >
                              Resend Notice
                            </Button>
                          )}

                          {row.noticeLink ? (
                            <a
                              href={row.noticeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Open Notice
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
