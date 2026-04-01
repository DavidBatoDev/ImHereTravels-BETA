import { parseWhatsAppInternationalNumber } from "./phoneNumberParser";

export type RestoredCustomerState = {
  email?: string;
  firstName?: string;
  lastName?: string;
  birthdate?: string;
  nationality?: string;
  whatsAppCountry?: string;
  whatsAppNumber?: string;
};

export const deriveCustomerRestoreState = ({
  record,
  countries,
  getCallingCode,
  onUnmatchedPhone,
}: {
  record: {
    customer?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      birthdate?: string;
      nationality?: string;
      whatsAppNumber?: string;
    };
  };
  countries: string[];
  getCallingCode: (country: string) => string;
  onUnmatchedPhone: "ignore" | "set-number";
}): RestoredCustomerState => {
  const customer = record?.customer || {};
  const restored: RestoredCustomerState = {
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    birthdate: customer.birthdate,
    nationality: customer.nationality,
  };

  if (!customer.whatsAppNumber) {
    return restored;
  }

  const parsedWhatsApp = parseWhatsAppInternationalNumber({
    fullNumber: customer.whatsAppNumber,
    countries,
    getCallingCode,
    fallbackMode:
      onUnmatchedPhone === "set-number" ? "strip-plus" : "keep-original",
  });

  if (parsedWhatsApp.matched && parsedWhatsApp.country) {
    restored.whatsAppCountry = parsedWhatsApp.country;
    restored.whatsAppNumber = parsedWhatsApp.localNumber;
    return restored;
  }

  if (onUnmatchedPhone === "set-number") {
    restored.whatsAppNumber = parsedWhatsApp.localNumber;
  }

  return restored;
};
