"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  Search,
  Download,
  Settings2,
  Filter,
  Plus,
  MoreHorizontal,
  Clock,
  AlertCircle,
  ExternalLink,
  LayoutGrid,
  CreditCard,
  Wallet,
  Hourglass,
  ArrowUpRight,
  RefreshCcw,
  Building2,
  Eye,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaymentDetailsDialog } from "@/components/transactions/PaymentDetailsDialog";
import { RefundDialogs } from "@/components/transactions/RefundDialogs";

import {
  TransactionFilterDialog,
  FilterConfig,
} from "@/components/transactions/TransactionFilterDialog";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { RevolutPaymentDocument } from "@/types/revolut-payment";
import revolutPaymentService from "@/services/revolut-payment-service";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface Transaction {
  id: string;
  payment: {
    amount: number;
    currency: string;
    status: string;
    checkoutSessionId: string;
    type?: string;
    installmentTerm?: string;
    clientSecret?: string;
    paymentIntentId?: string;
    stripePaymentIntentId?: string;
    stripeIntentId?: string;
  };
  stripePaymentIntentId?: string;
  stripeIntentId?: string;
  customer?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  booking?: {
    id: string; // Booking ID (e.g. SB-TXP...)
    documentId: string;
  };
  tour?: {
    packageName: string;
  };
  timestamps: {
    createdAt: { seconds: number; nanoseconds: number } | string;
    paidAt?: { seconds: number; nanoseconds: number } | string;
    updatedAt?: { seconds: number; nanoseconds: number } | string;
    confirmedAt?: { seconds: number; nanoseconds: number } | string;
  };
}

export default function TransactionsPage() {
  const [data, setData] = useState<Transaction[]>([]);
  const [revolutPayments, setRevolutPayments] = useState<RevolutPaymentDocument[]>([]);
  const [revolutLoading, setRevolutLoading] = useState(true);
  const [stats, setStats] = useState({
    all: 0,
    reservationFee: 0,
    installment: 0,
    pending: 0,
    revolut: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const { toast } = useToast();
  const router = useRouter();

  // State for actions
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [transactionToRefund, setTransactionToRefund] =
    useState<Transaction | null>(null);
  const [refundedBookingId, setRefundedBookingId] = useState<string | null>(
    null,
  );
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);
  const [refundSuccessOpen, setRefundSuccessOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefunding, setIsRefunding] = useState<string | null>(null);

  // Revolut State
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [selectedRevolutPayment, setSelectedRevolutPayment] = useState<RevolutPaymentDocument | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter State
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterConfig[]>([]);
  const [activeMethodFilter, setActiveMethodFilter] = useState<"all" | "stripe" | "revolut">("all");

  useEffect(() => {
    // Set up realtime listener for transactions
    const paymentsRef = collection(db, "stripePayments");
    const q = query(paymentsRef, orderBy("timestamps.createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const payments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];

        setData(payments);

        // Calculate stats in realtime
        const calculatedStats = {
          all: payments.length,
          reservationFee: payments.filter(
            (p: any) => p.payment?.type === "reservationFee",
          ).length,
          installment: payments.filter(
            (p: any) => p.payment?.type === "installment",
          ).length,
          pending: payments.filter((p: any) =>
            [
              "pending",
              "reserve_pending",
              "reservation_pending",
              "installment_pending",
            ].includes(p.payment?.status),
          ).length,
          revolut: 0, // Will be updated by revolut listener
        };

        setStats((prev) => ({ ...prev, ...calculatedStats }));
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to transactions:", error);
        toast({
          title: "Connection Error",
          description:
            "Failed to connect to realtime updates. Please refresh the page.",
          variant: "destructive",
        });
        setLoading(false);
      },
    );

    // Revolut payments listener
    const revolutRef = collection(db, "revolutPayments");
    const revolutQuery = query(revolutRef); // Removed orderBy to fetch both old and new schemas

    const unsubRevolt = onSnapshot(
      revolutQuery,
      (snapshot) => {
        const payments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as RevolutPaymentDocument[];
        setRevolutPayments(payments);
        setStats((prev) => {
          const revolutPendingCount = payments.filter((p) => (p.payment?.status || p.status) === "pending").length;
          return {
            ...prev,
            revolut: revolutPendingCount,
            pending: prev.pending - ((prev as any)._lastRevolutPending || 0) + revolutPendingCount,
            _lastRevolutPending: revolutPendingCount
          };
        });
        setRevolutLoading(false);
      },
      (error) => {
        console.error("Error listening to revolut payments:", error);
        setRevolutLoading(false);
      },
    );

    // Cleanup listeners on unmount
    return () => {
      unsubscribe();
      unsubRevolt();
    };
  }, [toast]);

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/transactions/${transactionToDelete.id}`,
        {
          method: "DELETE",
        },
      );
      const result = await response.json();

      if (result.success) {
        // No need to manually update state - realtime listener will handle it
        setDeleteDialogOpen(false);
        setTransactionToDelete(null);
        toast({
          title: "Transaction Deleted",
          description: "The transaction has been successfully deleted.",
        });
      } else {
        console.error("Failed to delete:", result.error);
        toast({
          title: "Delete Failed",
          description: result.error || "Failed to delete transaction",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Error deleting transaction",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefund = async () => {
    if (!transactionToRefund) return;

    setRefundConfirmOpen(false);
    setIsRefunding(transactionToRefund.id);

    try {
      const response = await fetch("/api/stripe-payments/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentDocId: transactionToRefund.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      // Store booking ID and payment intent ID for success dialog
      setRefundedBookingId(transactionToRefund.booking?.documentId || null);
      setPaymentIntentId(data.paymentIntentId || null);

      // Show success dialog
      setRefundSuccessOpen(true);
    } catch (error: any) {
      console.error("Refund error:", error);
      toast({
        title: "❌ Refund Failed",
        description:
          error.message || "Failed to process the refund. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefunding(null);
    }
  };

  const handleNavigateToBooking = () => {
    if (refundedBookingId) {
      router.push(`/bookings?tab=bookings&bookingId=${refundedBookingId}`);
      setRefundSuccessOpen(false);
    }
  };

  const handleCloseRefundSuccess = () => {
    setRefundSuccessOpen(false);
    setTransactionToRefund(null);
    setRefundedBookingId(null);
    // Realtime listener will automatically update the data
  };

  const canRefund = (status: string) => {
    return [
      "succeeded",
      "reserve_paid",
      "reservation_paid",
      "terms_selected",
    ].includes(status);
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> =
    {
      succeeded: {
        label: "Succeeded",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      },
      installment_paid: {
        label: "Paid",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      },
      reserve_paid: {
        label: "Paid",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      },
      reservation_paid: {
        label: "Paid",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      },
      terms_selected: {
        label: "Paid",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      },
      reservation_pending: {
        label: "Pending",
        color: "bg-amber-100 text-amber-800",
        icon: Clock,
      },
      failed: {
        label: "Failed",
        color: "bg-rose-100 text-rose-800",
        icon: AlertCircle,
      },
      pending: {
        label: "Pending",
        color: "bg-amber-100 text-amber-800",
        icon: Clock,
      },
      installment_pending: {
        label: "Pending",
        color: "bg-amber-100 text-amber-800",
        icon: Clock,
      },
      cancelled: {
        label: "Cancelled",
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
      },
      refunded: {
        label: "Refunded",
        color: "bg-gray-100 text-gray-800",
        icon: RefreshCcw,
      },
      approved: {
        label: "Approved",
        color: "bg-emerald-100 text-emerald-800",
        icon: CheckCircle2,
      },
      rejected: {
        label: "Rejected",
        color: "bg-rose-100 text-rose-800",
        icon: XCircle,
      },
    };

  const getStatusBadge = (status: string) => {
    const config = statusMap[status] || statusMap["pending"];
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} border-0 flex items-center gap-1 w-fit rounded-md px-2 py-0.5`}
      >
        {config.label} <Icon className="h-3 w-3" />
      </Badge>
    );
  };

  const getTypeLabel = (t: Transaction) => {
    if (t.payment.type === "reservationFee") {
      return "Reservation Fee";
    }
    if (t.payment.type === "installment" && t.payment.installmentTerm) {
      if (t.payment.installmentTerm === "full_payment") return "Full Payment";
      return `${t.payment.installmentTerm.toUpperCase()} - Installment`;
    }
    return t.payment.type || "Payment";
  };

  const getCurrencySymbol = (currency: string) => {
    const map: Record<string, string> = {
      gbp: "£",
      usd: "$",
      eur: "€",
      php: "₱",
    };
    return map[currency.toLowerCase()] || currency.toUpperCase();
  };

  const getDate = (t: Transaction) => {
    return (
      t.timestamps.updatedAt ||
      t.timestamps.confirmedAt ||
      t.timestamps.createdAt
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";

    // Handle Firestore timestamp object
    if (timestamp.seconds) {
      // Use toDate() if available, otherwise construct Date from seconds
      const date =
        typeof timestamp.toDate === "function"
          ? timestamp.toDate()
          : new Date(timestamp.seconds * 1000);
      return format(date, "MMM dd, h:mm a");
    }

    // Handle string ISO date
    if (typeof timestamp === "string") {
      return format(new Date(timestamp), "MMM dd, h:mm a");
    }

    return "—";
  };

  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
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

  const handleApprove = async () => {
    if (!selectedRevolutPayment?.id) return;
    setProcessingId(selectedRevolutPayment.id);
    try {
      await revolutPaymentService.approvePayment(
        selectedRevolutPayment.id,
        selectedRevolutPayment.booking?.documentId || selectedRevolutPayment.bookingDocumentId || "",
        selectedRevolutPayment.payment?.installmentTerm || selectedRevolutPayment.installmentTerm || ""
      );
      toast({
        title: "Payment Approved",
        description: `Revolut payment has been approved.`,
      });
      setApproveDialogOpen(false);
      setScreenshotDialogOpen(false);
      setSelectedRevolutPayment(null);
    } catch (error: any) {
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
    if (!selectedRevolutPayment?.id) return;
    setProcessingId(selectedRevolutPayment.id);
    try {
      await revolutPaymentService.rejectPayment(
        selectedRevolutPayment.id,
        selectedRevolutPayment.booking?.documentId || selectedRevolutPayment.bookingDocumentId || "",
        selectedRevolutPayment.payment?.installmentTerm || selectedRevolutPayment.installmentTerm || ""
      );
      toast({
        title: "Payment Rejected",
        description: `Revolut payment has been rejected.`,
      });
      setRejectDialogOpen(false);
      setScreenshotDialogOpen(false);
      setSelectedRevolutPayment(null);
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject payment.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Combine Stripe and Revolut data for the global table, and then filter them all together
  const initialCombinedData = [
    ...data.map(t => ({ type: 'stripe' as const, data: t })),
    ...revolutPayments.map(rp => ({ type: 'revolut' as const, data: rp as any }))
  ];

  const processedData = initialCombinedData.filter((item) => {
    // 1. Tab Filter
    let tabMatch = true;
    const paymentStatus = item.type === 'stripe' ? item.data.payment.status : (item.data.payment?.status || item.data.status);
    const paymentType = item.type === 'stripe' ? item.data.payment.type : "installment";

    if (activeTab === "Reservation Fee") {
      tabMatch = paymentType === "reservationFee";
    } else if (activeTab === "Installment") {
      tabMatch = paymentType === "installment";
    } else if (activeTab === "Pending") {
      tabMatch = [
        "pending",
        "reserve_pending",
        "reservation_pending",
        "installment_pending",
      ].includes(paymentStatus);
    }

    if (!tabMatch) return false;

    if (activeMethodFilter !== "all" && item.type !== activeMethodFilter) {
      return false;
    }

    // 2. Text Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      let match = false;
      
      if (item.type === 'stripe') {
        const t = item.data;
        match = Boolean(
          t.customer?.email?.toLowerCase().includes(q) ||
          t.payment.amount.toString().includes(q) ||
          t.payment.currency.toLowerCase().includes(q) ||
          t.tour?.packageName?.toLowerCase().includes(q) ||
          t.payment.installmentTerm?.toLowerCase().includes(q)
        );
      } else {
        const rp = item.data;
        match = Boolean(
          getCustomerEmail(rp).toLowerCase().includes(q) ||
          getCustomerName(rp).toLowerCase().includes(q) ||
          rp.tour?.packageName?.toLowerCase().includes(q)
        );
      }
      
      if (!match) return false;
    }

    // 3. Advanced Filters
    if (activeFilters.length > 0) {
      const filterMatch = activeFilters.every((filter) => {
        let value: any;
        
        if (filter.field === 'type') {
           value = item.type;
        } else if (item.type === 'stripe') {
           value = getNestedValue(item.data, filter.field);
        } else {
           // Mapping Stripe fields to Revolut fields for uniform filtering
           if (filter.field === 'customer.email') value = getCustomerEmail(item.data);
           else if (filter.field === 'customer.name') value = getCustomerName(item.data);
           else if (filter.field === 'booking.id') value = item.data.booking?.id || item.data.bookingDocumentId;
           else if (filter.field === 'payment.status') value = item.data.payment?.status || item.data.status;
           else if (filter.field === 'payment.amount') value = item.data.payment?.amount || item.data.amount;
           else if (filter.field === 'payment.currency') value = item.data.payment?.currency || "GBP";
           else if (filter.field === 'payment.type') value = "installment";
           else if (filter.field === 'payment.installmentTerm') value = item.data.payment?.installmentTerm || item.data.installmentTerm;
           else if (filter.field === 'tour.packageName') value = item.data.tour?.packageName;
           else if (filter.field === 'timestamps.createdAt') value = item.data.timestamps?.createdAt;
           else value = getNestedValue(item.data, filter.field);
        }

        // Handle Dates
        if (filter.field.includes("timestamps") && value) {
          if (typeof value === "object" && "seconds" in value) {
            value = new Date(value.seconds * 1000).getTime();
          } else if (typeof value === "string") {
            value = new Date(value).getTime();
          }

          const filterTime = filter.value ? new Date(filter.value).getTime() : 0;
          const filterTime2 = filter.value2 ? new Date(filter.value2).getTime() : 0;

          switch (filter.operator) {
            case "eq":
              return new Date(value).toDateString() === new Date(filterTime).toDateString();
            case "neq":
              return new Date(value).toDateString() !== new Date(filterTime).toDateString();
            case "gt":
              return value > filterTime;
            case "gte":
              return value >= filterTime;
            case "lt":
              return value < filterTime;
            case "lte":
              return value <= filterTime;
            case "between":
              return value >= filterTime && value <= filterTime2;
            default:
              return true;
          }
        }

        const filterValue = filter.value;
        const filterValue2 = filter.value2;

        switch (filter.operator) {
           case "eq":
             return String(value).toLowerCase() === String(filterValue).toLowerCase();
           case "neq":
             return String(value).toLowerCase() !== String(filterValue).toLowerCase();
           case "contains":
             if (!value) return false;
             return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
           case "gt":
             return Number(value) > Number(filterValue);
           case "gte":
             return Number(value) >= Number(filterValue);
           case "lt":
             return Number(value) < Number(filterValue);
           case "lte":
             return Number(value) <= Number(filterValue);
           case "between":
             return Number(value) >= Number(filterValue) && Number(value) <= Number(filterValue2);
           default:
             return true;
        }
      });
      if (!filterMatch) return false;
    }

    return true;
  });

  const combinedData = processedData.sort((a, b) => {
        const getTimestampValue = (timestamp: any): number => {
          if (!timestamp) return 0;
          if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
          if (timestamp.seconds) return timestamp.seconds * 1000;
          if (typeof timestamp === "string") return new Date(timestamp).getTime();
          if (timestamp instanceof Date) return timestamp.getTime();
          return 0;
        };

        const timeA = a.type === 'stripe' 
          ? getTimestampValue(getDate(a.data as Transaction))
          : getTimestampValue((a.data as RevolutPaymentDocument).timestamps?.updatedAt || (a.data as RevolutPaymentDocument).timestamps?.createdAt);
          
        const timeB = b.type === 'stripe' 
          ? getTimestampValue(getDate(b.data as Transaction))
          : getTimestampValue((b.data as RevolutPaymentDocument).timestamps?.updatedAt || (b.data as RevolutPaymentDocument).timestamps?.createdAt);
          
        return timeB - timeA; // Sort descending (newest first)
      });
      
  const pendingRevolutPayments = revolutPayments.filter(rp => (rp.payment?.status || rp.status) === "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-hk-grotesk">
              Transactions
            </h1>
            <p className="text-muted-foreground">
              View all Reservation and Installment transactions.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-5 flex justify-between items-start">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-xl" />
                  </CardContent>
                </Card>
              ))
            : [
                {
                  label: "All Transactions",
                  value: stats.all,
                  active: activeTab === "All",
                  onClick: () => setActiveTab("All"),
                  icon: LayoutGrid,
                  bgColor: "bg-blue-100",
                },
                {
                  label: "Reservation Fee",
                  value: stats.reservationFee,
                  active: activeTab === "Reservation Fee",
                  onClick: () => setActiveTab("Reservation Fee"),
                  icon: CreditCard,
                  bgColor: "bg-violet-100",
                },
                {
                  label: "Installment",
                  value: stats.installment,
                  active: activeTab === "Installment",
                  onClick: () => setActiveTab("Installment"),
                  icon: Wallet,
                  bgColor: "bg-emerald-100",
                },
                {
                  label: "Pending",
                  value: stats.pending,
                  active: activeTab === "Pending",
                  onClick: () => setActiveTab("Pending"),
                  icon: Hourglass,
                  bgColor: "bg-amber-100",
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md border-border overflow-hidden relative ${
                      stat.active
                        ? "ring-2 ring-primary ring-offset-1"
                        : "bg-card"
                    }`}
                    onClick={stat.onClick}
                  >
                    <CardContent className="p-5 flex justify-between items-start">
                      <div className="space-y-2 z-10">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          {stat.label}
                        </p>
                        <div className="text-3xl font-bold font-hk-grotesk text-foreground">
                          {stat.value}
                        </div>
                      </div>
                      <div
                        className={`p-4 rounded-full rounded-br-none ${stat.bgColor}`}
                      >
                        <Icon className="h-6 w-6 text-black" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
        
        {/* Required Actions for Pending Revolut Payments */}
        {!loading && !revolutLoading && pendingRevolutPayments.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader className="py-2 px-3 border-b border-amber-100 bg-amber-50/30 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-sm font-semibold text-amber-900">Required Actions</CardTitle>
              </div>
              <CardDescription className="text-xs text-amber-700 m-0">
                {pendingRevolutPayments.length} payment{pendingRevolutPayments.length === 1 ? "" : "s"} waiting for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-amber-100/60 max-h-[300px] overflow-y-auto 
                [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-amber-200/50 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {pendingRevolutPayments.map((rp) => (
                  <div key={rp.id} className="flex flex-col md:flex-row md:items-center justify-between py-2 px-3 gap-2 hover:bg-amber-100/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="bg-amber-100 text-amber-700 p-1.5 rounded-sm shrink-0">
                          <Wallet className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-[130px]">
                          <p className="font-semibold text-amber-950 text-[13px] truncate leading-tight">
                            {getCustomerName(rp)}
                          </p>
                          <p className="text-[11px] text-amber-700/80 truncate leading-tight">
                            {getCustomerEmail(rp)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="hidden sm:block w-px h-6 bg-amber-200/60"></div>
                      
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-amber-600/80 uppercase tracking-widest font-bold leading-none mb-1">Amount</span>
                          <span className="font-semibold text-amber-950 text-xs leading-none">
                            {getCurrencySymbol(rp.payment.currency || "GBP")}{rp.payment.amount?.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-amber-600/80 uppercase tracking-widest font-bold leading-none mb-1">Booking</span>
                          <span className="font-semibold text-amber-950 text-xs leading-none">{rp.booking?.id}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-amber-600/80 uppercase tracking-widest font-bold leading-none mb-1">Term</span>
                          <span className="font-medium text-amber-900 text-xs leading-none">
                            {rp.payment?.installmentTerm === "full_payment" ? "Full" : rp.payment?.installmentTerm?.toUpperCase() || rp.installmentTerm?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-2 md:mt-0 shrink-0">
                      <Button
                        variant="outline"
                        className="bg-white hover:bg-amber-50 border-amber-200 text-amber-700 h-7 px-2.5 text-[11px] flex-1 md:flex-none w-full md:w-auto shadow-none"
                        onClick={() => {
                          setSelectedRevolutPayment(rp);
                          setScreenshotDialogOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5 text-[11px] flex-1 md:flex-none shadow-none w-full md:w-auto"
                        onClick={() => {
                          setSelectedRevolutPayment(rp);
                          setApproveDialogOpen(true);
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-7 px-2.5 text-[11px] flex-1 md:flex-none shadow-none w-full md:w-auto hover:bg-red-600"
                        onClick={() => {
                          setSelectedRevolutPayment(rp);
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search..."
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:flex items-center p-1 bg-gray-100/80 rounded-lg border border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMethodFilter("all")}
                className={`h-7 px-3 text-xs rounded-md font-medium transition-all ${
                  activeMethodFilter === "all"
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                }`}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMethodFilter("stripe")}
                className={`h-7 px-3 text-xs rounded-md font-medium transition-all ${
                  activeMethodFilter === "stripe"
                    ? "bg-white text-indigo-700 shadow-sm border border-gray-200/50"
                    : "text-gray-500 hover:text-indigo-700 hover:bg-gray-200/50"
                }`}
              >
                Stripe
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveMethodFilter("revolut")}
                className={`h-7 px-3 text-xs rounded-md font-medium transition-all ${
                  activeMethodFilter === "revolut"
                    ? "bg-white text-emerald-700 shadow-sm border border-gray-200/50"
                    : "text-gray-500 hover:text-emerald-700 hover:bg-gray-200/50"
                }`}
              >
                Revolut
              </Button>
            </div>
            
            <Button
              variant="outline"
              className={`bg-white gap-2 text-sm font-normal text-gray-600 ${activeFilters.length > 0 ? "border-primary text-primary bg-primary/5" : ""}`}
              onClick={() => setFilterDialogOpen(true)}
            >
              <Filter className="h-3 w-3" />
              Filters
              {activeFilters.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 px-1.5 bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {activeFilters.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pb-2">
            <Table className="min-w-[1100px]">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="pl-6">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  {activeTab === "All" && <TableHead>Method</TableHead>}
                  <TableHead>Tour</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="min-w-[180px]">Booking ID</TableHead>
                  <TableHead className="w-16 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 15 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : combinedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={activeTab === "All" ? 9 : 8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  combinedData.map((item) => {
                    if (item.type === 'stripe') {
                      const t = item.data as Transaction;
                      return (
                        <TableRow
                          key={t.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-1 font-medium font-hk-grotesk text-foreground">
                              <span className="text-muted-foreground">
                                {getCurrencySymbol(t.payment.currency || "GBP")}
                              </span>
                              <span>
                                {t.payment.amount !== undefined
                                  ? t.payment.amount.toFixed(2)
                                  : "—"}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase ml-1">
                                {t.payment.currency || "GBP"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(t.payment.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-foreground whitespace-nowrap">
                              {getTypeLabel(t)}
                            </span>
                          </TableCell>
                          {activeTab === "All" && (
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-xs font-medium border-blue-200 text-blue-700 bg-blue-50 whitespace-nowrap"
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Stripe
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            <span className="text-sm text-foreground whitespace-nowrap">
                              {t.tour?.packageName || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer hover:underline transition-colors whitespace-nowrap">
                              {t.customer?.email || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(getDate(t))}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                                {t.booking?.id || "—"}
                              </span>
                              {t.booking?.documentId && (
                                <Link
                                  href={`/bookings?tab=bookings&bookingId=${t.booking.documentId}`}
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                  title="View Booking"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTransaction(t);
                                    setViewDialogOpen(true);
                                  }}
                                >
                                  View details
                                </DropdownMenuItem>
                                {canRefund(t.payment.status) && (
                                  <DropdownMenuItem
                                    className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                                    onClick={() => {
                                      setTransactionToRefund(t);
                                      setRefundConfirmOpen(true);
                                    }}
                                    disabled={isRefunding === t.id}
                                  >
                                    {isRefunding === t.id
                                      ? "Processing..."
                                      : "Issue refund"}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => {
                                    setTransactionToDelete(t);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  Delete record
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    } else {
                      const rp = item.data as RevolutPaymentDocument;
                      return (
                        <TableRow
                          key={`revolut-${rp.id}`}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-1 font-medium font-hk-grotesk text-foreground">
                              <span className="text-muted-foreground">
                                {getCurrencySymbol(rp.payment.currency || "GBP")}
                              </span>
                              <span>
                                {rp.payment.amount !== undefined
                                  ? rp.payment.amount.toFixed(2)
                                  : "—"}
                              </span>
                              <span className="text-xs text-muted-foreground uppercase ml-1">
                                {rp.payment.currency || "GBP"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(rp.payment?.status || rp.status)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-foreground whitespace-nowrap">
                              {rp.payment.installmentTerm === "full_payment"
                                ? "Full Payment"
                                : `${rp.payment.installmentTerm?.toUpperCase()} - Installment`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs font-medium border-indigo-200 text-indigo-700 bg-indigo-50 whitespace-nowrap"
                            >
                              <Building2 className="h-3 w-3 mr-1" />
                              Revolut
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-foreground whitespace-nowrap">
                              {rp.tour?.packageName || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {rp.customer?.email || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(rp.timestamps?.updatedAt || rp.timestamps?.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                                {rp.booking?.id || "—"}
                              </span>
                              {rp.booking?.documentId && (
                                <Link
                                  href={`/bookings?tab=bookings&bookingId=${rp.booking.documentId}`}
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                  title="View Booking"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedRevolutPayment(rp);
                                  setScreenshotDialogOpen(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Screenshot
                                </DropdownMenuItem>
                                {(rp.payment?.status || rp.status) === "pending" && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
                                      onClick={() => {
                                        setSelectedRevolutPayment(rp);
                                        setApproveDialogOpen(true);
                                      }}
                                      disabled={processingId === rp.id}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                      onClick={() => {
                                        setSelectedRevolutPayment(rp);
                                        setRejectDialogOpen(true);
                                      }}
                                      disabled={processingId === rp.id}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
            <div>
              Viewing {combinedData.length > 0 ? 1 : 0}-{combinedData.length} of {data.length + revolutPayments.length} items
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* View Details Dialog */}
      <PaymentDetailsDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        transaction={selectedTransaction}
      />

      {/* Filter Dialog */}
      <TransactionFilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        onApplyFilters={setActiveFilters}
        activeFilters={activeFilters}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              transaction record for
              <span className="font-medium text-foreground">
                {" "}
                {transactionToDelete?.id}
              </span>
              .
            </AlertDialogDescription>
            {transactionToDelete && (
              <div className="mt-2 text-sm bg-muted p-2 rounded">
                <p>
                  <strong>Amount:</strong>{" "}
                  {getCurrencySymbol(transactionToDelete.payment.currency)}
                  {transactionToDelete.payment.amount}
                </p>
                <p>
                  <strong>Email:</strong> {transactionToDelete.customer?.email}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RefundDialogs
        transaction={transactionToRefund}
        confirmOpen={refundConfirmOpen}
        successOpen={refundSuccessOpen}
        onConfirmChange={setRefundConfirmOpen}
        onSuccessChange={setRefundSuccessOpen}
        onConfirm={handleRefund}
        onNavigateToBooking={handleNavigateToBooking}
        onClose={handleCloseRefundSuccess}
        paymentIntentId={paymentIntentId}
      />

      {/* Revolut Screenshot Dialog */}
      <Dialog open={screenshotDialogOpen} onOpenChange={setScreenshotDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle>Payment Verification</DialogTitle>
            <DialogDescription>
              Review the payment details and screenshot below to verify the
              transaction.
            </DialogDescription>
          </DialogHeader>

          {selectedRevolutPayment && (
            <div className="grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-6 mt-4">
              {/* Left Column: Screenshot Image */}
              <div className="flex flex-col">
                {selectedRevolutPayment.paymentScreenshot?.url ? (
                  <div className="border rounded-lg overflow-hidden flex-1 bg-gray-100 flex flex-col">
                    <img
                      src={selectedRevolutPayment.paymentScreenshot.url}
                      alt="Payment screenshot"
                      className="w-full object-contain max-h-[600px] flex-1"
                    />
                    <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-500 flex justify-between mt-auto">
                      <span className="truncate mr-2" title={selectedRevolutPayment.paymentScreenshot.fileName}>
                        {selectedRevolutPayment.paymentScreenshot.fileName}
                      </span>
                      <span className="whitespace-nowrap">
                        {(
                          selectedRevolutPayment.paymentScreenshot.fileSize /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden flex-1 bg-gray-50 flex items-center justify-center p-8 min-h-[300px]">
                    <span className="text-gray-400">No screenshot provided</span>
                  </div>
                )}
              </div>

              {/* Right Column: Payment Details & Actions */}
              <div className="flex flex-col space-y-6">
                <div className="bg-gray-50 rounded-lg p-5 space-y-4 text-sm border">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Transaction Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-semibold text-base text-gray-900">
                        {getCurrencySymbol(selectedRevolutPayment.payment?.currency || "GBP")}
                        {selectedRevolutPayment.payment?.amount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Installment</span>
                      <span className="font-medium text-gray-900">
                        {selectedRevolutPayment.payment?.installmentTerm === "full_payment"
                          ? "Full Payment"
                          : selectedRevolutPayment.payment?.installmentTerm?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Customer</span>
                      <span className="font-medium text-gray-900">{getCustomerName(selectedRevolutPayment)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Email</span>
                      <span className="text-gray-600">
                        {getCustomerEmail(selectedRevolutPayment)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-3">
                      <span className="text-gray-500">Submitted On</span>
                      <span className="text-gray-600">{formatDate(selectedRevolutPayment.timestamps?.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {(selectedRevolutPayment?.payment?.status || selectedRevolutPayment?.status) === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-4 md:pt-0">
                    <Button
                      onClick={() => setApproveDialogOpen(true)}
                      disabled={processingId !== null}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1 h-11"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Approve Payment
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={processingId !== null}
                      className="gap-2 flex-1 h-11"
                    >
                      <XCircle className="h-5 w-5" />
                      Reject Payment
                    </Button>
                  </div>
                )}
                
                {(selectedRevolutPayment?.payment?.status || selectedRevolutPayment?.status) !== "pending" && (
                   <div className="mt-auto p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground border border-dashed">
                      This transaction has already been {selectedRevolutPayment?.payment?.status || selectedRevolutPayment?.status}.
                   </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revolut Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the Revolut payment as approved and update the
              booking installment as paid. This action cannot be easily undone.
            </AlertDialogDescription>
            {selectedRevolutPayment && (
              <div className="mt-2 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded">
                <p>
                  <strong>Amount:</strong>{" "}
                  {getCurrencySymbol(selectedRevolutPayment.payment.currency || "GBP")}
                  {selectedRevolutPayment.payment.amount?.toFixed(2)}
                </p>
                <p>
                  <strong>Booking:</strong>{" "}
                  {selectedRevolutPayment.booking?.id}
                </p>
                <p>
                  <strong>Installment:</strong>{" "}
                  {selectedRevolutPayment.payment?.installmentTerm === "full_payment"
                    ? "Full Payment"
                    : selectedRevolutPayment.payment?.installmentTerm?.toUpperCase() || selectedRevolutPayment.installmentTerm?.toUpperCase()}
                </p>
                <p>
                  <strong>Customer:</strong>{" "}
                  {getCustomerName(selectedRevolutPayment)}
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  {getCustomerEmail(selectedRevolutPayment)}
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

      {/* Revolut Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the Revolut payment as rejected. The customer will
              need to submit a new payment.
            </AlertDialogDescription>
            {selectedRevolutPayment && (
              <div className="mt-2 text-sm bg-red-50 border border-red-200 p-3 rounded">
                <p>
                  <strong>Amount:</strong>{" "}
                  {getCurrencySymbol(selectedRevolutPayment.payment.currency || "GBP")}
                  {selectedRevolutPayment.payment.amount?.toFixed(2)}
                </p>
                <p>
                  <strong>Booking:</strong>{" "}
                  {selectedRevolutPayment.booking?.id}
                </p>
                <p>
                  <strong>Installment:</strong>{" "}
                  {selectedRevolutPayment.payment?.installmentTerm === "full_payment"
                    ? "Full Payment"
                    : selectedRevolutPayment.payment?.installmentTerm?.toUpperCase() || selectedRevolutPayment.installmentTerm?.toUpperCase()}
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
    </DashboardLayout>
  );
}
