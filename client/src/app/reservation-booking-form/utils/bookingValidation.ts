export type BookingGuestDetails = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
};

export type BookingValidationInput = {
  email: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  nationality: string;
  whatsAppNumber: string;
  whatsAppCountry: string;
  bookingType: string;
  groupSize: number;
  tourPackage: string;
  tourDate: string;
  guestDetails: BookingGuestDetails[];
};

export type BookingValidationDeps = {
  isValidPhoneNumberFn: (fullNumber: string) => boolean;
  safeGetCountryCallingCodeFn: (countryCode: string) => string;
  now?: Date;
};

export type BookingValidationResult = {
  errors: { [k: string]: string };
  isValid: boolean;
  firstGuestTabToFocus: number | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getAge = (birthdate: string, now: Date): number => {
  const [year, month, day] = birthdate.split("-").map(Number);
  const birthDate = new Date(year, month - 1, day);

  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

const getFirstGuestTabToFocus = (errors: {
  [k: string]: string;
}): number | null => {
  const firstGuestErrorKey = Object.keys(errors).find(
    (key) => key === "guests" || key.startsWith("guest-"),
  );

  if (!firstGuestErrorKey) {
    return null;
  }

  const match = firstGuestErrorKey.match(/^guest-(\d+)/);
  if (!match) {
    return null;
  }

  const guestIdx = Number(match[1]);
  // guestIdx is zero-based; tabs are 1 (main) then 2... for guests
  return guestIdx + 2;
};

export const validateReservationStep1 = (
  input: BookingValidationInput,
  deps: BookingValidationDeps,
): BookingValidationResult => {
  const {
    email,
    firstName,
    lastName,
    birthdate,
    nationality,
    whatsAppNumber,
    whatsAppCountry,
    bookingType,
    groupSize,
    tourPackage,
    tourDate,
    guestDetails,
  } = input;

  const {
    isValidPhoneNumberFn,
    safeGetCountryCallingCodeFn,
    now = new Date(),
  } = deps;

  const errors: { [k: string]: string } = {};

  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Enter a valid email";
  }

  if (!birthdate) {
    errors.birthdate = "Birthdate is required";
  } else if (getAge(birthdate, now) < 18) {
    errors.birthdate = "Must be 18 years or older";
  }

  if (!firstName) {
    errors.firstName = "First name is required";
  }

  if (!lastName) {
    errors.lastName = "Last name is required";
  }

  if (!nationality) {
    errors.nationality = "Nationality is required";
  }

  if (!bookingType) {
    errors.bookingType = "Booking type is required";
  }

  if (!tourPackage) {
    errors.tourPackage = "Tour name is required";
  }

  if (tourPackage && !tourDate) {
    errors.tourDate = "Tour date is required";
  }

  if (!whatsAppNumber) {
    errors.whatsAppNumber = "WhatsApp number is required";
  } else {
    const fullNumber = `+${safeGetCountryCallingCodeFn(whatsAppCountry)}${whatsAppNumber}`;
    const isValid = isValidPhoneNumberFn(fullNumber);

    if (!isValid) {
      errors.whatsAppNumber = "Invalid WhatsApp number";
    }
  }

  if (bookingType === "Duo Booking" || bookingType === "Group Booking") {
    const expectedLength = bookingType === "Duo Booking" ? 1 : groupSize - 1;

    if (guestDetails.length === 0) {
      errors.guests = "Guest details are required";
    } else if (guestDetails.length !== expectedLength) {
      errors.guests = `Expected ${expectedLength} guest(s), but found ${guestDetails.length}`;
    } else {
      guestDetails.forEach((guest, idx) => {
        if (!guest.email) {
          errors[`guest-${idx}-email`] = `Guest ${idx + 1} email is required`;
        } else if (!EMAIL_REGEX.test(guest.email)) {
          errors[`guest-${idx}-email`] = `Guest ${idx + 1} email is invalid`;
        }

        if (!guest.firstName) {
          errors[`guest-${idx}-firstName`] =
            `Guest ${idx + 1} first name is required`;
        }

        if (!guest.lastName) {
          errors[`guest-${idx}-lastName`] =
            `Guest ${idx + 1} last name is required`;
        }

        if (!guest.birthdate) {
          errors[`guest-${idx}-birthdate`] =
            `Guest ${idx + 1} birthdate is required`;
        }

        if (!guest.nationality) {
          errors[`guest-${idx}-nationality`] =
            `Guest ${idx + 1} nationality is required`;
        }

        if (!guest.whatsAppNumber) {
          errors[`guest-${idx}-whatsAppNumber`] =
            `Guest ${idx + 1} WhatsApp is required`;
        } else {
          const fullNumber = `+${safeGetCountryCallingCodeFn(guest.whatsAppCountry)}${guest.whatsAppNumber}`;
          const isValid = isValidPhoneNumberFn(fullNumber);

          if (!isValid) {
            errors[`guest-${idx}-whatsAppNumber`] =
              `Guest ${idx + 1} WhatsApp is invalid`;
          }
        }
      });
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    firstGuestTabToFocus: getFirstGuestTabToFocus(errors),
  };
};
