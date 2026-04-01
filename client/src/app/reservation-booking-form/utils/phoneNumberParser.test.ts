import { describe, expect, it } from "vitest";
import { parseWhatsAppInternationalNumber } from "./phoneNumberParser";

const callingCodes: Record<string, string> = {
  PH: "63",
  US: "1",
  GB: "44",
};

const getCallingCode = (country: string): string => {
  if (!callingCodes[country]) {
    throw new Error("Unknown country");
  }
  return callingCodes[country];
};

describe("phoneNumberParser", () => {
  it("matches a known country and strips country code", () => {
    expect(
      parseWhatsAppInternationalNumber({
        fullNumber: "+639171234567",
        countries: ["PH", "US", "GB"],
        getCallingCode,
      }),
    ).toEqual({
      matched: true,
      country: "PH",
      localNumber: "9171234567",
    });
  });

  it("keeps original value when unknown and fallback is keep-original", () => {
    expect(
      parseWhatsAppInternationalNumber({
        fullNumber: "+999123",
        countries: ["PH", "US", "GB"],
        getCallingCode,
      }),
    ).toEqual({
      matched: false,
      localNumber: "+999123",
    });
  });

  it("strips leading plus when unknown and fallback is strip-plus", () => {
    expect(
      parseWhatsAppInternationalNumber({
        fullNumber: "+999123",
        countries: ["PH", "US", "GB"],
        getCallingCode,
        fallbackMode: "strip-plus",
      }),
    ).toEqual({
      matched: false,
      localNumber: "999123",
    });
  });

  it("returns as-is for non-international input", () => {
    expect(
      parseWhatsAppInternationalNumber({
        fullNumber: "09171234567",
        countries: ["PH", "US", "GB"],
        getCallingCode,
      }),
    ).toEqual({
      matched: false,
      localNumber: "09171234567",
    });
  });
});
