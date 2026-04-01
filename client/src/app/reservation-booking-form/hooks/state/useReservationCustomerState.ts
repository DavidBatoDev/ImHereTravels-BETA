import { useEffect, useState } from "react";
import { getNationalityCountryCode } from "../../utils/nationalityUtils";

export type ReservationGuestDetail = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
};

export type ReservationCustomerStateSlice = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  firstName: string;
  setFirstName: React.Dispatch<React.SetStateAction<string>>;
  lastName: string;
  setLastName: React.Dispatch<React.SetStateAction<string>>;
  errors: { [k: string]: string };
  setErrors: React.Dispatch<
    React.SetStateAction<{
      [k: string]: string;
    }>
  >;
  birthdate: string;
  setBirthdate: React.Dispatch<React.SetStateAction<string>>;
  nationality: string;
  setNationality: React.Dispatch<React.SetStateAction<string>>;
  whatsAppNumber: string;
  setWhatsAppNumber: React.Dispatch<React.SetStateAction<string>>;
  whatsAppCountry: string;
  setWhatsAppCountry: React.Dispatch<React.SetStateAction<string>>;
  bookingType: string;
  setBookingType: React.Dispatch<React.SetStateAction<string>>;
  groupSize: number;
  setGroupSize: React.Dispatch<React.SetStateAction<number>>;
  tourPackage: string;
  setTourPackage: React.Dispatch<React.SetStateAction<string>>;
  tourDate: string;
  setTourDate: React.Dispatch<React.SetStateAction<string>>;
  additionalGuests: string[];
  setAdditionalGuests: React.Dispatch<React.SetStateAction<string[]>>;
  activeGuestTab: number;
  setActiveGuestTab: React.Dispatch<React.SetStateAction<number>>;
  guestDetails: ReservationGuestDetail[];
  setGuestDetails: React.Dispatch<React.SetStateAction<ReservationGuestDetail[]>>;
};

export const useReservationCustomerState = (): ReservationCustomerStateSlice => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [birthdate, setBirthdate] = useState<string>("");
  const [nationality, setNationality] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [whatsAppCountry, setWhatsAppCountry] = useState("GB");
  const [bookingType, setBookingType] = useState("Single Booking");
  const [groupSize, setGroupSize] = useState<number>(3);
  const [tourPackage, setTourPackage] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [additionalGuests, setAdditionalGuests] = useState<string[]>([]);
  const [activeGuestTab, setActiveGuestTab] = useState(1);
  const [guestDetails, setGuestDetails] = useState<ReservationGuestDetail[]>(
    [],
  );

  // Keep existing behavior: update WhatsApp country from selected nationality.
  useEffect(() => {
    if (nationality) {
      const countryCode = getNationalityCountryCode(nationality);
      if (countryCode) {
        setWhatsAppCountry(countryCode);
      }
    }
  }, [nationality]);

  return {
    email,
    setEmail,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    errors,
    setErrors,
    birthdate,
    setBirthdate,
    nationality,
    setNationality,
    whatsAppNumber,
    setWhatsAppNumber,
    whatsAppCountry,
    setWhatsAppCountry,
    bookingType,
    setBookingType,
    groupSize,
    setGroupSize,
    tourPackage,
    setTourPackage,
    tourDate,
    setTourDate,
    additionalGuests,
    setAdditionalGuests,
    activeGuestTab,
    setActiveGuestTab,
    guestDetails,
    setGuestDetails,
  };
};


