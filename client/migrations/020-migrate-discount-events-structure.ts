/**
 * Migration: Convert discount events from single discount rate per tour package
 * to individual discount rates per date
 * 
 * OLD STRUCTURE:
 * {
 *   tourPackageId: string,
 *   discountRate: number,
 *   dates: string[]
 * }
 * 
 * NEW STRUCTURE:
 * {
 *   tourPackageId: string,
 *   dateDiscounts: [
 *     { date: string, discountRate: number, discountedCost: number }
 *   ]
 * }
 */

import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../src/lib/firebase";

interface OldDiscountEventItem {
  tourPackageId: string;
  tourPackageName: string;
  originalCost: number;
  discountRate: number;
  discountedCost: number;
  dates: string[];
}

interface DateDiscount {
  date: string;
  discountRate: number;
  discountedCost: number;
}

interface NewDiscountEventItem {
  tourPackageId: string;
  tourPackageName: string;
  originalCost: number;
  dateDiscounts: DateDiscount[];
}

function calcDiscounted(original: number, rate: number): number {
  const n = Number.isFinite(original) ? original : 0;
  const r = Number.isFinite(rate) ? rate : 0;
  const v = n * (1 - r / 100);
  return Math.max(0, Math.round(v * 100) / 100);
}

async function migrateDiscountEvents() {
  console.log("Starting discount events structure migration...");

  try {
    const eventsRef = collection(db, "discountEvents");
    const snapshot = await getDocs(eventsRef);

    console.log(`Found ${snapshot.size} discount events to check`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const eventDoc of snapshot.docs) {
      const data = eventDoc.data();
      const items = data.items || [];

      // Check if migration is needed
      const needsMigration = items.some((item: any) => {
        return (
          item.hasOwnProperty("discountRate") ||
          item.hasOwnProperty("discountedCost") ||
          item.hasOwnProperty("dates")
        );
      });

      if (!needsMigration) {
        console.log(`Skipping ${eventDoc.id} - already migrated`);
        skippedCount++;
        continue;
      }

      // Migrate items
      const newItems: NewDiscountEventItem[] = items.map((oldItem: OldDiscountEventItem) => {
        // Convert old structure to new structure
        const dateDiscounts: DateDiscount[] = (oldItem.dates || []).map(dateStr => ({
          date: dateStr,
          discountRate: oldItem.discountRate || 0,
          discountedCost: calcDiscounted(oldItem.originalCost, oldItem.discountRate || 0),
        }));

        return {
          tourPackageId: oldItem.tourPackageId,
          tourPackageName: oldItem.tourPackageName,
          originalCost: oldItem.originalCost,
          dateDiscounts,
        };
      });

      // Update the document
      await updateDoc(doc(db, "discountEvents", eventDoc.id), {
        items: newItems,
      });

      console.log(`✓ Migrated event: ${data.name} (${eventDoc.id})`);
      migratedCount++;
    }

    console.log("\n=== Migration Complete ===");
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total: ${snapshot.size}`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateDiscountEvents()
    .then(() => {
      console.log("\nMigration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nMigration failed:", error);
      process.exit(1);
    });
}

export { migrateDiscountEvents };
