import { describe, expect, it } from "vitest";
import { deriveCustomerRestoreState } from "./customerHydration";

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

describe("customerHydration", () => {
  it("restores customer core fields", () => {
    expect(
      deriveCustomerRestoreState({
        record: {
          customer: {
            email: "a@x.com",
            firstName: "A",
            lastName: "B",
            birthdate: "1990-01-01",
            nationality: "PHL",
          },
        },
        countries: ["PH", "US", "GB"],
        getCallingCode,
        onUnmatchedPhone: "ignore",
      }),
    ).toMatchObject({
      email: "a@x.com",
      firstName: "A",
      lastName: "B",
      birthdate: "1990-01-01",
      nationality: "PHL",
    });
  });

  it("maps matched WhatsApp number to country and local number", () => {
    expect(
      deriveCustomerRestoreState({
        record: { customer: { whatsAppNumber: "+639171234567" } },
        countries: ["PH", "US", "GB"],
        getCallingCode,
        onUnmatchedPhone: "ignore",
      }),
    ).toMatchObject({
      whatsAppCountry: "PH",
      whatsAppNumber: "9171234567",
    });
  });

  it("does not set number for unmatched phone in ignore mode", () => {
    expect(
      deriveCustomerRestoreState({
        record: { customer: { whatsAppNumber: "+999123" } },
        countries: ["PH", "US", "GB"],
        getCallingCode,
        onUnmatchedPhone: "ignore",
      }),
    ).not.toHaveProperty("whatsAppNumber");
  });

  it("sets stripped number for unmatched phone in set-number mode", () => {
    expect(
      deriveCustomerRestoreState({
        record: { customer: { whatsAppNumber: "+999123" } },
        countries: ["PH", "US", "GB"],
        getCallingCode,
        onUnmatchedPhone: "set-number",
      }),
    ).toMatchObject({
      whatsAppNumber: "999123",
    });
  });
});
