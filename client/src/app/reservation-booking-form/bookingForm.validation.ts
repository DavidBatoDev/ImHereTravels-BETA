import { isValidPhoneNumber } from "react-phone-number-input";
import type {
  GuestDetails,
  ValidationErrors,
} from "./bookingForm.types";
import { safeGetCountryCallingCode } from "./bookingForm.utils";

export interface StepOneValidationInput {
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
  guestDetails: GuestDetails[];
}

interface ValidateOptions {
  log?: boolean;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getAge = (birthdate: string) => {
  const [year, month, day] = birthdate.split("-").map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

const logIfEnabled = (enabled: boolean, ...args: unknown[]) => {
  if (!enabled) return;
  console.log(...args);
};

export const validateStepOne = (
  input: StepOneValidationInput,
  options: ValidateOptions = {},
): ValidationErrors => {
  const logEnabled = !!options.log;
  const errors: ValidationErrors = {};

  logIfEnabled(logEnabled, "Starting validation...");

  logIfEnabled(logEnabled, "Validating email:", input.email);
  if (!input.email) {
    errors.email = "Email is required";
  } else if (!isValidEmail(input.email)) {
    errors.email = "Enter a valid email";
  }

  logIfEnabled(logEnabled, "Validating birthdate:", input.birthdate);
  if (!input.birthdate) {
    errors.birthdate = "Birthdate is required";
  } else if (getAge(input.birthdate) < 18) {
    errors.birthdate = "Must be 18 years or older";
  }

  logIfEnabled(logEnabled, "Validating names:", {
    firstName: input.firstName,
    lastName: input.lastName,
  });
  if (!input.firstName) errors.firstName = "First name is required";
  if (!input.lastName) errors.lastName = "Last name is required";

  logIfEnabled(logEnabled, "Validating nationality:", input.nationality);
  if (!input.nationality) errors.nationality = "Nationality is required";

  logIfEnabled(logEnabled, "Validating booking details:", {
    bookingType: input.bookingType,
    tourPackage: input.tourPackage,
    tourDate: input.tourDate,
  });
  if (!input.bookingType) errors.bookingType = "Booking type is required";
  if (!input.tourPackage) errors.tourPackage = "Tour name is required";
  if (input.tourPackage && !input.tourDate) {
    errors.tourDate = "Tour date is required";
  }

  logIfEnabled(logEnabled, "Validating WhatsApp:", {
    whatsAppNumber: input.whatsAppNumber,
    whatsAppCountry: input.whatsAppCountry,
  });
  if (!input.whatsAppNumber) {
    errors.whatsAppNumber = "WhatsApp number is required";
    logIfEnabled(logEnabled, "WhatsApp number is empty");
  } else {
    const fullNumber = `+${safeGetCountryCallingCode(input.whatsAppCountry)}${input.whatsAppNumber}`;
    const isValid = isValidPhoneNumber(fullNumber);
    logIfEnabled(logEnabled, "WhatsApp validation:", { fullNumber, isValid });
    if (!isValid) {
      errors.whatsAppNumber = "Invalid WhatsApp number";
      logIfEnabled(logEnabled, "WhatsApp number is invalid");
    }
  }

  logIfEnabled(logEnabled, "Validating guest details:", {
    bookingType: input.bookingType,
    guestDetailsLength: input.guestDetails.length,
    guestDetails: input.guestDetails,
  });

  if (
    input.bookingType === "Duo Booking" ||
    input.bookingType === "Group Booking"
  ) {
    const expectedLength =
      input.bookingType === "Duo Booking" ? 1 : input.groupSize - 1;

    logIfEnabled(
      logEnabled,
      `Expected ${expectedLength} guests, found ${input.guestDetails.length}`,
    );

    if (input.guestDetails.length === 0) {
      errors.guests = "Guest details are required";
      logIfEnabled(logEnabled, "No guest details found");
    } else if (input.guestDetails.length !== expectedLength) {
      errors.guests = `Expected ${expectedLength} guest(s), but found ${input.guestDetails.length}`;
      logIfEnabled(logEnabled, "Wrong number of guests");
    } else {
      input.guestDetails.forEach((guest, idx) => {
        logIfEnabled(logEnabled, `Validating guest ${idx + 1}:`, guest);

        if (!guest.email) {
          errors[`guest-${idx}-email`] = `Guest ${idx + 1} email is required`;
          logIfEnabled(logEnabled, `Guest ${idx + 1} email missing`);
        } else if (!isValidEmail(guest.email)) {
          errors[`guest-${idx}-email`] = `Guest ${idx + 1} email is invalid`;
          logIfEnabled(logEnabled, `Guest ${idx + 1} email invalid`);
        }

        if (!guest.firstName) {
          errors[`guest-${idx}-firstName`] =
            `Guest ${idx + 1} first name is required`;
          logIfEnabled(logEnabled, `Guest ${idx + 1} firstName missing`);
        }

        if (!guest.lastName) {
          errors[`guest-${idx}-lastName`] =
            `Guest ${idx + 1} last name is required`;
          logIfEnabled(logEnabled, `Guest ${idx + 1} lastName missing`);
        }

        if (!guest.birthdate) {
          errors[`guest-${idx}-birthdate`] =
            `Guest ${idx + 1} birthdate is required`;
          logIfEnabled(logEnabled, `Guest ${idx + 1} birthdate missing`);
        }

        if (!guest.nationality) {
          errors[`guest-${idx}-nationality`] =
            `Guest ${idx + 1} nationality is required`;
          logIfEnabled(logEnabled, `Guest ${idx + 1} nationality missing`);
        }

        if (!guest.whatsAppNumber) {
          errors[`guest-${idx}-whatsAppNumber`] =
            `Guest ${idx + 1} WhatsApp is required`;
          logIfEnabled(logEnabled, `Guest ${idx + 1} whatsAppNumber missing`);
        } else {
          const fullNumber = `+${safeGetCountryCallingCode(guest.whatsAppCountry)}${guest.whatsAppNumber}`;
          const isValid = isValidPhoneNumber(fullNumber);
          logIfEnabled(logEnabled, `Guest ${idx + 1} WhatsApp validation:`, {
            fullNumber,
            isValid,
          });

          if (!isValid) {
            errors[`guest-${idx}-whatsAppNumber`] =
              `Guest ${idx + 1} WhatsApp is invalid`;
            logIfEnabled(logEnabled, `Guest ${idx + 1} whatsAppNumber invalid`);
          }
        }
      });
    }
  }

  logIfEnabled(logEnabled, "Validation errors:", errors);
  logIfEnabled(
    logEnabled,
    "Validation result:",
    Object.keys(errors).length === 0 ? "PASSED" : "FAILED",
  );

  return errors;
};

export const isStepOneReady = (input: StepOneValidationInput): boolean => {
  return Object.keys(validateStepOne(input, { log: false })).length === 0;
};
