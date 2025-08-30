#!/usr/bin/env tsx

import { runMigration } from "./migrations/012-default-booking-sheet-columns-fixed";

async function main() {
  console.log("🚀 Running Migration 012: Default Booking Sheet Columns");
  console.log("=======================================================");

  try {
    const result = await runMigration(false); // false = not a dry run

    console.log(`\n🎯 ${result.message}`);
    if (result.details) {
      console.log(
        `📊 Details: ${result.details.created} created, ${result.details.skipped} skipped, ${result.details.errors.length} errors`
      );
      if (result.details.errors.length > 0) {
        console.log("\n❌ Errors:");
        result.details.errors.forEach((error) => console.log(`  - ${error}`));
      }
    }

    if (result.success) {
      console.log("\n🎉 Migration completed successfully!");
      console.log("✅ Your Firestore now has 60 default booking sheet columns");
      console.log("✅ Ready to use with your hybrid booking system!");
    } else {
      console.log("\n❌ Migration failed!");
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  }
}

main();
