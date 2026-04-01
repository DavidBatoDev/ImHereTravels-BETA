import { describe, expect, it } from "vitest";
import {
  buildUrlWithQueryParam,
  getQueryParam,
  hasPaymentIdParam,
} from "./formQueryParams";

describe("formQueryParams", () => {
  it("detects paymentid presence", () => {
    expect(hasPaymentIdParam("?paymentid=abc")).toBe(true);
    expect(hasPaymentIdParam("?tour=abc&tourdate=2026-01-01")).toBe(false);
    expect(hasPaymentIdParam("not-a-query")).toBe(false);
  });

  it("reads known query params safely", () => {
    const search = "?tour=bali-adventure&tourdate=2026-10-21&paymentid=xyz";

    expect(getQueryParam(search, "tour")).toBe("bali-adventure");
    expect(getQueryParam(search, "tourdate")).toBe("2026-10-21");
    expect(getQueryParam(search, "paymentid")).toBe("xyz");
    expect(getQueryParam("bad query", "tour")).toBeNull();
  });

  it("builds URLs while preserving existing params", () => {
    expect(
      buildUrlWithQueryParam({
        pathname: "/reservation-booking-form",
        search: "?tour=abc&tourdate=2026-10-21",
        key: "tour",
        value: "new-tour",
      }),
    ).toBe("/reservation-booking-form?tour=new-tour&tourdate=2026-10-21");

    expect(
      buildUrlWithQueryParam({
        pathname: "/reservation-booking-form",
        search: "?tour=abc&tourdate=2026-10-21",
        key: "tourdate",
        value: null,
      }),
    ).toBe("/reservation-booking-form?tour=abc");

    expect(
      buildUrlWithQueryParam({
        pathname: "/reservation-booking-form",
        search: "",
        key: "paymentid",
        value: "pid-123",
      }),
    ).toBe("/reservation-booking-form?paymentid=pid-123");
  });
});
