#!/usr/bin/env tsx
/**
 * Script to import email templates from production export
 * This will REPLACE all existing email templates in dev with production data
 *
 * Usage:
 *   npm run migrate:import-prod-email-templates          # Dry run
 *   npm run migrate:import-prod-email-templates -- --run  # Actual run
 */

import { runMigration } from "./035-import-prod-email-templates";

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
