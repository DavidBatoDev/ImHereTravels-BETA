import { Timestamp } from "firebase/firestore";
import { db } from "./firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

const MIGRATION_ID = "004-payment-plans";
const COLLECTION_NAME = "paymentTerms";

// ============================================================================
// MIGRATION DATA - Payment Plans
// ============================================================================

const paymentPlans = [
  {
    name: "Invalid Booking",
    description:
      "Booking not allowed - Less than 2 days between reservation and tour date",
    paymentPlanType: "invalid_booking",
    paymentType: "invalid_booking",
    daysRequired: 2,
    depositPercentage: 0,
    isActive: true,
    percentage: 0, // Legacy percentage
    sortOrder: 1,
    color: "#ef4444", // red
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
    },
  },
  {
    name: "Full Payment Required Within 2 Days",
    description:
      "Capture last-minute bookings while ensuring immediate payment. Tour date is 2-30 days away with no eligible instalment dates available.",
    paymentPlanType: "full_payment_48hrs",
    paymentType: "full_payment",
    daysRequired: 2,
    depositPercentage: 0,
    isActive: true,
    percentage: 100, // Legacy percentage for full payment
    sortOrder: 2,
    color: "#f59e0b", // amber
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
    },
  },
  {
    name: "P1 - Single Instalment",
    description:
      "Simplified payment for shorter lead times. Only 1 eligible payment date available, tour date 30-60 days away.",
    paymentPlanType: "p1_single_installment",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 1,
    depositPercentage: 0,
    monthlyPercentages: [100],
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 3,
    color: "#3b82f6", // blue
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
    },
  },
  {
    name: "P2 - Two Instalments",
    description:
      "Balance affordability with business cash flow needs. 2 eligible payment dates available, tour date 60-90 days away.",
    paymentPlanType: "p2_two_installments",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 2,
    depositPercentage: 0,
    monthlyPercentages: [50, 50],
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 4,
    color: "#8b5cf6", // violet
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
    },
  },
  {
    name: "P3 - Three Instalments",
    description:
      "Make longer-term bookings more affordable. 3 eligible payment dates available, tour date 90-120 days away.",
    paymentPlanType: "p3_three_installments",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 3,
    depositPercentage: 0,
    monthlyPercentages: [33.33, 33.33, 33.34],
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 5,
    color: "#10b981", // emerald
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
    },
  },
  {
    name: "P4 - Four Instalments",
    description:
      "Maximum flexibility for early planners. 4+ eligible payment dates available, tour date 120+ days away.",
    paymentPlanType: "p4_four_installments",
    paymentType: "monthly_scheduled",
    daysRequired: undefined,
    monthsRequired: 4,
    depositPercentage: 0,
    monthlyPercentages: [25, 25, 25, 25],
    isActive: true,
    percentage: 100, // Legacy percentage
    sortOrder: 6,
    color: "#06b6d4", // cyan
    metadata: {
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "migration-script",
    },
  },
];

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

export async function runMigration(dryRun: boolean = false) {
  console.log(`🚀 Starting migration: ${MIGRATION_ID}`);
  console.log(`📊 Collection: ${COLLECTION_NAME}`);
  console.log(`🔍 Dry run: ${dryRun ? "YES" : "NO"}`);
  console.log("");

  const results = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Check if payment terms already exist
    const existingQuery = query(collection(db, COLLECTION_NAME));
    const existingDocs = await getDocs(existingQuery);

    if (!existingDocs.empty) {
      console.log(`⚠️  Found ${existingDocs.size} existing payment terms`);
      console.log("   Updating existing records with corrected structure...");
      console.log("");

      // Update existing records instead of skipping
      for (const plan of paymentPlans) {
        try {
          // Find existing record by name
          const existingDoc = existingDocs.docs.find(
            (doc) => doc.data().name === plan.name
          );

          if (existingDoc) {
            if (dryRun) {
              console.log(`  🔍 Would update: ${plan.name}`);
              results.created++;
            } else {
              console.log(`  🔄 Updating: ${plan.name}`);

              // Clean the data by removing undefined values
              const cleanPlan = Object.fromEntries(
                Object.entries(plan).filter(([_, value]) => value !== undefined)
              );

              // Update the existing document
              await updateDoc(
                doc(db, COLLECTION_NAME, existingDoc.id),
                cleanPlan
              );
              results.created++;
            }
          } else {
            if (dryRun) {
              console.log(`  🔍 Would create: ${plan.name}`);
              results.created++;
            } else {
              console.log(`  ✅ Creating: ${plan.name}`);

              // Clean the data by removing undefined values
              const cleanPlan = Object.fromEntries(
                Object.entries(plan).filter(([_, value]) => value !== undefined)
              );

              await addDoc(collection(db, COLLECTION_NAME), cleanPlan);
              results.created++;
            }
          }
        } catch (error) {
          const errorMsg = `Failed to process ${plan.name}: ${error}`;
          console.error(`  ❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      console.log("");

      if (dryRun) {
        return {
          message: `Migration ${MIGRATION_ID} would update existing records in DRY RUN mode`,
          details: {
            created: results.created,
            skipped: results.skipped,
            errors: results.errors,
          },
        };
      } else {
        return {
          message: `Migration ${MIGRATION_ID} completed successfully - updated existing records`,
          details: {
            created: results.created,
            skipped: results.skipped,
            errors: results.errors,
          },
        };
      }
    }

    console.log(`📝 Processing ${paymentPlans.length} payment plans...`);
    console.log("");

    for (const plan of paymentPlans) {
      try {
        if (dryRun) {
          console.log(`  🔍 Would create: ${plan.name}`);
          results.created++;
        } else {
          console.log(`  ✅ Creating: ${plan.name}`);

          // Clean the data by removing undefined values
          const cleanPlan = Object.fromEntries(
            Object.entries(plan).filter(([_, value]) => value !== undefined)
          );

          await addDoc(collection(db, COLLECTION_NAME), cleanPlan);
          results.created++;
        }
      } catch (error) {
        const errorMsg = `Failed to create ${plan.name}: ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log("");

    if (dryRun) {
      return {
        message: `Migration ${MIGRATION_ID} completed in DRY RUN mode`,
        details: {
          created: results.created,
          skipped: results.skipped,
          errors: results.errors,
        },
      };
    } else {
      return {
        message: `Migration ${MIGRATION_ID} completed successfully`,
        details: {
          created: results.created,
          skipped: results.skipped,
          errors: results.errors,
        },
      };
    }
  } catch (error) {
    const errorMsg = `Migration failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    results.errors.push(errorMsg);

    return {
      message: `Migration ${MIGRATION_ID} failed`,
      details: {
        created: results.created,
        skipped: results.skipped,
        errors: results.errors,
      },
    };
  }
}

export async function rollbackMigration() {
  console.log(`🔄 Rolling back migration: ${MIGRATION_ID}`);
  console.log(`📊 Collection: ${COLLECTION_NAME}`);
  console.log("");

  const results = {
    deleted: 0,
    errors: [] as string[],
  };

  try {
    // Find all payment terms created by this migration
    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTION_NAME),
        where("metadata.createdBy", "==", "migration-script")
      )
    );

    if (querySnapshot.empty) {
      console.log("   No payment terms found to rollback");
      return {
        message: `Rollback ${MIGRATION_ID} completed - no items to delete`,
        details: {
          deleted: 0,
          errors: results.errors,
        },
      };
    }

    console.log(`🗑️  Deleting ${querySnapshot.size} payment terms...`);
    console.log("");

    for (const docSnapshot of querySnapshot.docs) {
      try {
        console.log(`  🗑️  Deleting: ${docSnapshot.data().name}`);
        await deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id));
        results.deleted++;
      } catch (error) {
        const errorMsg = `Failed to delete ${
          docSnapshot.data().name
        }: ${error}`;
        console.error(`  ❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }

    console.log("");

    return {
      message: `Rollback ${MIGRATION_ID} completed successfully`,
      details: {
        deleted: results.deleted,
        errors: results.errors,
      },
    };
  } catch (error) {
    const errorMsg = `Rollback failed: ${error}`;
    console.error(`❌ ${errorMsg}`);
    results.errors.push(errorMsg);

    return {
      message: `Rollback ${MIGRATION_ID} failed`,
      details: {
        deleted: results.deleted,
        errors: results.errors,
      },
    };
  }
}
