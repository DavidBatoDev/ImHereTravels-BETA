import { describe, expect, it } from "vitest";
import {
  applyStateUpdate,
  createInitialReservationFlowState,
  reservationFlowReducer,
} from "./useReservationFlowState";

describe("applyStateUpdate", () => {
  it("applies direct values", () => {
    expect(applyStateUpdate(1, 2)).toBe(2);
  });

  it("applies updater functions", () => {
    expect(applyStateUpdate(1, (prev) => prev + 2)).toBe(3);
  });
});

describe("reservationFlowReducer", () => {
  it("updates step and completed steps", () => {
    let state = createInitialReservationFlowState();

    state = reservationFlowReducer(state, {
      type: "setStep",
      update: 2,
    });
    state = reservationFlowReducer(state, {
      type: "setCompletedSteps",
      update: (prev) => [...prev, 1],
    });

    expect(state.step).toBe(2);
    expect(state.completedSteps).toEqual([1]);
  });

  it("updates payment and booking flags", () => {
    let state = createInitialReservationFlowState();

    state = reservationFlowReducer(state, {
      type: "setPaymentConfirmed",
      update: true,
    });
    state = reservationFlowReducer(state, {
      type: "setBookingConfirmed",
      update: true,
    });

    expect(state.paymentConfirmed).toBe(true);
    expect(state.bookingConfirmed).toBe(true);
  });

  it("updates ids, modal state, and payment record list", () => {
    let state = createInitialReservationFlowState();

    state = reservationFlowReducer(state, {
      type: "setBookingId",
      update: "booking-1",
    });
    state = reservationFlowReducer(state, {
      type: "setPaymentDocId",
      update: "payment-1",
    });
    state = reservationFlowReducer(state, {
      type: "setShowEmailModal",
      update: true,
    });
    state = reservationFlowReducer(state, {
      type: "setModalLoading",
      update: true,
    });
    state = reservationFlowReducer(state, {
      type: "setFoundStripePayments",
      update: [{ id: "payment-1" }],
    });

    expect(state.bookingId).toBe("booking-1");
    expect(state.paymentDocId).toBe("payment-1");
    expect(state.showEmailModal).toBe(true);
    expect(state.modalLoading).toBe(true);
    expect(state.foundStripePayments).toEqual([{ id: "payment-1" }]);
  });
});
