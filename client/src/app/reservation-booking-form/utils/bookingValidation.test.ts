import { describe, expect, it } from "vitest";
import { validateReservationStep1 } from "./bookingValidation";

const validGuest = {
  email: "guest@example.com",
  firstName: "Guest",
  lastName: "Traveler",
  birthdate: "1990-01-10",
  nationality: "Philippines",
  whatsAppNumber: "9123456789",
  whatsAppCountry: "PH",
};

const baseInput = {
  email: "owner@example.com",
  firstName: "Owner",
  lastName: "Traveler",
  birthdate: "1990-02-10",
  nationality: "Philippines",
  whatsAppNumber: "9123456789",
  whatsAppCountry: "PH",
  bookingType: "Single Booking",
  groupSize: 3,
  tourPackage: "pkg-1",
  tourDate: "2026-12-20",
  guestDetails: [] as (typeof validGuest)[],
};

const deps = {
  safeGetCountryCallingCodeFn: () => "63",
  isValidPhoneNumberFn: (value: string) =>
    value.startsWith("+63") && value.length >= 13,
  now: new Date("2026-03-30T12:00:00Z"),
};

describe("validateReservationStep1", () => {
  it("passes for a valid single booking payload", () => {
    const result = validateReservationStep1(baseInput, deps);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.firstGuestTabToFocus).toBeNull();
  });

  it("returns required errors when key fields are missing", () => {
    const result = validateReservationStep1(
      {
        ...baseInput,
        email: "",
        birthdate: "",
        nationality: "",
        tourPackage: "",
      },
      deps,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe("Email is required");
    expect(result.errors.birthdate).toBe("Birthdate is required");
    expect(result.errors.nationality).toBe("Nationality is required");
    expect(result.errors.tourPackage).toBe("Tour name is required");
  });

  it("keeps age validation behavior for under-18 travelers", () => {
    const result = validateReservationStep1(
      {
        ...baseInput,
        birthdate: "2010-04-01",
      },
      deps,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.birthdate).toBe("Must be 18 years or older");
  });

  it("enforces duo/group guest count expectations", () => {
    const duoResult = validateReservationStep1(
      {
        ...baseInput,
        bookingType: "Duo Booking",
        guestDetails: [],
      },
      deps,
    );

    expect(duoResult.errors.guests).toBe("Guest details are required");
    expect(duoResult.firstGuestTabToFocus).toBeNull();

    const groupResult = validateReservationStep1(
      {
        ...baseInput,
        bookingType: "Group Booking",
        groupSize: 4,
        guestDetails: [validGuest],
      },
      deps,
    );

    expect(groupResult.errors.guests).toBe("Expected 3 guest(s), but found 1");
  });

  it("returns per-guest field errors and points to first invalid guest tab", () => {
    const result = validateReservationStep1(
      {
        ...baseInput,
        bookingType: "Duo Booking",
        guestDetails: [
          {
            ...validGuest,
            email: "bad-email",
            whatsAppNumber: "",
          },
        ],
      },
      deps,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors["guest-0-email"]).toBe("Guest 1 email is invalid");
    expect(result.errors["guest-0-whatsAppNumber"]).toBe(
      "Guest 1 WhatsApp is required",
    );
    expect(result.firstGuestTabToFocus).toBe(2);
  });
});
