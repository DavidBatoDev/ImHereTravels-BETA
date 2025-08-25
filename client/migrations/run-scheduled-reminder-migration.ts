import { runMigration } from "./010-scheduled-reminder-email-template";

async function main() {
  console.log("🚀 Running Scheduled Reminder Email Template Migration");
  console.log("=".repeat(60));

  try {
    const result = await runMigration(false); // Set to true for dry run

    if (result.success) {
      console.log("✅ Migration completed successfully!");
      console.log(`📝 ${result.message}`);

      if (result.details) {
        console.log(`📊 Created: ${result.details.created}`);
        console.log(`⏭️  Skipped: ${result.details.skipped}`);
        if (result.details.errors.length > 0) {
          console.log(`❌ Errors: ${result.details.errors.length}`);
          result.details.errors.forEach((error) =>
            console.log(`   - ${error}`)
          );
        }
      }
    } else {
      console.log("❌ Migration failed!");
      console.log(`📝 ${result.message}`);
    }
  } catch (error) {
    console.error("💥 Unexpected error during migration:", error);
    process.exit(1);
  }
}

main();
