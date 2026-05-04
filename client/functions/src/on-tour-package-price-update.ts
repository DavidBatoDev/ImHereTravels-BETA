import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import * as admin from "firebase-admin";
import { Change, FirestoreEvent } from "firebase-functions/v2/firestore";
import {
  buildNewHistoryEntry,
  hasPricingChanged,
  TourPackageState,
} from "./pricing-history-helpers";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Cloud Function: onTourPackagePriceUpdate
 *
 * Maintains a full-history pricing log when a tour package's pricing changes.
 *
 * `pricingHistory` holds an entry for EVERY version — both past and current.
 * Each entry's `effectiveDate` is the moment that version became active (never
 * when it was archived), so historical rows keep their original date across
 * subsequent updates.
 *
 * On update:
 * 1. Detects if pricing fields changed (pricing.*, travelDates custom prices)
 * 2. Appends a NEW entry for the new version (effectiveDate = now)
 * 3. Increments currentVersion
 * 4. Records changedBy and reason, then clears the temp priceUpdateReason field
 *
 * The previous entry in pricingHistory is left untouched — its effectiveDate
 * already correctly reflects when it became active.
 */

const toIsoDate = (startDate: any): string =>
  startDate?.toDate
    ? startDate.toDate().toISOString()
    : new Date(startDate).toISOString();

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
    const before = change.before.data() as TourPackageState<admin.firestore.Timestamp>;
    const after = change.after.data() as TourPackageState<admin.firestore.Timestamp>;

    if (!hasPricingChanged(before, after)) {
      console.log(
        `No pricing changes detected for package ${event.params.packageId}`,
      );
      return null;
    }

    console.log(
      `💰 Price update detected for package ${event.params.packageId}`,
    );

    const result = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(change.after.ref);
      const data =
        (snap.data() as TourPackageState<admin.firestore.Timestamp>) || {};

      const currentHistory = data.pricingHistory || [];
      const currentVersion = data.currentVersion || 1;
      const newVersion = currentVersion + 1;

      const historyEntry = buildNewHistoryEntry(
        data,
        newVersion,
        admin.firestore.Timestamp.now(),
        toIsoDate,
      );

      tx.update(change.after.ref, {
        pricingHistory: [...currentHistory, historyEntry],
        currentVersion: newVersion,
        priceUpdateReason: admin.firestore.FieldValue.delete(),
      });

      return { currentVersion, newVersion, historyEntry };
    });

    console.log(
      `✅ Price history updated: Version ${result.currentVersion} → ${result.newVersion}`,
    );
    console.log(
      `📦 History entry:`,
      JSON.stringify(result.historyEntry, null, 2),
    );

    return null;
  },
);
