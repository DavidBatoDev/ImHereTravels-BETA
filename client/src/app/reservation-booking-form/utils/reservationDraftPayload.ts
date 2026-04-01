export type ReservationDraftGuest = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
};

export type BuildReservationDraftPayloadInput = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
  bookingType: string;
  groupSize: number;
  guestDetails: ReservationDraftGuest[];
  tourPackage: string;
  tourPackageName: string;
  tourDate: string;
  depositAmount: number;
  customOriginal?: number;
  safeGetCountryCallingCodeFn: (countryCode: string) => string;
};

const deriveGroupSize = (bookingType: string, groupSize: number): number => {
  if (bookingType === "Group Booking") return groupSize;
  if (bookingType === "Duo Booking") return 2;
  return 1;
};

const mapGuest = (
  guest: ReservationDraftGuest,
  safeGetCountryCallingCodeFn: (countryCode: string) => string,
) => ({
  email: guest.email,
  firstName: guest.firstName,
  lastName: guest.lastName,
  birthdate: guest.birthdate,
  nationality: guest.nationality,
  whatsAppNumber: guest.whatsAppNumber
    ? `+${safeGetCountryCallingCodeFn(guest.whatsAppCountry)}${guest.whatsAppNumber}`
    : "",
});

export const buildReservationDraftPayload = ({
  email,
  firstName,
  lastName,
  birthdate,
  nationality,
  whatsAppNumber,
  whatsAppCountry,
  bookingType,
  groupSize,
  guestDetails,
  tourPackage,
  tourPackageName,
  tourDate,
  depositAmount,
  customOriginal,
  safeGetCountryCallingCodeFn,
}: BuildReservationDraftPayloadInput) => {
  return {
    customer: {
      email,
      firstName,
      lastName,
      birthdate,
      nationality,
      whatsAppNumber: whatsAppNumber
        ? `+${safeGetCountryCallingCodeFn(whatsAppCountry)}${whatsAppNumber}`
        : "",
    },
    booking: {
      type: bookingType,
      groupSize: deriveGroupSize(bookingType, groupSize),
      guestDetails:
        bookingType === "Duo Booking" || bookingType === "Group Booking"
          ? guestDetails.map((guest) =>
              mapGuest(guest, safeGetCountryCallingCodeFn),
            )
          : [],
      id: "PENDING",
      documentId: "",
    },
    tour: {
      packageId: tourPackage,
      packageName: tourPackageName,
      date: tourDate,
    },
    payment: {
      amount: depositAmount,
      currency: "GBP",
      status: "reserve_pending",
      type: "reservationFee",
      ...(customOriginal ? { originalPrice: customOriginal } : {}),
    },
  };
};
