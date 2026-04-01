import { getCountryCallingCode } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";

export type CountryPhoneData = {
  alpha3: string;
  flag: string;
  maxLength: number;
};

const countryData: Record<string, CountryPhoneData> = {
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
  } catch {
    return "1";
  }
};

export const getCountryData = (countryCode: string): CountryPhoneData => {
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
