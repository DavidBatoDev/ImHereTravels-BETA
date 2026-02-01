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
import { CheckCircle2, ExternalLink, Hash, User, CreditCard, Calendar, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Transaction {
  id: string;
  payment: {
    amount: number;
    currency: string;
    status: string;
    checkoutSessionId: string;
    type?: string;
    installmentTerm?: string;
    paymentIntentId?: string;
  };
  customer?: {
    email: string;
    firstName: string;
    lastName: string;
  };
  booking?: {
    id: string;
    documentId: string;
  };
  tour?: {
    packageName: string;
  };
  timestamps: {
    createdAt: { seconds: number; nanoseconds: number } | string;
    paidAt?: { seconds: number; nanoseconds: number } | string;
  };
}

interface RefundDialogsProps {
  transaction: Transaction | null;
  confirmOpen: boolean;
  successOpen: boolean;
  onConfirmChange: (open: boolean) => void;
  onSuccessChange: (open: boolean) => void;
  onConfirm: () => void;
  onNavigateToBooking: () => void;
  onClose: () => void;
  paymentIntentId?: string | null;
}

export function RefundDialogs({
  transaction,
  confirmOpen,
  successOpen,
  onConfirmChange,
  onSuccessChange,
  onConfirm,
  onNavigateToBooking,
  onClose,
  paymentIntentId,
}: RefundDialogsProps) {
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    if (timestamp.seconds) {
      return format(new Date(timestamp.seconds * 1000), "PPP");
    }
    if (typeof timestamp === "string") {
      return format(new Date(timestamp), "PPP");
    }
    return "—";
  };

  const getStripeUrl = () => {
    if (!paymentIntentId) return null;
    const env = process.env.NEXT_PUBLIC_ENV;
    const baseUrl = "https://dashboard.stripe.com/acct_1P7pdpFv3pifuM66";
    const path = env === "production" ? "payments" : "test/payments";
    return `${baseUrl}/${path}/${paymentIntentId}`;
  };

  return (
    <>
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={onConfirmChange}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to refund the following transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {transaction && (
            <div className="space-y-3 py-2">
              {/* Payment Amount - Prominently displayed */}
              <div className="rounded-lg border-2 border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Refund Amount:
                  </span>
                  <span className="text-lg font-bold text-destructive">
                    {transaction.payment.amount?.toFixed(2)}{" "}
                    {transaction.payment.currency?.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Payment Type:</span>
                  <span className="text-xs font-medium">
                    {transaction.payment.type === "reservationFee"
                      ? "Reservation Fee"
                      : transaction.payment.type === "installment"
                      ? `Installment${transaction.payment.installmentTerm ? ` - ${transaction.payment.installmentTerm.replace("_", " ").toUpperCase()}` : ""}`
                      : "Payment"}
                  </span>
                </div>
              </div>

              {/* Customer Information */}
              {transaction.customer && (
                <div className="p-3">
                  <h4 className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wide">
                    <User className="h-3.5 w-3.5" />
                    Customer Information
                  </h4>
                  <div className="space-y-1.5 pl-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">
                        {transaction.customer.firstName} {transaction.customer.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium text-xs break-all">
                        {transaction.customer.email}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Details */}
              {transaction.booking && (
                <div className="p-3">
                  <h4 className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wide">
                    <Hash className="h-3.5 w-3.5" />
                    Booking Details
                  </h4>
                  <div className="space-y-1.5 pl-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Booking ID:</span>
                      <span className="font-mono text-xs font-medium">
                        {transaction.booking.id}
                      </span>
                    </div>
                    {transaction.tour?.packageName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tour:</span>
                        <span className="font-medium text-xs">
                          {transaction.tour.packageName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Processing time info */}
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-200 m-0">
                  Refunds typically take 5-10 business days to appear on the customer's statement, depending on their bank. You can check it in the Stripe after the refund is processed.
                </p>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Confirm Refund
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successOpen} onOpenChange={onSuccessChange}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <AlertDialogTitle>Refund Successful</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  The payment has been refunded successfully.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {transaction && (
            <div className="space-y-4 py-4">
              {/* Payment Details */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                </h4>
                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Refunded:</span>
                    <span className="font-semibold text-foreground">
                      {transaction.payment.amount?.toFixed(2)}{" "}
                      {transaction.payment.currency?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Type:</span>
                    <span className="font-medium">
                      {transaction.payment.type === "reservationFee"
                        ? "Reservation Fee"
                        : transaction.payment.type === "installment"
                        ? "Installment"
                        : "Payment"}
                    </span>
                  </div>
                  {transaction.payment.installmentTerm && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Term:</span>
                      <span className="font-medium">
                        {transaction.payment.installmentTerm
                          .replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Booking Details */}
              {transaction.booking && (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Hash className="h-4 w-4" />
                    Booking Information
                  </h4>
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Booking ID:</span>
                      <span className="font-mono text-xs font-medium">
                        {transaction.booking.id}
                      </span>
                    </div>
                    {transaction.customer && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="font-medium">
                            {transaction.customer.firstName} {transaction.customer.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium text-xs break-all">
                            {transaction.customer.email}
                          </span>
                        </div>
                      </>
                    )}
                    {transaction.tour?.packageName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tour:</span>
                        <span className="font-medium">{transaction.tour.packageName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Processing time info */}
              <Separator />
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-200 m-0">
                  The refund will appear on the customer's statement in 5-10 business days, depending on their bank.
                </p>
              </div>

              {transaction.booking && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">
                    Would you like to navigate to the booking record to make any necessary
                    changes?
                  </p>
                </>
              )}
            </div>
          )}

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={onClose}>Stay Here</AlertDialogCancel>
            {getStripeUrl() && (
              <AlertDialogAction asChild>
                <a
                  href={getStripeUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View in Stripe
                </a>
              </AlertDialogAction>
            )}
            {transaction?.booking && (
              <AlertDialogAction onClick={onNavigateToBooking} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Go to Booking
              </AlertDialogAction>
            )}
            {!transaction?.booking && !getStripeUrl() && (
              <AlertDialogAction onClick={onClose}>Close</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
