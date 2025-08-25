import { migrateInitialPaymentReminderTemplate } from "./009-initial-payment-reminder-template";

// Run the migration
async function runMigration() {
  try {
    console.log("🚀 Starting Initial Payment Reminder Template Migration...");

    const templateId = await migrateInitialPaymentReminderTemplate();

    console.log("🎉 Migration completed successfully!");
    console.log(`📧 Template created with ID: ${templateId}`);
    console.log("📋 Template: Initial Payment Reminder");
    console.log("🔧 Variables: 9 variables with proper type definitions");
    console.log("📱 Status: Active");
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration };
