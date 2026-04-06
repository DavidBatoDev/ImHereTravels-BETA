import { describe, expect, it } from "vitest";
import {
  canPreviewStep3FromSelection,
  canSelectStep3PlansFromPaymentState,
} from "./step3Access";

describe("step3Access", () => {
  it("allows Step 3 preview only when both tour and date are selected", () => {
    expect(canPreviewStep3FromSelection("", "")).toBe(false);
    expect(canPreviewStep3FromSelection("tour-1", "")).toBe(false);
    expect(canPreviewStep3FromSelection("", "2026-12-20")).toBe(false);
    expect(canPreviewStep3FromSelection("tour-1", "2026-12-20")).toBe(true);
  });

  it("allows Step 3 plan selection only when payment is confirmed", () => {
    expect(canSelectStep3PlansFromPaymentState(false)).toBe(false);
    expect(canSelectStep3PlansFromPaymentState(true)).toBe(true);
  });
});
