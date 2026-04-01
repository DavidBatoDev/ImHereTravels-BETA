type GuestDetails = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
};

export type UpdateGuestGroupSizeResult = {
  groupSize: number;
  activeGuestTab: number;
  additionalGuests: string[];
  guestDetails: GuestDetails[];
};

export const updateGuestGroupSizeAction = ({
  bookingType,
  requestedGroupSize,
  activeGuestTab,
  additionalGuests,
  guestDetails,
}: {
  bookingType: string;
  requestedGroupSize: number;
  activeGuestTab: number;
  additionalGuests: string[];
  guestDetails: GuestDetails[];
}): UpdateGuestGroupSizeResult | null => {
  if (bookingType !== "Group Booking") {
    return null;
  }

  const clamped = Math.max(3, Math.min(20, requestedGroupSize || 3));
  const neededGuests = clamped - 1;

  const nextAdditionalGuests = additionalGuests.slice(0, neededGuests);
  while (nextAdditionalGuests.length < neededGuests) {
    nextAdditionalGuests.push("");
  }

  const nextGuestDetails = guestDetails.slice(0, neededGuests);
  while (nextGuestDetails.length < neededGuests) {
    nextGuestDetails.push({
      email: "",
      firstName: "",
      lastName: "",
      birthdate: "",
      nationality: "",
      whatsAppNumber: "",
      whatsAppCountry: "GB",
    });
  }

  return {
    groupSize: clamped,
    activeGuestTab: activeGuestTab > clamped ? 1 : activeGuestTab,
    additionalGuests: nextAdditionalGuests,
    guestDetails: nextGuestDetails,
  };
};
