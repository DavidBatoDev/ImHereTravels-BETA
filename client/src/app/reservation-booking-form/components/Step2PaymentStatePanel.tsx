import { ReactNode } from "react";

type Step2PaymentStatePanelProps = {
  tourPackage: string;
  paymentConfirmed: boolean;
  step2Processing: boolean;
  children?: ReactNode;
};

export default function Step2PaymentStatePanel({
  tourPackage,
  paymentConfirmed,
  step2Processing,
  children,
}: Step2PaymentStatePanelProps) {
  if (!tourPackage) {
    return (
      <p className="text-sm text-destructive">
        Please go back and choose a tour name before proceeding to payment.
      </p>
    );
  }

  if (paymentConfirmed) {
    return (
      <div className="bg-spring-green/10 border border-spring-green/30 p-4 rounded-md">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-spring-green text-white">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="font-medium text-foreground">
              Payment confirmed!
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Your reservation fee has been successfully processed. Click
              Continue to proceed to your payment plan.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        Complete your secure payment below to reserve your spot. Your payment
        will be verified automatically.
      </p>

      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-md mb-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500 text-white flex-shrink-0">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="font-medium text-foreground">Important notice</div>
            <div className="text-sm text-muted-foreground mt-1">
              Once payment is complete, you won't be able to change your
              reservation details. If you need to make changes after payment,
              you can request a refund through the reservation confirmation
              email.
            </div>
          </div>
        </div>
      </div>

      {children}

      {step2Processing && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-md border border-border bg-muted/30">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">
            Processing payment...
          </span>
        </div>
      )}
    </>
  );
}
