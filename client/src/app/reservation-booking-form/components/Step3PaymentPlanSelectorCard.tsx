import { AnimatePresence, motion } from "framer-motion";
import Step3PaymentPlanTabs from "./Step3PaymentPlanTabs";
import {
  getSelectedPaymentPlansCount,
  PersonPaymentPlan,
} from "../utils/step3PaymentPlan";

type AvailablePaymentTerm = {
  term: string;
  isLastMinute: boolean;
  isInvalid: boolean;
};

type GuestSummary = {
  firstName: string;
  lastName: string;
};

type PaymentScheduleItem = {
  date: string;
  amount: number;
};

type AvailablePaymentPlan = {
  id: string;
  label: string;
  description: string;
  monthsRequired: number;
  color: string;
  schedule: PaymentScheduleItem[];
};

type Step3PaymentPlanSelectorCardProps = {
  activePaymentTab: number;
  onActivePaymentTabChange: (tabIndex: number) => void;
  paymentPlans: PersonPaymentPlan[];
  guestDetails: GuestSummary[];
  selectedTourPrice: number;
  depositAmount: number;
  numberOfPeople: number;
  availablePaymentTerm: AvailablePaymentTerm;
  availablePaymentPlans: AvailablePaymentPlan[];
  selectionLocked: boolean;
  onSelectPaymentPlanForActiveTraveler: (planId: string) => void;
};

export default function Step3PaymentPlanSelectorCard({
  activePaymentTab,
  onActivePaymentTabChange,
  paymentPlans,
  guestDetails,
  selectedTourPrice,
  depositAmount,
  numberOfPeople,
  availablePaymentTerm,
  availablePaymentPlans,
  selectionLocked,
  onSelectPaymentPlanForActiveTraveler,
}: Step3PaymentPlanSelectorCardProps) {
  const reservationFeePerPerson = depositAmount / numberOfPeople;
  const remainingBalance = selectedTourPrice - reservationFeePerPerson;
  const selectedPlansCount = availablePaymentTerm.isLastMinute
    ? numberOfPeople
    : getSelectedPaymentPlansCount(paymentPlans);

  return (
    <div className="rounded-xl bg-card border border-sunglow-yellow/20 dark:border-crimson-red/30 shadow-md dark:shadow-lg overflow-hidden transition-all duration-300 hover:border-crimson-red">
      <div className="p-4 sm:p-5">
        <div className="space-y-4">
          {numberOfPeople > 1 && (
            <Step3PaymentPlanTabs
              activePaymentTab={activePaymentTab}
              onActivePaymentTabChange={onActivePaymentTabChange}
              paymentPlans={paymentPlans}
              guestDetails={guestDetails}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activePaymentTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h4 className="text-sm font-semibold text-foreground mb-2">
                {activePaymentTab === 0
                  ? "Select your payment plan"
                  : `Select payment plan for ${guestDetails[activePaymentTab - 1]?.firstName}`}
              </h4>

              <div className="bg-muted/20 border border-border rounded-lg p-3 mb-3">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Tour cost:</span>
                  <span className="font-bold text-foreground">
                    £{selectedTourPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs sm:text-sm mt-1.5">
                  <span className="text-muted-foreground">
                    Reservation fee share (paid):
                  </span>
                  <span className="font-bold text-spring-green">
                    -£{reservationFeePerPerson.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-border my-1.5"></div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground text-sm font-semibold">
                    Remaining balance:
                  </span>
                  <span className="font-bold text-base sm:text-lg text-crimson-red">
                    £{remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {availablePaymentTerm.isLastMinute ? (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-md">
                  <div className="flex items-start gap-2.5">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-500 text-white flex-shrink-0">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">
                        Full Payment Required
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Tour is coming up soon! Full payment of £
                        {remainingBalance.toFixed(2)} is required within 48
                        hours.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2.5">
                    Great news! You have up to{" "}
                    <span className="font-medium text-foreground">
                      {availablePaymentTerm.term}
                    </span>{" "}
                    flexible payment options. Pick what works best:
                  </p>
                  {selectionLocked && (
                    <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 mb-2.5">
                      Preview only: plan selection unlocks after Step 2 payment.
                    </p>
                  )}

                  <div className="space-y-2">
                    {availablePaymentPlans.map((plan) => {
                      const personPlan = paymentPlans[activePaymentTab];
                      const isSelected = personPlan?.plan === plan.id;

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => {
                            if (selectionLocked) return;
                            onSelectPaymentPlanForActiveTraveler(plan.id);
                          }}
                          disabled={selectionLocked}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : selectionLocked
                                ? "border-border bg-card opacity-80 cursor-not-allowed"
                                : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className="flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-semibold flex-shrink-0"
                              style={{
                                backgroundColor: plan.color,
                              }}
                            >
                              P{plan.monthsRequired}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="font-medium text-sm text-foreground">
                                  {plan.label}
                                </div>
                                {isSelected && (
                                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                                    <svg
                                      className="h-3.5 w-3.5"
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
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground mb-2">
                                {plan.description}
                              </div>

                              <div className="space-y-1.5 bg-muted/30 rounded-md p-2.5">
                                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                  Payment Schedule
                                </div>
                                {plan.schedule.map((payment, idx) => {
                                  const paymentAmount =
                                    remainingBalance / plan.schedule.length;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-xs sm:text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-medium">
                                          {idx + 1}
                                        </div>
                                        <span className="text-foreground">
                                          {new Date(
                                            payment.date + "T00:00:00Z",
                                          ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            timeZone: "UTC",
                                          })}
                                        </span>
                                      </div>
                                      <span className="font-semibold text-foreground">
                                        £{paymentAmount.toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="flex justify-between mt-4">
                {activePaymentTab > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onActivePaymentTabChange(activePaymentTab - 1)
                    }
                    className="px-3 py-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Previous
                  </button>
                )}
                {activePaymentTab < numberOfPeople - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onActivePaymentTabChange(activePaymentTab + 1)
                    }
                    disabled={
                      !selectionLocked && !paymentPlans[activePaymentTab]?.plan
                    }
                    className={`ml-auto px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectionLocked || paymentPlans[activePaymentTab]?.plan
                        ? "bg-primary text-primary-foreground hover:shadow-lg"
                        : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    }`}
                  >
                    Next →
                  </button>
                ) : (
                  <div className="ml-auto text-xs sm:text-sm text-muted-foreground">
                    {selectedPlansCount} of {numberOfPeople} plans selected
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
