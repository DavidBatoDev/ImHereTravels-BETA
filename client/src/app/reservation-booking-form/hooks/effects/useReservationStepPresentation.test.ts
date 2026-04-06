import { describe, expect, it } from "vitest";
import {
  getReservationProgressValue,
  getReservationStepDescription,
} from "./useReservationStepPresentation";

const baseArgs = {
  selectedPackage: { id: "tour-1" },
  bookingType: "Single Booking",
  depositAmount: 250,
  baseReservationFee: 250,
  numberOfPeople: 1,
  availablePaymentTerm: {
    isInvalid: false,
    isLastMinute: false,
  },
  tourDate: "2026-12-20",
  availablePaymentPlansCount: 4,
  canSelectStep3Plans: true,
};

describe("useReservationStepPresentation helpers", () => {
  it("returns Step 1 description", () => {
    const result = getReservationStepDescription({
      ...baseArgs,
      step: 1,
    });

    expect(result).toBe(
      "Fill in your personal details and choose your tour name and date.",
    );
  });

  it("returns Step 2 description for multi-traveler bookings", () => {
    const result = getReservationStepDescription({
      ...baseArgs,
      step: 2,
      bookingType: "Group Booking",
      numberOfPeople: 3,
      depositAmount: 750,
    });

    expect(result).toContain("Pay GBP 750.00 reservation fee");
    expect(result).toContain("x 3 people");
  });

  it("returns preview-locked Step 3 description before payment confirmation", () => {
    const result = getReservationStepDescription({
      ...baseArgs,
      step: 3,
      canSelectStep3Plans: false,
    });

    expect(result).toContain("Preview 4 available payment plans");
    expect(result).toContain("Complete Step 2 payment to unlock selection.");
  });

  it("returns selectable Step 3 description after payment confirmation", () => {
    const result = getReservationStepDescription({
      ...baseArgs,
      step: 3,
      canSelectStep3Plans: true,
    });

    expect(result).toContain("Pick from 4 payment plans");
    expect(result).toContain("based on your tour date");
  });

  it("maps actual workflow milestones to numeric progress value", () => {
    expect(getReservationProgressValue(false, false)).toBe(33.33);
    expect(getReservationProgressValue(true, false)).toBe(66.66);
    expect(getReservationProgressValue(true, true)).toBe(100);
    expect(getReservationProgressValue(false, true)).toBe(100);
  });
});
