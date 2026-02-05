import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import * as admin from "firebase-admin";
import { Change, FirestoreEvent } from "firebase-functions/v2/firestore";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Cloud Function: onTourPackagePriceUpdate
 *
 * Automatically creates price history when tour package pricing is updated.
 *
 * When tourPackages document is updated:
 * 1. Detects if pricing fields have changed (pricing.original, pricing.deposit, travelDates custom prices)
 * 2. Pushes OLD/PREVIOUS pricing to priceHistory[] array
 * 3. NEW pricing stays in current pricing{} and travelDates[]
 * 4. Increments currentVersion number
 * 5. Records changedBy (admin user) and reason (if provided)
 *
 * This ensures existing bookings with locked pricing continue to use historical prices,
 * while new bookings fetch the current (updated) pricing.
 */

interface TourPricing {
  original: number;
  discounted?: number;
  deposit: number;
  currency: string;
}

interface TravelDatePricing {
  date: string; // ISO date string
  customOriginal?: number;
  customDiscounted?: number;
  customDeposit?: number;
}

interface PricingHistoryEntry {
  version: number;
  effectiveDate: admin.firestore.Timestamp;
  pricing: TourPricing;
  travelDates?: TravelDatePricing[];
  changedBy?: string;
  reason?: string;
}

interface TourPackageData {
  pricing: TourPricing;
  travelDates?: any[];
  currentVersion?: number;
  pricingHistory?: PricingHistoryEntry[];
  updatedBy?: string;
  priceUpdateReason?: string;
}

export const onTourPackagePriceUpdate = onDocumentUpdated(
  {
    document: "tourPackages/{packageId}",
    region: "asia-southeast1",
  },
  async (
    event: FirestoreEvent<Change<admin.firestore.DocumentSnapshot> | undefined>,
  ) => {
    if (!event.data) {
      console.log("No data in event");
      return null;
    }

    const change = event.data;
    const before = change.before.data() as TourPackageData;
    const after = change.after.data() as TourPackageData;

    // Check if pricing has changed
    const pricingChanged = hasPricingChanged(before, after);

    if (!pricingChanged) {
      console.log(
        `No pricing changes detected for package ${event.params.packageId}`,
      );
      return null;
    }

    console.log(
      `💰 Price update detected for package ${event.params.packageId}`,
    );

    // Initialize pricing history array if it doesn't exist
    const currentHistory = after.pricingHistory || [];
    const currentVersion = after.currentVersion || 1;

    // Extract travel date pricing from before state
    // Include ALL travel dates to preserve complete pricing history
    const travelDatesPricing: TravelDatePricing[] = [];
    if (before.travelDates && Array.isArray(before.travelDates)) {
      before.travelDates.forEach((td: any) => {
        const dateStr = td.startDate?.toDate
          ? td.startDate.toDate().toISOString()
          : new Date(td.startDate).toISOString();

        const travelEntry: TravelDatePricing = {
          date: dateStr,
        };

        // Include custom pricing if present
        if (td.customOriginal !== undefined) {
          travelEntry.customOriginal = td.customOriginal;
        }
        if (td.customDiscounted !== undefined) {
          travelEntry.customDiscounted = td.customDiscounted;
        }
        if (td.customDeposit !== undefined) {
          travelEntry.customDeposit = td.customDeposit;
        }

        travelDatesPricing.push(travelEntry);
      });
    }

    // Create history entry with OLD pricing
    const historyEntry: PricingHistoryEntry = {
      version: currentVersion,
      effectiveDate: admin.firestore.Timestamp.now(),
      pricing: {
        original: before.pricing.original,
        discounted: before.pricing.discounted,
        deposit: before.pricing.deposit,
        currency: before.pricing.currency,
      },
      changedBy: after.updatedBy || "system",
      reason: after.priceUpdateReason || "Price update",
    };

    if (travelDatesPricing.length > 0) {
      historyEntry.travelDates = travelDatesPricing;
    }

    // Add to history array
    const updatedHistory = [...currentHistory, historyEntry];

    // Increment version
    const newVersion = currentVersion + 1;

    // Update the document with new history and version
    await change.after.ref.update({
      pricingHistory: updatedHistory,
      currentVersion: newVersion,
      // Clean up temporary fields
      priceUpdateReason: admin.firestore.FieldValue.delete(),
    });

    console.log(
      `✅ Price history updated: Version ${currentVersion} → ${newVersion}`,
    );
    console.log(`📦 History entry:`, JSON.stringify(historyEntry, null, 2));

    return null;
  },
);

/**
 * Helper function to detect if pricing has changed
 */
function hasPricingChanged(
  before: TourPackageData,
  after: TourPackageData,
): boolean {
  // Check if main pricing fields changed
  if (
    before.pricing.original !== after.pricing.original ||
    before.pricing.deposit !== after.pricing.deposit ||
    before.pricing.discounted !== after.pricing.discounted ||
    before.pricing.currency !== after.pricing.currency
  ) {
    return true;
  }

  // Check if any travel date custom pricing changed
  const beforeTravelDates = before.travelDates || [];
  const afterTravelDates = after.travelDates || [];

  if (beforeTravelDates.length !== afterTravelDates.length) {
    return true;
  }

  for (let i = 0; i < beforeTravelDates.length; i++) {
    const beforeTd = beforeTravelDates[i];
    const afterTd = afterTravelDates[i];

    if (
      beforeTd.customOriginal !== afterTd.customOriginal ||
      beforeTd.customDiscounted !== afterTd.customDiscounted ||
      beforeTd.customDeposit !== afterTd.customDeposit ||
      beforeTd.hasCustomOriginal !== afterTd.hasCustomOriginal ||
      beforeTd.hasCustomDiscounted !== afterTd.hasCustomDiscounted ||
      beforeTd.hasCustomDeposit !== afterTd.hasCustomDeposit
    ) {
      return true;
    }
  }

  return false;
}
