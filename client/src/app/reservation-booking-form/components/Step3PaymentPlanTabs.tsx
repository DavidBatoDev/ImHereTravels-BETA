type PersonPaymentPlanTab = {
  plan: string;
};

type GuestSummary = {
  firstName: string;
  lastName: string;
};

type Step3PaymentPlanTabsProps = {
  activePaymentTab: number;
  onActivePaymentTabChange: (tabIndex: number) => void;
  paymentPlans: PersonPaymentPlanTab[];
  guestDetails: GuestSummary[];
};

export default function Step3PaymentPlanTabs({
  activePaymentTab,
  onActivePaymentTabChange,
  paymentPlans,
  guestDetails,
}: Step3PaymentPlanTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        type="button"
        onClick={() => onActivePaymentTabChange(0)}
        className={`flex-shrink-0 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
          activePaymentTab === 0
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        Guest 1 (YOU)
        {paymentPlans[0]?.plan && (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {guestDetails.map((guest, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onActivePaymentTabChange(idx + 1)}
          className={`flex-shrink-0 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            activePaymentTab === idx + 1
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {guest.firstName} {guest.lastName}
          {paymentPlans[idx + 1]?.plan && (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  );
}
