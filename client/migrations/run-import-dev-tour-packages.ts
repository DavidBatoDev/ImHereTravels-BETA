#!/usr/bin/env tsx
/**
 * Script to import tour packages from dev export
 * This will REPLACE all existing tour packages with dev backup data
 *
 * Usage:
 *   npm run migrate:import-dev-tour-packages          # Dry run
 *   npm run migrate:import-dev-tour-packages -- --run  # Actual run
 */

import { runMigration } from "./036-import-dev-tour-packages";

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
