import { getCountryCallingCode } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import type {
  AvailablePaymentPlanOption,
  AvailablePaymentTerm,
  PaymentScheduleItem,
  PaymentTerm,
} from "./bookingForm.types";

const countryData: Record<
  string,
  { alpha3: string; flag: string; maxLength: number }
> = {
  US: { alpha3: "USA", flag: "\uD83C\uDDFA\uD83C\uDDF8", maxLength: 10 },
  GB: { alpha3: "GBR", flag: "\uD83C\uDDEC\uD83C\uDDE7", maxLength: 10 },
  PH: { alpha3: "PHL", flag: "\uD83C\uDDF5\uD83C\uDDED", maxLength: 10 },
  JP: { alpha3: "JPN", flag: "\uD83C\uDDEF\uD83C\uDDF5", maxLength: 10 },
  CN: { alpha3: "CHN", flag: "\uD83C\uDDE8\uD83C\uDDF3", maxLength: 11 },
  IN: { alpha3: "IND", flag: "\uD83C\uDDEE\uD83C\uDDF3", maxLength: 10 },
  AU: { alpha3: "AUS", flag: "\uD83C\uDDE6\uD83C\uDDFA", maxLength: 9 },
  CA: { alpha3: "CAN", flag: "\uD83C\uDDE8\uD83C\uDDE6", maxLength: 10 },
  DE: { alpha3: "DEU", flag: "\uD83C\uDDE9\uD83C\uDDEA", maxLength: 11 },
  FR: { alpha3: "FRA", flag: "\uD83C\uDDEB\uD83C\uDDF7", maxLength: 9 },
  IT: { alpha3: "ITA", flag: "\uD83C\uDDEE\uD83C\uDDF9", maxLength: 10 },
  ES: { alpha3: "ESP", flag: "\uD83C\uDDEA\uD83C\uDDF8", maxLength: 9 },
  BR: { alpha3: "BRA", flag: "\uD83C\uDDE7\uD83C\uDDF7", maxLength: 11 },
  MX: { alpha3: "MEX", flag: "\uD83C\uDDF2\uD83C\uDDFD", maxLength: 10 },
  KR: { alpha3: "KOR", flag: "\uD83C\uDDF0\uD83C\uDDF7", maxLength: 10 },
  SG: { alpha3: "SGP", flag: "\uD83C\uDDF8\uD83C\uDDEC", maxLength: 8 },
  MY: { alpha3: "MYS", flag: "\uD83C\uDDF2\uD83C\uDDFE", maxLength: 10 },
  TH: { alpha3: "THA", flag: "\uD83C\uDDF9\uD83C\uDDED", maxLength: 9 },
  VN: { alpha3: "VNM", flag: "\uD83C\uDDFB\uD83C\uDDF3", maxLength: 10 },
  ID: { alpha3: "IDN", flag: "\uD83C\uDDEE\uD83C\uDDE9", maxLength: 11 },
  NZ: { alpha3: "NZL", flag: "\uD83C\uDDF3\uD83C\uDDFF", maxLength: 9 },
  AE: { alpha3: "ARE", flag: "\uD83C\uDDE6\uD83C\uDDEA", maxLength: 9 },
  SA: { alpha3: "SAU", flag: "\uD83C\uDDF8\uD83C\uDDE6", maxLength: 9 },
  ZA: { alpha3: "ZAF", flag: "\uD83C\uDDFF\uD83C\uDDE6", maxLength: 9 },
  RU: { alpha3: "RUS", flag: "\uD83C\uDDF7\uD83C\uDDFA", maxLength: 10 },
  TR: { alpha3: "TUR", flag: "\uD83C\uDDF9\uD83C\uDDF7", maxLength: 10 },
  NL: { alpha3: "NLD", flag: "\uD83C\uDDF3\uD83C\uDDF1", maxLength: 9 },
  SE: { alpha3: "SWE", flag: "\uD83C\uDDF8\uD83C\uDDEA", maxLength: 9 },
  CH: { alpha3: "CHE", flag: "\uD83C\uDDE8\uD83C\uDDED", maxLength: 9 },
  PL: { alpha3: "POL", flag: "\uD83C\uDDF5\uD83C\uDDF1", maxLength: 9 },
  BE: { alpha3: "BEL", flag: "\uD83C\uDDE7\uD83C\uDDEA", maxLength: 9 },
  AT: { alpha3: "AUT", flag: "\uD83C\uDDE6\uD83C\uDDF9", maxLength: 10 },
  NO: { alpha3: "NOR", flag: "\uD83C\uDDF3\uD83C\uDDF4", maxLength: 8 },
  DK: { alpha3: "DNK", flag: "\uD83C\uDDE9\uD83C\uDDF0", maxLength: 8 },
  FI: { alpha3: "FIN", flag: "\uD83C\uDDEB\uD83C\uDDEE", maxLength: 9 },
  IE: { alpha3: "IRL", flag: "\uD83C\uDDEE\uD83C\uDDEA", maxLength: 9 },
  PT: { alpha3: "PRT", flag: "\uD83C\uDDF5\uD83C\uDDF9", maxLength: 9 },
  GR: { alpha3: "GRC", flag: "\uD83C\uDDEC\uD83C\uDDF7", maxLength: 10 },
  CZ: { alpha3: "CZE", flag: "\uD83C\uDDE8\uD83C\uDDFF", maxLength: 9 },
  HU: { alpha3: "HUN", flag: "\uD83C\uDDED\uD83C\uDDFA", maxLength: 9 },
  RO: { alpha3: "ROU", flag: "\uD83C\uDDF7\uD83C\uDDF4", maxLength: 9 },
  IL: { alpha3: "ISR", flag: "\uD83C\uDDEE\uD83C\uDDF1", maxLength: 9 },
  EG: { alpha3: "EGY", flag: "\uD83C\uDDEA\uD83C\uDDEC", maxLength: 10 },
  AR: { alpha3: "ARG", flag: "\uD83C\uDDE6\uD83C\uDDF7", maxLength: 10 },
  CL: { alpha3: "CHL", flag: "\uD83C\uDDE8\uD83C\uDDF1", maxLength: 9 },
  CO: { alpha3: "COL", flag: "\uD83C\uDDE8\uD83C\uDDF4", maxLength: 10 },
  PE: { alpha3: "PER", flag: "\uD83C\uDDF5\uD83C\uDDEA", maxLength: 9 },
  HK: { alpha3: "HKG", flag: "\uD83C\uDDED\uD83C\uDDF0", maxLength: 8 },
  TW: { alpha3: "TWN", flag: "\uD83C\uDDF9\uD83C\uDDFC", maxLength: 9 },
  PK: { alpha3: "PAK", flag: "\uD83C\uDDF5\uD83C\uDDF0", maxLength: 10 },
  BD: { alpha3: "BGD", flag: "\uD83C\uDDE7\uD83C\uDDE9", maxLength: 10 },
  NG: { alpha3: "NGA", flag: "\uD83C\uDDF3\uD83C\uDDEC", maxLength: 10 },
  KE: { alpha3: "KEN", flag: "\uD83C\uDDF0\uD83C\uDDEA", maxLength: 9 },
  UA: { alpha3: "UKR", flag: "\uD83C\uDDFA\uD83C\uDDE6", maxLength: 9 },
};

export const safeGetCountryCallingCode = (countryCode: string): string => {
  try {
    return getCountryCallingCode(countryCode as Country);
  } catch (error) {
    console.warn(`Unknown country code for phone: ${countryCode}`);
    return "1";
  }
};

export const formatPhoneNumberForStorage = (
  countryCode: string,
  nationalNumber: string,
): string => {
  if (!nationalNumber) return "";
  return `+${safeGetCountryCallingCode(countryCode)}${nationalNumber}`;
};

export const parseStoredPhoneNumber = (
  fullNumber: string,
  countries: string[],
  fallbackCountry = "GB",
): { countryCode: string; nationalNumber: string } => {
  if (!fullNumber || !fullNumber.startsWith("+")) {
    return {
      countryCode: fallbackCountry,
      nationalNumber: fullNumber?.replace(/^\+/, "") || "",
    };
  }

  for (const country of countries) {
    const callingCode = safeGetCountryCallingCode(country);
    if (fullNumber.startsWith(`+${callingCode}`)) {
      return {
        countryCode: country,
        nationalNumber: fullNumber.slice(callingCode.length + 1),
      };
    }
  }

  return {
    countryCode: fallbackCountry,
    nationalNumber: fullNumber.replace(/^\+/, ""),
  };
};

export const getCountryData = (countryCode: string) => {
  return (
    countryData[countryCode] || {
      alpha3: countryCode.toUpperCase(),
      flag: countryCode
        .toUpperCase()
        .split("")
        .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join(""),
      maxLength: 15,
    }
  );
};

export const calculateDaysBetween = (tourDateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tourDate = new Date(tourDateStr);
  tourDate.setHours(0, 0, 0, 0);

  const diffTime = tourDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isTourAllDatesTooSoon = (pkg?: { travelDates?: string[] }): boolean => {
  if (!pkg) return false;

  const validDates = (pkg.travelDates ?? []).filter(Boolean);
  return (
    validDates.length > 0 &&
    validDates.every((date) => calculateDaysBetween(date) < 2)
  );
};

export const getAvailablePaymentTerm = (
  tourDate: string,
): AvailablePaymentTerm => {
  if (!tourDate) {
    return { term: "", isLastMinute: false, isInvalid: false };
  }

  const daysBetween = calculateDaysBetween(tourDate);

  if (daysBetween < 2) {
    return { term: "invalid", isLastMinute: false, isInvalid: true };
  }

  if (daysBetween >= 2 && daysBetween < 30) {
    return { term: "full_payment", isLastMinute: true, isInvalid: false };
  }

  const today = new Date();
  const tourDateObj = new Date(tourDate);
  const fullPaymentDue = new Date(tourDateObj);
  fullPaymentDue.setDate(fullPaymentDue.getDate() - 30);

  const yearDiff = fullPaymentDue.getFullYear() - today.getFullYear();
  const monthDiff = fullPaymentDue.getMonth() - today.getMonth();
  const monthCount = Math.max(0, yearDiff * 12 + monthDiff);

  if (monthCount >= 4) {
    return { term: "P4", isLastMinute: false, isInvalid: false };
  }
  if (monthCount === 3) {
    return { term: "P3", isLastMinute: false, isInvalid: false };
  }
  if (monthCount === 2) {
    return { term: "P2", isLastMinute: false, isInvalid: false };
  }
  if (monthCount === 1) {
    return { term: "P1", isLastMinute: false, isInvalid: false };
  }

  return { term: "full_payment", isLastMinute: true, isInvalid: false };
};

export const fixTermName = (name: string) => {
  return name
    .replace(/Instalment/g, "Installment")
    .replace(/instalments/g, "installments");
};

export const getFriendlyDescription = (monthsRequired: number) => {
  switch (monthsRequired) {
    case 1:
      return "Ready to pay in full? Pick me.";
    case 2:
      return "Want to split it into two payments? This is it!";
    case 3:
      return "If you like, you can make three equal payments, too!";
    case 4:
      return "Since you're booking early, take advantage of 4 easy payments. No extra charges!";
    default:
      return "";
  }
};

export const generatePaymentSchedule = (
  monthsRequired: number,
  tourDate: string,
  totalTourPrice: number,
  depositAmount: number,
): PaymentScheduleItem[] => {
  if (!tourDate || !monthsRequired) return [];

  const remainingBalance = totalTourPrice - depositAmount;
  const monthlyAmount = remainingBalance / monthsRequired;
  const schedule: PaymentScheduleItem[] = [];

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }

  for (let i = 0; i < monthsRequired; i++) {
    let paymentMonth = nextMonth + i;
    let paymentYear = nextYear;

    while (paymentMonth > 11) {
      paymentMonth -= 12;
      paymentYear++;
    }

    const date = `${paymentYear}-${String(paymentMonth + 1).padStart(2, "0")}-02`;

    schedule.push({
      date,
      amount:
        i === monthsRequired - 1
          ? remainingBalance - monthlyAmount * (monthsRequired - 1)
          : monthlyAmount,
    });
  }

  return schedule;
};

interface GetAvailablePaymentPlansArgs {
  availablePaymentTerm: AvailablePaymentTerm;
  paymentTerms: PaymentTerm[];
  tourDate: string;
  totalTourPrice: number;
  depositAmount: number;
}

export const getAvailablePaymentPlans = ({
  availablePaymentTerm,
  paymentTerms,
  tourDate,
  totalTourPrice,
  depositAmount,
}: GetAvailablePaymentPlansArgs): AvailablePaymentPlanOption[] => {
  if (!availablePaymentTerm.term || availablePaymentTerm.isInvalid) return [];

  if (availablePaymentTerm.isLastMinute) {
    return [
      {
        id: "full_payment",
        type: "full_payment",
        label: "Full Payment Required Within 48hrs",
        description: "Complete payment of remaining balance within 2 days",
        color: "#f59e0b",
        monthsRequired: 1,
        schedule: [],
      },
    ];
  }

  const termMap: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
  const maxMonths = termMap[availablePaymentTerm.term] || 0;

  return paymentTerms
    .filter((term) => term.monthsRequired && term.monthsRequired <= maxMonths)
    .map((term) => ({
      id: term.id,
      type: term.paymentPlanType,
      label: fixTermName(term.name),
      description: getFriendlyDescription(term.monthsRequired!),
      monthsRequired: term.monthsRequired!,
      color: term.color,
      schedule: generatePaymentSchedule(
        term.monthsRequired!,
        tourDate,
        totalTourPrice,
        depositAmount,
      ),
    }));
};
