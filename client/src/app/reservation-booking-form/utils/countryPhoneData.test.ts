import { describe, expect, it } from "vitest";
import { getCountryData, safeGetCountryCallingCode } from "./countryPhoneData";

describe("countryPhoneData", () => {
  it("returns mapped country metadata for known country code", () => {
    const result = getCountryData("GB");
    expect(result.alpha3).toBe("GBR");
    expect(result.maxLength).toBe(10);
  });

  it("returns generated fallback metadata for unknown country code", () => {
    const result = getCountryData("ZZ");
    expect(result.alpha3).toBe("ZZ");
    expect(result.maxLength).toBe(15);
    expect(result.flag.length).toBeGreaterThan(0);
  });

  it("returns fallback calling code for unknown country code", () => {
    expect(safeGetCountryCallingCode("ZZ")).toBe("1");
  });
});
