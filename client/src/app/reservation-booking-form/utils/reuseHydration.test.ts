import { describe, expect, it } from "vitest";
import {
  deriveBookingRestoreState,
  getPaymentPlanLabelFromRecord,
} from "./reuseHydration";

describe("reuseHydration", () => {
  it("derives single booking defaults", () => {
    expect(deriveBookingRestoreState({})).toEqual({
      bookingType: "Single Booking",
      groupSize: 3,
      additionalGuests: [],
      shouldMountGuests: false,
    });
  });

  it("derives duo booking with one guest slot", () => {
    expect(
      deriveBookingRestoreState({
        booking: { type: "Duo Booking", additionalGuests: ["guest@email.com"] },
      }),
    ).toEqual({
      bookingType: "Duo Booking",
      groupSize: 3,
      additionalGuests: ["guest@email.com"],
      shouldMountGuests: true,
    });
  });

  it("derives group booking and pads guests to group size minus one", () => {
    expect(
      deriveBookingRestoreState({
        booking: {
          type: "Group Booking",
          groupSize: 5,
          additionalGuests: ["a", "b"],
        },
      }),
    ).toEqual({
      bookingType: "Group Booking",
      groupSize: 5,
      additionalGuests: ["a", "b", "", ""],
      shouldMountGuests: true,
    });
  });

  it("gets payment plan label from nested or top-level fields", () => {
    expect(
      getPaymentPlanLabelFromRecord({
        payment: { paymentPlanDetails: { label: "P3 Monthly" } },
      }),
    ).toBe("P3 Monthly");
    expect(
      getPaymentPlanLabelFromRecord({
        paymentPlanDetails: { label: "Full Payment" },
      }),
    ).toBe("Full Payment");
    expect(getPaymentPlanLabelFromRecord({})).toBeNull();
  });
});
