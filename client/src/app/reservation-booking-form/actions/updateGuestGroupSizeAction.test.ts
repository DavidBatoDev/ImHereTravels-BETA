import { describe, expect, it } from "vitest";
import { updateGuestGroupSizeAction } from "./updateGuestGroupSizeAction";

describe("updateGuestGroupSizeAction", () => {
  it("returns null for non-group bookings", () => {
    const result = updateGuestGroupSizeAction({
      bookingType: "Single Booking",
      requestedGroupSize: 5,
      activeGuestTab: 3,
      additionalGuests: ["a", "b"],
      guestDetails: [],
    });

    expect(result).toBeNull();
  });

  it("clamps size and resets tab when out of range", () => {
    const result = updateGuestGroupSizeAction({
      bookingType: "Group Booking",
      requestedGroupSize: 2,
      activeGuestTab: 8,
      additionalGuests: ["a", "b", "c"],
      guestDetails: [
        {
          email: "a@x.com",
          firstName: "A",
          lastName: "A",
          birthdate: "1990-01-01",
          nationality: "GB",
          whatsAppNumber: "1",
          whatsAppCountry: "GB",
        },
      ],
    });

    expect(result?.groupSize).toBe(3);
    expect(result?.activeGuestTab).toBe(1);
    expect(result?.additionalGuests).toEqual(["a", "b"]);
    expect(result?.guestDetails).toHaveLength(2);
    expect(result?.guestDetails[1].whatsAppCountry).toBe("GB");
  });

  it("caps large group size at 20 and pads guest arrays", () => {
    const result = updateGuestGroupSizeAction({
      bookingType: "Group Booking",
      requestedGroupSize: 25,
      activeGuestTab: 3,
      additionalGuests: [],
      guestDetails: [],
    });

    expect(result?.groupSize).toBe(20);
    expect(result?.activeGuestTab).toBe(3);
    expect(result?.additionalGuests).toHaveLength(19);
    expect(result?.guestDetails).toHaveLength(19);
  });
});
