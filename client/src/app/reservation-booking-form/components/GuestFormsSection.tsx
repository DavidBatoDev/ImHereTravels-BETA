import { AnimatePresence } from "framer-motion";
import GuestForm from "./GuestForm";

type GuestDetails = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
};

type GuestFormsSectionProps = {
  bookingType: string;
  activeGuestTab: number;
  guestDetails: GuestDetails[];
  errors: { [k: string]: string };
  paymentConfirmed: boolean;
  onGuestDetailsUpdate: (index: number, data: GuestDetails) => void;
};

export default function GuestFormsSection({
  bookingType,
  activeGuestTab,
  guestDetails,
  errors,
  paymentConfirmed,
  onGuestDetailsUpdate,
}: GuestFormsSectionProps) {
  const shouldShow =
    bookingType === "Duo Booking" || bookingType === "Group Booking";

  if (!shouldShow) {
    return null;
  }

  const guestIndex = activeGuestTab - 2;
  const isGuestIndexInRange =
    guestIndex >= 0 && guestIndex < guestDetails.length;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isGuestIndexInRange ? (
        <GuestForm
          key={`guest-${guestIndex}`}
          index={guestIndex}
          initialData={guestDetails[guestIndex]}
          onUpdate={onGuestDetailsUpdate}
          errors={errors}
          paymentConfirmed={paymentConfirmed}
        />
      ) : null}
    </AnimatePresence>
  );
}
