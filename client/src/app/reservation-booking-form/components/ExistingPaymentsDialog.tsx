import {
  canDiscardExistingPayment,
  getExistingPaymentDisplayState,
  getExistingPaymentModalTitle,
  getExistingPaymentPrimaryActionLabel,
  getPaymentStatus,
  isPaidOrConfirmedStatus,
  shouldShowPendingReservationMessage,
} from "../utils/paymentLookup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StripePaymentRecord = {
  id?: string;
  _hasPaymentPlan?: boolean;
  tour?: {
    packageName?: string;
    date?: string;
  };
  tourPackageName?: string;
  tourDate?: string;
  payment?: {
    amount?: number;
    type?: string;
    installmentTerm?: string;
  };
  amountGBP?: number;
  timestamps?: {
    createdAt?: {
      toDate?: () => Date;
    };
  };
  [key: string]: unknown;
};

type ExistingPaymentsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modalLoading: boolean;
  foundStripePayments: StripePaymentRecord[];
  isCreatingPayment: boolean;
  onReuseExisting: (record: StripePaymentRecord) => void;
  onDiscardExisting: (id: string, status: string) => void;
  onCreateNewReservation: () => Promise<void>;
};

export default function ExistingPaymentsDialog({
  open,
  onOpenChange,
  modalLoading,
  foundStripePayments,
  isCreatingPayment,
  onReuseExisting,
  onDiscardExisting,
  onCreateNewReservation,
}: ExistingPaymentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {getExistingPaymentModalTitle(foundStripePayments)}
          </DialogTitle>
        </DialogHeader>

        {modalLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-sm text-muted-foreground">
              Checking for existing reservations...
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {foundStripePayments.length > 0 &&
              getPaymentStatus(foundStripePayments[0]) === "reserve_paid" &&
              !foundStripePayments[0]?._hasPaymentPlan && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <h5 className="font-semibold text-blue-900 dark:text-blue-100">
                        Payment Complete - Select Your Payment Plan
                      </h5>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        You've already paid the reservation fee. Please complete
                        your booking by selecting a payment plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {foundStripePayments.length > 0 &&
              shouldShowPendingReservationMessage(foundStripePayments) && (
                <p className="text-sm text-muted-foreground">
                  We found {foundStripePayments.length} pending reservation
                  {foundStripePayments.length !== 1 ? "s" : ""} for this tour.
                  You can continue with an existing reservation or start fresh.
                </p>
              )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {foundStripePayments.map((record, index) => {
                const status = getPaymentStatus(record);
                const isPaidReservation = isPaidOrConfirmedStatus(status);
                const displayState = getExistingPaymentDisplayState(record);
                const tourName =
                  record?.tour?.packageName ||
                  record?.tourPackageName ||
                  "Unknown Tour";
                const tourDate =
                  record?.tour?.date || record?.tourDate || "No date set";
                const amount =
                  record?.payment?.amount || record?.amountGBP || 0;
                const paymentType = record?.payment?.type || "reservationFee";
                const installmentTerm = record?.payment?.installmentTerm;
                const createdAt = record?.timestamps?.createdAt;
                let createdDate = "Unknown date";

                if (createdAt && typeof createdAt.toDate === "function") {
                  createdDate = createdAt.toDate().toLocaleDateString();
                }

                let paymentLabel = "Reservation Fee";
                if (paymentType === "installment") {
                  if (installmentTerm === "full_payment") {
                    paymentLabel = "Full Payment";
                  } else if (installmentTerm) {
                    paymentLabel = `${installmentTerm.toUpperCase()} Installment`;
                  } else {
                    paymentLabel = "Installment";
                  }
                }

                return (
                  <div
                    key={record.id || `${tourName}-${tourDate}-${index}`}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{tourName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Tour Date: {tourDate}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {createdDate}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full shrink-0 ${
                          displayState === "confirmed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                            : displayState === "awaiting-plan"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                        }`}
                      >
                        {displayState === "confirmed"
                          ? "Confirmed"
                          : displayState === "awaiting-plan"
                            ? "Awaiting Plan"
                            : "Pending Payment"}
                      </span>
                    </div>

                    <p className="text-sm">
                      {paymentLabel}: £{amount.toFixed(2)}
                    </p>

                    <div className="flex gap-2">
                      {isPaidReservation ? (
                        <button
                          onClick={() => onReuseExisting(record)}
                          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition font-medium"
                        >
                          {getExistingPaymentPrimaryActionLabel(record)}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onReuseExisting(record)}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
                            disabled={isCreatingPayment}
                          >
                            {isCreatingPayment
                              ? "Processing..."
                              : getExistingPaymentPrimaryActionLabel(record)}
                          </button>
                          {canDiscardExistingPayment(status) && record.id && (
                            <button
                              onClick={() =>
                                onDiscardExisting(record.id!, status)
                              }
                              className="flex-1 px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition"
                              disabled={isCreatingPayment}
                            >
                              Discard This
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={onCreateNewReservation}
                className="w-full px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 transition"
                disabled={isCreatingPayment}
              >
                {isCreatingPayment
                  ? "Creating..."
                  : "Create New Reservation Instead"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
