export function getDefaultPaymentPlan(
  availablePaymentTerms: string | null | undefined,
  currentPlan: string | null | undefined,
): string {
  const trimmedPlan = (currentPlan ?? "").trim();
  if (trimmedPlan !== "") return trimmedPlan;
  if (availablePaymentTerms === "Full payment required within 48hrs") {
    return "Full Payment";
  }
  return trimmedPlan;
}
