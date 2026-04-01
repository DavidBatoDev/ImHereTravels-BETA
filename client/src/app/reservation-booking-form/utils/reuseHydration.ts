export type RestoredBookingState = {
  bookingType: string;
  groupSize: number;
  additionalGuests: string[];
  shouldMountGuests: boolean;
};

export const deriveBookingRestoreState = (record: {
  booking?: {
    type?: string;
    groupSize?: number;
    additionalGuests?: string[];
  };
}): RestoredBookingState => {
  const bookingType = record?.booking?.type || "Single Booking";
  const groupSize = record?.booking?.groupSize || 3;
  const shouldMountGuests =
    bookingType === "Duo Booking" || bookingType === "Group Booking";

  let additionalGuests: string[] = [];

  if (Array.isArray(record?.booking?.additionalGuests)) {
    if (bookingType === "Duo Booking") {
      additionalGuests = [record.booking.additionalGuests[0] || ""];
    } else if (bookingType === "Group Booking") {
      const maxGuests = Math.max(0, groupSize - 1);
      additionalGuests = record.booking.additionalGuests.slice(0, maxGuests);
      while (additionalGuests.length < maxGuests) {
        additionalGuests.push("");
      }
    }
  } else if (bookingType === "Duo Booking") {
    additionalGuests = [""];
  } else if (bookingType === "Group Booking") {
    additionalGuests = Array(Math.max(0, groupSize - 1)).fill("");
  }

  return {
    bookingType,
    groupSize,
    additionalGuests,
    shouldMountGuests,
  };
};

export const getPaymentPlanLabelFromRecord = (record: {
  payment?: { paymentPlanDetails?: { label?: string } };
  paymentPlanDetails?: { label?: string };
}): string | null => {
  return (
    record?.payment?.paymentPlanDetails?.label ||
    record?.paymentPlanDetails?.label ||
    null
  );
};
