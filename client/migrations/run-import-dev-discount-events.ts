#!/usr/bin/env tsx
/**
 * Script to import discount events from dev export
 * This will REPLACE all existing discount events in prod with dev backup data
 *
 * Usage:
 *   npm run migrate:import-dev-discount-events          # Dry run
 *   npm run migrate:import-dev-discount-events -- --run  # Actual run
 */

import { runMigration } from "./037-import-dev-discount-events";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes("--run");

  if (isDryRun) {
    console.log("🧪 DRY RUN MODE - No changes will be made");
    console.log("💡 Add --run flag to execute the migration");
    console.log("");
  }

  try {
    const result = await runMigration(isDryRun);
    console.log("\n" + result.message);
    console.log("Details:", result.details);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
