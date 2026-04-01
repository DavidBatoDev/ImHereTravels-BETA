import { describe, expect, it } from "vitest";
import { buildReservationDraftPayload } from "./reservationDraftPayload";

describe("buildReservationDraftPayload", () => {
  it("builds single-booking payload with no guests", () => {
    const payload = buildReservationDraftPayload({
      email: "a@x.com",
      firstName: "A",
      lastName: "B",
      birthdate: "1990-01-01",
      nationality: "British",
      whatsAppNumber: "777123456",
      whatsAppCountry: "GB",
      bookingType: "Single Booking",
      groupSize: 3,
      guestDetails: [],
      tourPackage: "tour-1",
      tourPackageName: "Tour 1",
      tourDate: "2026-12-10",
      depositAmount: 250,
      safeGetCountryCallingCodeFn: () => "44",
    });

    expect(payload.booking.groupSize).toBe(1);
    expect(payload.booking.guestDetails).toEqual([]);
    expect(payload.customer.whatsAppNumber).toBe("+44777123456");
  });

  it("builds group-booking payload with transformed guest phones", () => {
    const payload = buildReservationDraftPayload({
      email: "a@x.com",
      firstName: "A",
      lastName: "B",
      birthdate: "1990-01-01",
      nationality: "British",
      whatsAppNumber: "777123456",
      whatsAppCountry: "GB",
      bookingType: "Group Booking",
      groupSize: 4,
      guestDetails: [
        {
          email: "g@x.com",
          firstName: "G",
          lastName: "H",
          birthdate: "1991-01-01",
          nationality: "British",
          whatsAppNumber: "888000111",
          whatsAppCountry: "GB",
        },
      ],
      tourPackage: "tour-1",
      tourPackageName: "Tour 1",
      tourDate: "2026-12-10",
      depositAmount: 500,
      customOriginal: 999,
      safeGetCountryCallingCodeFn: () => "44",
    });

    expect(payload.booking.groupSize).toBe(4);
    expect(payload.booking.guestDetails).toHaveLength(1);
    expect(payload.booking.guestDetails[0].whatsAppNumber).toBe("+44888000111");
    expect(payload.payment.originalPrice).toBe(999);
  });
});
