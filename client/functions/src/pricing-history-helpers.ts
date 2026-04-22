/**
 * Pure helpers for tour pricing version history.
 *
 * Kept free of firebase-admin imports so they can be unit-tested directly.
 * The time type is generic so callers can inject a Firestore Timestamp or a
 * plain Date in tests.
 */

export interface TourPricing {
  original: number;
  discounted?: number;
  deposit: number;
  currency: string;
}

export interface TravelDatePricing {
  date: string;
  customOriginal?: number;
  customDiscounted?: number;
  customDeposit?: number;
}

export interface PricingHistoryEntry<TTime = unknown> {
  version: number;
  effectiveDate: TTime;
  pricing: TourPricing;
  travelDates?: TravelDatePricing[];
  changedBy?: string;
  reason?: string;
}

export interface TourPackageState<TTime = unknown> {
  pricing: TourPricing;
  travelDates?: any[];
  currentVersion?: number;
  pricingHistory?: PricingHistoryEntry<TTime>[];
  updatedBy?: string;
  priceUpdateReason?: string;
}

/**
 * Detects whether top-level pricing or any per-date custom pricing has changed.
 */
export function hasPricingChanged(
  before: TourPackageState<any>,
  after: TourPackageState<any>,
): boolean {
  if (
    before.pricing.original !== after.pricing.original ||
    before.pricing.deposit !== after.pricing.deposit ||
    before.pricing.discounted !== after.pricing.discounted ||
    before.pricing.currency !== after.pricing.currency
  ) {
    return true;
  }

  const beforeTravelDates = before.travelDates || [];
  const afterTravelDates = after.travelDates || [];

  if (beforeTravelDates.length !== afterTravelDates.length) {
    return true;
  }

  for (let i = 0; i < beforeTravelDates.length; i++) {
    const b = beforeTravelDates[i];
    const a = afterTravelDates[i];
    if (
      b.customOriginal !== a.customOriginal ||
      b.customDiscounted !== a.customDiscounted ||
      b.customDeposit !== a.customDeposit ||
      b.hasCustomOriginal !== a.hasCustomOriginal ||
      b.hasCustomDiscounted !== a.hasCustomDiscounted ||
      b.hasCustomDeposit !== a.hasCustomDeposit
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Builds the new history entry that should be appended for the new version.
 * `effectiveDate` is "when this version became active" — always `now`.
 */
export function buildNewHistoryEntry<TTime>(
  after: TourPackageState<TTime>,
  newVersion: number,
  now: TTime,
  toIsoDate: (startDate: any) => string,
): PricingHistoryEntry<TTime> {
  const travelDatesPricing: TravelDatePricing[] = [];
  if (after.travelDates && Array.isArray(after.travelDates)) {
    after.travelDates.forEach((td) => {
      const entry: TravelDatePricing = { date: toIsoDate(td.startDate) };
      if (td.customOriginal !== undefined) {
        entry.customOriginal = td.customOriginal;
      }
      if (td.customDiscounted !== undefined) {
        entry.customDiscounted = td.customDiscounted;
      }
      if (td.customDeposit !== undefined) {
        entry.customDeposit = td.customDeposit;
      }
      travelDatesPricing.push(entry);
    });
  }

  const entry: PricingHistoryEntry<TTime> = {
    version: newVersion,
    effectiveDate: now,
    pricing: {
      original: after.pricing.original,
      discounted: after.pricing.discounted,
      deposit: after.pricing.deposit,
      currency: after.pricing.currency,
    },
    changedBy: after.updatedBy || "system",
    reason: after.priceUpdateReason || "Price update",
  };

  if (travelDatesPricing.length > 0) {
    entry.travelDates = travelDatesPricing;
  }

  return entry;
}
