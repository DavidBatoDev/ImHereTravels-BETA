import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { 
  CreditCard, 
  User, 
  MapPin, 
  CalendarDays,
  Hash,
  Activity,
  DollarSign,
  Users,
  RefreshCcw,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { RefundDialogs } from "@/components/transactions/RefundDialogs";

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
    id: string;
    documentId: string;
    type?: string;
    groupSize?: number;
    guestDetails?: Array<{
      email: string;
      firstName: string;
      lastName: string;
      birthdate: string;
      nationality: string;
      whatsAppNumber: string;
      whatsAppCountry?: string;
    }>;
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

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  transaction,
}: PaymentDetailsDialogProps) {
  const [isRefunding, setIsRefunding] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [refundedBookingId, setRefundedBookingId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  if (!transaction) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    if (timestamp.seconds) {
      return format(new Date(timestamp.seconds * 1000), "PPP p");
    }
    if (typeof timestamp === "string") {
      return format(new Date(timestamp), "PPP p");
    }
    return "—";
  };

  const getStatusColor = (status: string) => {
     if (["succeeded", "installment_paid", "reserve_paid", "reservation_paid", "terms_selected"].includes(status)) {
         return "bg-emerald-100 text-emerald-800";
     }
     if (status === "failed") return "bg-rose-100 text-rose-800";
     if (status === "refunded") return "bg-gray-100 text-gray-800";
     return "bg-amber-100 text-amber-800";
  };

  const getStripePaymentUrl = () => {
    const intentId = 
      transaction?.payment?.paymentIntentId || 
      transaction?.stripePaymentIntentId || 
      transaction?.stripeIntentId ||
      transaction?.payment?.stripePaymentIntentId ||
      transaction?.payment?.stripeIntentId;
    
    if (intentId) {
      const env = process.env.NEXT_PUBLIC_ENV;
      const baseUrl = "https://dashboard.stripe.com/acct_1P7pdpFv3pifuM66";
      const path = env === "production" ? "payments" : "test/payments";
      return `${baseUrl}/${path}/${intentId}`;
    }

    // Fallback: Extract from clientSecret if available
    if (transaction?.payment?.clientSecret) {
      const clientSecret = transaction.payment.clientSecret;
      const extractedId = clientSecret.split('_secret_')[0];
      if (extractedId && extractedId.startsWith('pi_')) {
        const env = process.env.NEXT_PUBLIC_ENV;
        const baseUrl = "https://dashboard.stripe.com/acct_1P7pdpFv3pifuM66";
        const path = env === "production" ? "payments" : "test/payments";
        return `${baseUrl}/${path}/${extractedId}`;
      }
    }

    return null;
  };

  const handleRefund = async () => {
    if (!transaction?.id) return;

    setConfirmDialogOpen(false);
    setIsRefunding(true);
    
    try {
      const response = await fetch("/api/stripe-payments/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentDocId: transaction.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      // Store booking ID and payment intent ID for success dialog
      setRefundedBookingId(transaction.booking?.documentId || null);
      setPaymentIntentId(data.paymentIntentId || null);
      
      // Show success dialog
      setSuccessDialogOpen(true);
    } catch (error: any) {
      console.error("Refund error:", error);
      toast({
        title: "❌ Refund Failed",
        description: error.message || "Failed to process the refund. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleNavigateToBooking = () => {
    if (refundedBookingId) {
      router.push(`/bookings?tab=bookings&bookingId=${refundedBookingId}`);
      setSuccessDialogOpen(false);
      onOpenChange(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessDialogOpen(false);
    onOpenChange(false);
    window.location.reload();
  };

  const canRefund = ["succeeded", "reserve_paid", "reservation_paid", "terms_selected"].includes(
    transaction.payment.status
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-hk-grotesk flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Transaction Details
          </DialogTitle>
          <DialogDescription>
             ID: {transaction.id}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
            
            {/* Status & Amount Banner */}
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border/50">
               <div>
                 <p className="text-sm text-muted-foreground font-medium mb-1">Total Amount</p>
                 <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-hk-grotesk text-foreground">
                       {transaction.payment.amount?.toFixed(2)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground uppercase">
                       {transaction.payment.currency || 'GBP'}
                    </span>
                 </div>
               </div>
               <div className="text-right">
                  <p className="text-sm text-muted-foreground font-medium mb-1">Status</p>
                  <Badge className={`${getStatusColor(transaction.payment.status)} border-0 text-sm px-3 py-1`}>
                    {transaction.payment.status}
                  </Badge>
               </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               {/* Payment Info */}
               <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-medium text-foreground pb-2 border-b">
                     <CreditCard className="h-4 w-4" /> Payment Information
                  </h4>
                  <div className="space-y-3">
                     <div className="grid grid-cols-2 text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{transaction.payment.type || 'Standard'}</span>
                     </div>
                     <div className="grid grid-cols-2 text-sm">
                        <span className="text-muted-foreground">Term:</span>
                        <span className="font-medium">
                           {transaction.payment.installmentTerm 
                              ? transaction.payment.installmentTerm.replace('_', ' ').toUpperCase() 
                              : '—'
                           }
                        </span>
                     </div>
                     <div className="grid grid-cols-2 text-sm">
                        <span className="text-muted-foreground">Session ID:</span>
                        <span className="font-mono text-xs text-muted-foreground truncate" title={transaction.payment.checkoutSessionId}>
                            {transaction.payment.checkoutSessionId ? `${transaction.payment.checkoutSessionId.substring(0, 12)}...` : '—'}
                        </span>
                     </div>
                  </div>
               </div>

               {/* Customer Info */}
               <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-medium text-foreground pb-2 border-b">
                     <User className="h-4 w-4" /> Customer Details
                  </h4>
                  <div className="space-y-3">
                     <div className="grid grid-cols-[80px_1fr] text-sm">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">
                           {transaction.customer?.firstName} {transaction.customer?.lastName}
                        </span>
                     </div>
                     <div className="grid grid-cols-[80px_1fr] text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium break-all">{transaction.customer?.email}</span>
                     </div>
                  </div>
               </div>
            </div>

            <Separator />

            {/* Tour & Booking Info */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <h4 className="flex items-center gap-2 font-medium text-foreground pb-2 border-b">
                      <MapPin className="h-4 w-4" /> Tour Details
                   </h4>
                   <div className="space-y-3">
                     <div className="grid grid-cols-[80px_1fr] text-sm">
                         <span className="text-muted-foreground">Package:</span>
                         <span className="font-medium">{transaction.tour?.packageName || '—'}</span>
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="flex items-center gap-2 font-medium text-foreground pb-2 border-b">
                      <Hash className="h-4 w-4" /> Booking Connection
                   </h4>
                   <div className="space-y-3">
                     <div className="grid grid-cols-[80px_1fr] text-sm">
                        <span className="text-muted-foreground">Booking ID:</span>
                        <span className="font-mono bg-muted px-1.5 rounded w-fit">
                           {transaction.booking?.id || '—'}
                        </span>
                     </div>
                     <div className="grid grid-cols-[80px_1fr] text-sm">
                        <span className="text-muted-foreground">Doc ID:</span>
                        <span className="font-mono text-xs text-muted-foreground">
                           {transaction.booking?.documentId || '—'}
                        </span>
                     </div>
                   </div>
                </div>
            </div>

            {/* Guest Details (for Duo/Group bookings) */}
            {transaction.booking?.guestDetails && transaction.booking.guestDetails.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-medium text-foreground pb-2 border-b">
                    <Users className="h-4 w-4" /> Guest Details
                    <Badge variant="outline" className="ml-2">
                      {transaction.booking.groupSize || transaction.booking.guestDetails.length} travelers
                    </Badge>
                  </h4>
                  <div className="grid gap-4">
                    {transaction.booking.guestDetails.map((guest, index) => (
                      <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <h5 className="font-medium text-sm">Guest {index + 1}</h5>
                        </div>
                        <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          <div className="grid grid-cols-[100px_1fr]">
                            <span className="text-muted-foreground">Name:</span>
                            <span className="font-medium">{guest.firstName} {guest.lastName}</span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr]">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium break-all">{guest.email}</span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr]">
                            <span className="text-muted-foreground">Birthdate:</span>
                            <span className="font-medium">{guest.birthdate ? format(new Date(guest.birthdate), "PPP") : "—"}</span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr]">
                            <span className="text-muted-foreground">Nationality:</span>
                            <span className="font-medium">{guest.nationality || "—"}</span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr] md:col-span-2">
                            <span className="text-muted-foreground">WhatsApp:</span>
                            <span className="font-medium font-mono text-xs">
                              {guest.whatsAppNumber || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

             {/* Timestamps */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
               <h4 className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <CalendarDays className="h-4 w-4" /> Timeline
               </h4>
               <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                     <span className="text-muted-foreground block mb-1">Created At</span>
                     <span className="font-medium">{formatDate(transaction.timestamps.createdAt)}</span>
                  </div>
                  <div>
                     <span className="text-muted-foreground block mb-1">Updated At</span>
                     <span className="font-medium">{formatDate(transaction.timestamps.updatedAt)}</span>
                  </div>
                  {transaction.timestamps.confirmedAt && (
                      <div>
                        <span className="text-muted-foreground block mb-1">Confirmed At</span>
                        <span className="font-medium">{formatDate(transaction.timestamps.confirmedAt)}</span>
                      </div>
                  )}
               </div>
            </div>

        </div>

        {/* Action Buttons Footer */}
        <DialogFooter className="border-t pt-4 flex-col sm:flex-row gap-2">
          {transaction.booking && (
            <Button
              onClick={() => {
                if (transaction.booking?.documentId) {
                  router.push(`/bookings?tab=bookings&bookingId=${transaction.booking.documentId}`);
                  onOpenChange(false);
                }
              }}
              variant="outline"
              className="w-full sm:w-auto gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Booking
            </Button>
          )}
          {getStripePaymentUrl() && (
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto gap-2"
            >
              <a
                href={getStripePaymentUrl()!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                View in Stripe
              </a>
            </Button>
          )}
          {canRefund && (
            <Button
              onClick={() => setConfirmDialogOpen(true)}
              disabled={isRefunding}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {isRefunding ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Processing Refund...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Issue Refund
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RefundDialogs
      transaction={transaction}
      confirmOpen={confirmDialogOpen}
      successOpen={successDialogOpen}
      onConfirmChange={setConfirmDialogOpen}
      onSuccessChange={setSuccessDialogOpen}
      onConfirm={handleRefund}
      onNavigateToBooking={handleNavigateToBooking}
      onClose={handleCloseSuccess}
      paymentIntentId={paymentIntentId}
    />
    </>
  );
}
