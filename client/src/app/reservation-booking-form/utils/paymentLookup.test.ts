import { describe, expect, it } from "vitest";
import {
  canDiscardExistingPayment,
  decideExistingPaymentNextStep,
  getBookingDocumentIdFromPayment,
  getExistingPaymentDisplayState,
  getExistingPaymentModalTitle,
  getExistingPaymentPrimaryActionLabel,
  getPaymentStatus,
  getPreferredBookingDocumentId,
  getReuseExistingFlow,
  getStripePaymentSessionStorageKey,
  isPaidOrConfirmedStatus,
  isPendingReservationStatus,
  isReservationFeePayment,
  shouldCheckBookingForPaymentPlan,
  shouldShowPendingReservationMessage,
} from "./paymentLookup";

describe("paymentLookup utilities", () => {
  it("filters reservation fee payments correctly", () => {
    expect(
      isReservationFeePayment({ payment: { type: "reservationFee" } }),
    ).toBe(true);
    expect(isReservationFeePayment({ payment: { type: "installment" } })).toBe(
      false,
    );
    expect(isReservationFeePayment({})).toBe(true);
  });

  it("resolves payment status from nested or top-level fields", () => {
    expect(getPaymentStatus({ payment: { status: "reserve_paid" } })).toBe(
      "reserve_paid",
    );
    expect(getPaymentStatus({ status: "reserve_pending" })).toBe(
      "reserve_pending",
    );
    expect(getPaymentStatus({})).toBe("");
  });

  it("classifies payment statuses for flow decisions", () => {
    expect(isPaidOrConfirmedStatus("reserve_paid")).toBe(true);
    expect(isPaidOrConfirmedStatus("terms_selected")).toBe(true);
    expect(isPaidOrConfirmedStatus("reserve_pending")).toBe(false);

    expect(isPendingReservationStatus("reserve_pending")).toBe(true);
    expect(isPendingReservationStatus("pending")).toBe(true);
    expect(isPendingReservationStatus("reserve_paid")).toBe(false);

    expect(canDiscardExistingPayment("reserve_pending")).toBe(true);
    expect(canDiscardExistingPayment("reserve_paid")).toBe(false);
  });

  it("extracts valid booking document id only when usable", () => {
    expect(
      getBookingDocumentIdFromPayment({ booking: { documentId: "doc-1" } }),
    ).toBe("doc-1");
    expect(getBookingDocumentIdFromPayment({ booking: { id: "doc-2" } })).toBe(
      "doc-2",
    );
    expect(
      getBookingDocumentIdFromPayment({ booking: { documentId: "PENDING" } }),
    ).toBeNull();
    expect(getBookingDocumentIdFromPayment({})).toBeNull();
  });

  it("flags reserve_paid bookings for payment plan check", () => {
    expect(
      shouldCheckBookingForPaymentPlan({
        payment: { status: "reserve_paid" },
        booking: { documentId: "doc-1" },
      }),
    ).toBe(true);

    expect(
      shouldCheckBookingForPaymentPlan({
        payment: { status: "reserve_pending" },
        booking: { documentId: "doc-1" },
      }),
    ).toBe(false);
  });

  it("decides next step for placeholder or modal with exact match preference", () => {
    expect(
      decideExistingPaymentNextStep({
        records: [],
        selectedPackageName: "Tour A",
        tourDate: "2026-12-20",
      }),
    ).toEqual({ type: "create-placeholder" });

    const records = [
      {
        id: "a",
        tour: { packageName: "Tour A", date: "2026-12-20" },
      },
      {
        id: "b",
        tour: { packageName: "Tour B", date: "2026-11-10" },
      },
    ];

    expect(
      decideExistingPaymentNextStep({
        records,
        selectedPackageName: "Tour A",
        tourDate: "2026-12-20",
      }),
    ).toEqual({
      type: "show-modal",
      records: [records[0]],
      exactMatchFound: true,
    });

    expect(
      decideExistingPaymentNextStep({
        records,
        selectedPackageName: "Tour Z",
        tourDate: "2026-10-10",
      }),
    ).toEqual({
      type: "show-modal",
      records,
      exactMatchFound: false,
    });
  });

  it("derives modal title, banner visibility, and action labels", () => {
    expect(
      getExistingPaymentModalTitle([{ payment: { status: "reserve_paid" } }]),
    ).toBe("Complete Your Booking");
    expect(getExistingPaymentModalTitle([{ status: "reserve_pending" }])).toBe(
      "Existing Reservation Found",
    );

    expect(
      shouldShowPendingReservationMessage([{ status: "reserve_pending" }]),
    ).toBe(true);
    expect(
      shouldShowPendingReservationMessage([{ status: "reserve_paid" }]),
    ).toBe(false);

    expect(
      getExistingPaymentDisplayState({
        payment: { status: "reserve_paid" },
        _hasPaymentPlan: true,
      }),
    ).toBe("confirmed");
    expect(
      getExistingPaymentDisplayState({
        payment: { status: "reserve_paid" },
        _hasPaymentPlan: false,
      }),
    ).toBe("awaiting-plan");
    expect(getExistingPaymentDisplayState({ status: "reserve_pending" })).toBe(
      "pending",
    );

    expect(
      getExistingPaymentPrimaryActionLabel({
        payment: { status: "reserve_paid" },
        _hasPaymentPlan: true,
      }),
    ).toBe("View Booking");
    expect(
      getExistingPaymentPrimaryActionLabel({
        payment: { status: "reserve_paid" },
        _hasPaymentPlan: false,
      }),
    ).toBe("Complete Payment Plan");
    expect(
      getExistingPaymentPrimaryActionLabel({ status: "reserve_pending" }),
    ).toBe("Use This");
  });

  it("maps reuse flow by payment status", () => {
    expect(getReuseExistingFlow("reserve_paid")).toBe("reserve-paid");
    expect(getReuseExistingFlow("reserve_pending")).toBe("reserve-pending");
    expect(getReuseExistingFlow("pending")).toBe("reserve-pending");
    expect(getReuseExistingFlow("terms_selected")).toBe("terms-selected");
    expect(getReuseExistingFlow("unknown")).toBe("fallback");
  });

  it("resolves preferred booking document id and storage key", () => {
    expect(
      getPreferredBookingDocumentId({
        bookingId: "legacy-booking-id",
        booking: { id: "new-booking-id" },
      }),
    ).toBe("legacy-booking-id");

    expect(
      getPreferredBookingDocumentId({ booking: { documentId: "doc-1" } }),
    ).toBe("doc-1");
    expect(
      getPreferredBookingDocumentId({ booking: { documentId: "PENDING" } }),
    ).toBeNull();

    expect(
      getStripePaymentSessionStorageKey({
        fallbackEmail: "fallback@example.com",
        fallbackTourPackage: "tour-a",
        payment: {
          customer: { email: "user@example.com" },
          tour: { packageId: "tour-b" },
        },
      }),
    ).toBe("stripe_payment_doc_user@example.com_tour-b");

    expect(
      getStripePaymentSessionStorageKey({
        fallbackEmail: "fallback@example.com",
        fallbackTourPackage: "tour-a",
        payment: {},
      }),
    ).toBe("stripe_payment_doc_fallback@example.com_tour-a");
  });
});
