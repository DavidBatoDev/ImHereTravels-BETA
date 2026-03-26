export const toNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "").trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const hasPaidDate = (value: unknown): boolean => {
  if (value == null) return false;

  if (typeof value === "object" && (value as { type?: string })?.type === "firestore/timestamp/1.0") {
    return true;
  }

  if (typeof value === "object" && typeof (value as { seconds?: number }).seconds === "number") {
    return true;
  }

  if (value instanceof Date && !isNaN(value.getTime())) return true;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized !== "" && normalized !== "null" && normalized !== "undefined";
  }

  return true;
};

const creditOrderMap: Record<string, number> = {
  Reservation: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

export const getCreditOrder = (
  creditFrom?: string,
  creditAmount?: number | string | null,
): number => {
  const amount = toNumber(creditAmount);
  if (amount <= 0) return -1;
  return creditOrderMap[creditFrom ?? ""] ?? -1;
};

export const roundCurrency = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

