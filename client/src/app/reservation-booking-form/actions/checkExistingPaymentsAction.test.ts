import { describe, expect, it, vi } from "vitest";
import {
  checkExistingPaymentsAction,
  runExistingPaymentsFlowAction,
} from "./checkExistingPaymentsAction";

describe("checkExistingPaymentsAction", () => {
  it("returns create-placeholder when no reservation fee payments", async () => {
    const result = await checkExistingPaymentsAction({
      fetchPayments: async () => [
        { id: "a", payment: { type: "installment", status: "pending" } },
      ],
      fetchBookingHasPaymentPlan: async () => false,
      selectedPackageName: "Tour A",
      tourDate: "2026-12-10",
    });

    expect(result).toEqual({ type: "create-placeholder" });
  });

  it("hydrates booking payment plan and returns exact-match modal decision", async () => {
    const bookingLookup = vi.fn(async () => true);

    const result = await checkExistingPaymentsAction({
      fetchPayments: async () => [
        {
          id: "a",
          payment: { type: "reservationFee", status: "reserve_paid" },
          booking: { documentId: "booking-1" },
          tour: { packageName: "Tour A", date: "2026-12-10" },
        },
      ],
      fetchBookingHasPaymentPlan: bookingLookup,
      selectedPackageName: "Tour A",
      tourDate: "2026-12-10",
    });

    expect(bookingLookup).toHaveBeenCalledWith("booking-1");
    expect(result.type).toBe("show-modal");
    if (result.type === "show-modal") {
      expect(result.exactMatchFound).toBe(true);
      expect(result.records[0]._hasPaymentPlan).toBe(true);
    }
  });
});

describe("runExistingPaymentsFlowAction", () => {
  it("moves to step 2 when create-placeholder decision is returned", async () => {
    const createPlaceholder = vi.fn(async () => "doc-1");
    const setCompletedSteps = vi.fn();
    const setStep = vi.fn();
    const setIsCreatingPayment = vi.fn();
    const setModalLoading = vi.fn();
    const setFoundStripePayments = vi.fn();
    const setShowEmailModal = vi.fn();
    const replaceWithPaymentId = vi.fn();

    await runExistingPaymentsFlowAction({
      validate: () => true,
      isCreatingPayment: false,
      paymentDocId: null,
      updateExistingPaymentDoc: async () => true,
      createPlaceholder,
      completedSteps: [],
      setCompletedSteps,
      setStep,
      setIsCreatingPayment,
      setModalLoading,
      setFoundStripePayments,
      setShowEmailModal,
      replaceWithPaymentId,
      checkInput: {
        fetchPayments: async () => [],
        fetchBookingHasPaymentPlan: async () => false,
        selectedPackageName: "Tour A",
        tourDate: "2026-12-10",
      },
    });

    expect(createPlaceholder).toHaveBeenCalled();
    expect(setStep).toHaveBeenCalledWith(2);
    expect(replaceWithPaymentId).toHaveBeenCalledWith("doc-1");
    expect(setFoundStripePayments).not.toHaveBeenCalled();
    expect(setShowEmailModal).not.toHaveBeenCalled();
  });

  it("opens modal with records when show-modal decision is returned", async () => {
    const setFoundStripePayments = vi.fn();
    const setShowEmailModal = vi.fn();

    await runExistingPaymentsFlowAction({
      validate: () => true,
      isCreatingPayment: false,
      paymentDocId: null,
      updateExistingPaymentDoc: async () => true,
      createPlaceholder: async () => null,
      completedSteps: [],
      setCompletedSteps: vi.fn(),
      setStep: vi.fn(),
      setIsCreatingPayment: vi.fn(),
      setModalLoading: vi.fn(),
      setFoundStripePayments,
      setShowEmailModal,
      replaceWithPaymentId: vi.fn(),
      checkInput: {
        fetchPayments: async () => [
          {
            id: "a",
            payment: { type: "reservationFee", status: "reserve_pending" },
            tour: { packageName: "Tour B", date: "2026-12-11" },
          },
        ],
        fetchBookingHasPaymentPlan: async () => false,
        selectedPackageName: "Tour A",
        tourDate: "2026-12-10",
      },
    });

    expect(setFoundStripePayments).toHaveBeenCalled();
    expect(setShowEmailModal).toHaveBeenCalledWith(true);
  });
});
