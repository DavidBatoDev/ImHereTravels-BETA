"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RevolutPaymentDocument } from "@/types/revolut-payment";
import revolutPaymentService from "@/services/revolut-payment-service";

interface RevolutVerificationTabProps {
  payments: RevolutPaymentDocument[];
  loading: boolean;
}

export default function RevolutVerificationTab({
  payments,
  loading,
}: RevolutVerificationTabProps) {
  const { toast } = useToast();
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<RevolutPaymentDocument | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Only show pending payments in the verification tab
  const pendingPayments = payments.filter((p) => p.status === "pending");

  const handleViewScreenshot = (payment: RevolutPaymentDocument) => {
    setSelectedPayment(payment);
    setScreenshotDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedPayment?.id) return;

    setProcessingId(selectedPayment.id);
    try {
      await revolutPaymentService.approvePayment(
        selectedPayment.id,
        selectedPayment.bookingDocumentId,
        selectedPayment.installmentTerm
      );
      toast({
        title: "Payment Approved",
        description: `Revolut payment for ${selectedPayment.booking?.id || selectedPayment.bookingId} has been approved.`,
      });
      setApproveDialogOpen(false);
      setScreenshotDialogOpen(false);
      setSelectedPayment(null);
    } catch (error: any) {
      console.error("Approve error:", error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve payment.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment?.id) return;

    setProcessingId(selectedPayment.id);
    try {
      await revolutPaymentService.rejectPayment(
        selectedPayment.id,
        selectedPayment.bookingDocumentId,
        selectedPayment.installmentTerm
      );
      toast({
        title: "Payment Rejected",
        description: `Revolut payment for ${selectedPayment.booking?.id || selectedPayment.bookingId} has been rejected.`,
      });
      setRejectDialogOpen(false);
      setScreenshotDialogOpen(false);
      setSelectedPayment(null);
    } catch (error: any) {
      console.error("Reject error:", error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject payment.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const map: Record<string, string> = {
      gbp: "£",
      usd: "$",
      eur: "€",
      php: "₱",
    };
    return map[currency?.toLowerCase()] || currency?.toUpperCase() || "£";
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    if (timestamp.seconds) {
      const date =
        typeof timestamp.toDate === "function"
          ? timestamp.toDate()
          : new Date(timestamp.seconds * 1000);
      return format(date, "MMM dd, h:mm a");
    }
    if (typeof timestamp === "string") {
      return format(new Date(timestamp), "MMM dd, h:mm a");
    }
    if (timestamp instanceof Date) {
      return format(timestamp, "MMM dd, h:mm a");
    }
    return "—";
  };

  const getCustomerName = (payment: RevolutPaymentDocument) => {
    const fullName = `${payment.customer?.firstName || ""} ${payment.customer?.lastName || ""}`.trim();
    if (fullName) return fullName;
    if (payment.customer?.email) return payment.customer.email;
    if (payment.userId) return payment.userId;
    return "—";
  };

  const getCustomerEmail = (payment: RevolutPaymentDocument) => {
    return payment.customer?.email || payment.userId || "—";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-0 flex items-center gap-1 w-fit rounded-md px-2 py-0.5">
            Pending <Clock className="h-3 w-3" />
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-0 flex items-center gap-1 w-fit rounded-md px-2 py-0.5">
            Approved <CheckCircle2 className="h-3 w-3" />
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-0 flex items-center gap-1 w-fit rounded-md px-2 py-0.5">
            Rejected <XCircle className="h-3 w-3" />
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-0 flex items-center gap-1 w-fit rounded-md px-2 py-0.5">
            {status}
          </Badge>
        );
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pb-2">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="pl-6">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tour</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="min-w-[180px]">Booking ID</TableHead>
                <TableHead>Screenshot</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pendingPayments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No pending Revolut payments to verify
                  </TableCell>
                </TableRow>
              ) : (
                pendingPayments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-1 font-medium font-hk-grotesk text-foreground">
                        <span className="text-muted-foreground">
                          {getCurrencySymbol(payment.currency)}
                        </span>
                        <span>{payment.amount?.toFixed(2) || "—"}</span>
                        <span className="text-xs text-muted-foreground uppercase ml-1">
                          {payment.currency || "GBP"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground whitespace-nowrap">
                        {payment.installmentTerm === "full_payment"
                          ? "Full Payment"
                          : `${payment.installmentTerm?.toUpperCase()} - Installment`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground whitespace-nowrap">
                        {payment.tour?.packageName || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {payment.customer?.email || payment.userId || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                          {payment.booking?.id || payment.bookingId || "—"}
                        </span>
                        {payment.bookingDocumentId && (
                          <Link
                            href={`/bookings?tab=bookings&bookingId=${payment.bookingDocumentId}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="View Booking"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewScreenshot(payment)}
                        className="gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setApproveDialogOpen(true);
                          }}
                          disabled={processingId === payment.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          {processingId === payment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setRejectDialogOpen(true);
                          }}
                          disabled={processingId === payment.id}
                          className="gap-1"
                        >
                          {processingId === payment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
          <div>
            Showing {pendingPayments.length} pending payment
            {pendingPayments.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Screenshot Preview Dialog */}
      <Dialog
        open={screenshotDialogOpen}
        onOpenChange={setScreenshotDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
            <DialogDescription>
              Review the payment screenshot for booking{" "}
              <span className="font-mono font-medium">
                {selectedPayment?.booking?.id || selectedPayment?.bookingId}
              </span>
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold">
                    {getCurrencySymbol(selectedPayment.currency)}
                    {selectedPayment.amount?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Installment</span>
                  <span>
                    {selectedPayment.installmentTerm === "full_payment"
                      ? "Full Payment"
                      : selectedPayment.installmentTerm?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span>{getCustomerName(selectedPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-muted-foreground">
                    {getCustomerEmail(selectedPayment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Submitted</span>
                  <span>{formatDate(selectedPayment.createdAt)}</span>
                </div>
              </div>

              {/* Screenshot Image */}
              {selectedPayment.paymentScreenshot?.url && (
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={selectedPayment.paymentScreenshot.url}
                    alt="Payment screenshot"
                    className="w-full h-auto max-h-[400px] object-contain bg-gray-100"
                  />
                  <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
                    <span>{selectedPayment.paymentScreenshot.fileName}</span>
                    <span>
                      {(
                        selectedPayment.paymentScreenshot.fileSize /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              onClick={() => {
                setApproveDialogOpen(true);
              }}
              disabled={processingId !== null}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Payment
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRejectDialogOpen(true);
              }}
              disabled={processingId !== null}
              className="gap-1"
            >
              <XCircle className="h-4 w-4" />
              Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the Revolut payment as approved and update the
              booking installment as paid. This action cannot be easily undone.
            </AlertDialogDescription>
            {selectedPayment && (
              <div className="mt-2 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded">
                <p>
                  <strong>Amount:</strong>{" "}
                  {getCurrencySymbol(selectedPayment.currency)}
                  {selectedPayment.amount?.toFixed(2)}
                </p>
                <p>
                  <strong>Booking:</strong>{" "}
                  {selectedPayment.booking?.id || selectedPayment.bookingId}
                </p>
                <p>
                  <strong>Customer:</strong>{" "}
                  {getCustomerName(selectedPayment)}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {getCustomerEmail(selectedPayment)}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={processingId !== null}
            >
              {processingId ? "Approving..." : "Approve Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the Revolut payment as rejected. The customer will
              need to submit a new payment.
            </AlertDialogDescription>
            {selectedPayment && (
              <div className="mt-2 text-sm bg-red-50 border border-red-200 p-3 rounded">
                <p>
                  <strong>Amount:</strong>{" "}
                  {getCurrencySymbol(selectedPayment.currency)}
                  {selectedPayment.amount?.toFixed(2)}
                </p>
                <p>
                  <strong>Booking:</strong>{" "}
                  {selectedPayment.booking?.id || selectedPayment.bookingId}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReject();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={processingId !== null}
            >
              {processingId ? "Rejecting..." : "Reject Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
