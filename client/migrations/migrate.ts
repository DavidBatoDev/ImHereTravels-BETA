#!/usr/bin/env node

// Load environment variables first
import dotenv from "dotenv";
import path from "path";

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Environment variables loaded via dotenv

import {
  runMigration as runMigration001,
  rollbackMigration as rollbackMigration001,
} from "./001-initial-tour-packages";
import {
  runMigration as runMigration002,
  rollbackMigration as rollbackMigration002,
} from "./002-additional-tour-packages";
import {
  runMigration as runMigration003,
  rollbackMigration as rollbackMigration003,
} from "./003-final-tour-packages";
import {
  runMigration as runMigration004,
  rollbackMigration as rollbackMigration004,
} from "./004-payment-plans";
import {
  runMigration as runMigration005,
  rollbackMigration as rollbackMigration005,
} from "./005-currency-usd-to-eur";
import {
  runMigration as runMigration006,
  rollbackMigration as rollbackMigration006,
} from "./006-conditional-email-templates";
import {
  runMigration008,
  rollbackMigration008,
} from "./008-cancellation-email-template";
import {
  runMigration as runMigration009,
  rollbackMigration as rollbackMigration009,
} from "./009-initial-payment-reminder-template";

// ============================================================================
// MIGRATION RUNNER
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const dryRun = args.includes("--dry-run") || args.includes("-d");

  console.log("🚀 ImHere Travels - Database Migration Runner");
  console.log("=============================================");

  switch (command) {
    case "run":
    case "001":
      console.log("📊 Running migration: 001-initial-tour-packages");
      const result = await runMigration001(dryRun);
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
      break;

    case "002":
      console.log("📊 Running migration: 002-additional-tour-packages");
      const result002 = await runMigration002(dryRun);
      console.log(`\n🎯 ${result002.message}`);
      if (result002.details) {
        console.log(
          `📊 Details: ${result002.details.created} created, ${result002.details.skipped} skipped, ${result002.details.errors} errors`
        );
        if (
          result002.details.errorDetails &&
          result002.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          result002.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "003":
      console.log("📊 Running migration: 003-final-tour-packages");
      const result003 = await runMigration003(dryRun);
      console.log(`\n🎯 ${result003.message}`);
      if (result003.details) {
        console.log(
          `📊 Details: ${result003.details.created} created, ${result003.details.skipped} skipped, ${result003.details.errors} errors`
        );
        if (
          result003.details.errorDetails &&
          result003.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          result003.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "004":
      console.log("📊 Running migration: 004-payment-plans");
      const result004 = await runMigration004(dryRun);
      console.log(`\n🎯 ${result004.message}`);
      if (result004.details) {
        console.log(
          `📊 Details: ${result004.details.created} created, ${result004.details.skipped} skipped, ${result004.details.errors.length} errors`
        );
        if (result004.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result004.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "005":
      console.log("📊 Running migration: 005-currency-usd-to-eur");
      const result005 = await runMigration005(dryRun);
      console.log(`\n🎯 ${result005.message}`);
      if (result005.details) {
        console.log(
          `📊 Details: ${result005.details.updated} updated, ${result005.details.skipped} skipped, ${result005.details.errors.length} errors`
        );
        if (result005.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result005.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "006":
      console.log("📊 Running migration: 006-conditional-email-templates");
      const result006 = await runMigration006(dryRun);
      console.log(`\n🎯 ${result006.message}`);
      if (result006.details) {
        console.log(
          `📊 Details: ${result006.details.created} created, ${result006.details.skipped} skipped, ${result006.details.errors.length} errors`
        );
        if (result006.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result006.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "008":
      console.log("📊 Running migration: 008-cancellation-email-template");
      const result008 = await runMigration008(dryRun);
      console.log(`\n🎯 ${result008.message}`);
      if (result008.details) {
        console.log(
          `�� Details: ${result008.details.created} created, ${result008.details.skipped} skipped, ${result008.details.errors.length} errors`
        );
        if (result008.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result008.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "009":
      console.log(
        "📊 Running migration: 009-initial-payment-reminder-template"
      );
      const result009 = await runMigration009(dryRun);
      console.log(`\n🎯 ${result009.message}`);
      if (result009.details) {
        console.log(
          `📊 Details: ${result009.details.created} created, ${result009.details.skipped} skipped, ${result009.details.errors.length} errors`
        );
        if (result009.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result009.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback":
    case "undo":
      console.log("🔄 Rolling back migration: 001-initial-tour-packages");
      const rollbackResult = await rollbackMigration001();
      console.log(`\n🎯 ${rollbackResult.message}`);
      if (rollbackResult.details) {
        console.log(
          `📊 Details: ${rollbackResult.details.deleted} deleted, ${rollbackResult.details.errors.length} errors`
        );
        if (rollbackResult.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback002":
      console.log("🔄 Rolling back migration: 002-additional-tour-packages");
      const rollbackResult002 = await rollbackMigration002();
      console.log(`\n🎯 ${rollbackResult002.message}`);
      if (rollbackResult002.details) {
        console.log(
          `📊 Details: ${rollbackResult002.details.deleted} deleted, ${rollbackResult002.details.errors} errors`
        );
        if (
          rollbackResult002.details.errorDetails &&
          rollbackResult002.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          rollbackResult002.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback003":
      console.log("🔄 Rolling back migration: 003-final-tour-packages");
      const rollbackResult003 = await rollbackMigration003();
      console.log(`\n🎯 ${rollbackResult003.message}`);
      if (rollbackResult003.details) {
        console.log(
          `📊 Details: ${rollbackResult003.details.deleted} deleted, ${rollbackResult003.details.errors} errors`
        );
        if (
          rollbackResult003.details.errorDetails &&
          rollbackResult003.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          rollbackResult003.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback004":
      console.log("🔄 Rolling back migration: 004-payment-plans");
      const rollbackResult004 = await rollbackMigration004();
      console.log(`\n🎯 ${rollbackResult004.message}`);
      if (rollbackResult004.details) {
        console.log(
          `📊 Details: ${rollbackResult004.details.deleted} deleted, ${rollbackResult004.details.errors.length} errors`
        );
        if (rollbackResult004.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult004.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback005":
      console.log("🔄 Rolling back migration: 005-currency-usd-to-eur");
      const rollbackResult005 = await rollbackMigration005();
      console.log(`\n🎯 ${rollbackResult005.message}`);
      if (rollbackResult005.details) {
        console.log(
          `📊 Details: ${rollbackResult005.details.reverted} reverted, ${rollbackResult005.details.errors.length} errors`
        );
        if (rollbackResult005.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult005.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback006":
      console.log("🔄 Rolling back migration: 006-conditional-email-templates");
      const rollbackResult006 = await rollbackMigration006();
      console.log(`\n🎯 ${rollbackResult006.message}`);
      if (rollbackResult006.details) {
        console.log(
          `📊 Details: ${rollbackResult006.details.deleted} deleted, ${rollbackResult006.details.errors.length} errors`
        );
        if (rollbackResult006.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult006.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback008":
      console.log("🔄 Rolling back migration: 008-cancellation-email-template");
      const rollbackResult008 = await rollbackMigration008();
      console.log(`\n🎯 ${rollbackResult008.message}`);
      if (rollbackResult008.details) {
        console.log(
          `📊 Details: ${rollbackResult008.details.created} created, ${rollbackResult008.details.skipped} skipped, ${rollbackResult008.details.errors.length} errors`
        );
        if (rollbackResult008.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult008.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "rollback009":
      console.log(
        "🔄 Rolling back migration: 009-initial-payment-reminder-template"
      );
      const rollbackResult009 = await rollbackMigration009();
      console.log(`\n🎯 ${rollbackResult009.message}`);
      if (rollbackResult009.details) {
        console.log(
          `📊 Details: ${rollbackResult009.details.deleted} deleted, ${rollbackResult009.details.errors.length} errors`
        );
        if (rollbackResult009.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult009.details.errors.forEach((error) =>
            console.log(`  - ${error}`)
          );
        }
      }
      break;

    case "dry-run":
    case "test":
      console.log(
        "🔍 Running migration in DRY RUN mode: 001-initial-tour-packages"
      );
      const dryRunResult = await runMigration001(true);
      console.log(`\n🎯 ${dryRunResult.message}`);
      if (dryRunResult.details) {
        console.log(
          `📊 Details: ${dryRunResult.details.created} would be created, ${dryRunResult.details.skipped} would be skipped`
        );
      }
      break;

    case "dry-run002":
      console.log(
        "🔍 Running migration in DRY RUN mode: 002-additional-tour-packages"
      );
      const dryRunResult002 = await runMigration002(true);
      console.log(`\n🎯 ${dryRunResult002.message}`);
      if (dryRunResult002.details) {
        console.log(
          `📊 Details: ${dryRunResult002.details.created} would be created, ${dryRunResult002.details.skipped} would be skipped`
        );
      }
      break;

    case "dry-run003":
      console.log(
        "🔍 Running migration in DRY RUN mode: 003-final-tour-packages"
      );
      const dryRunResult003 = await runMigration003(true);
      console.log(`\n🎯 ${dryRunResult003.message}`);
      if (dryRunResult003.details) {
        console.log(
          `📊 Details: ${dryRunResult003.details.created} would be created, ${dryRunResult003.details.skipped} would be skipped`
        );
      }
      break;

    case "dry-run004":
      console.log("🔍 Running migration in DRY RUN mode: 004-payment-plans");
      const dryRunResult004 = await runMigration004(true);
      console.log(`\n🎯 ${dryRunResult004.message}`);
      if (dryRunResult004.details) {
        console.log(
          `📊 Details: ${dryRunResult004.details.created} would be created, ${dryRunResult004.details.skipped} would be skipped`
        );
      }
      break;

    case "dry-run005":
      console.log(
        "🔍 Running migration in DRY RUN mode: 005-currency-usd-to-eur"
      );
      const dryRunResult005 = await runMigration005(true);
      console.log(`\n🎯 ${dryRunResult005.message}`);
      if (dryRunResult005.details) {
        console.log(
          `📊 Details: ${dryRunResult005.details.updated} would be updated, ${dryRunResult005.details.skipped} would be skipped`
        );
      }
      break;

    case "dry-run006":
      console.log(
        "🔍 Running migration in DRY RUN mode: 006-conditional-email-templates"
      );
      const dryRunResult006 = await runMigration006(true);
      console.log(`\n🎯 ${dryRunResult006.message}`);
      if (dryRunResult006.details) {
        console.log(
          `📊 Details: ${dryRunResult006.details.created} would be created, ${dryRunResult006.details.skipped} would be skipped`
        );
      }
      break;

    case "dry-run008":
      console.log(
        "🔍 Running migration in DRY RUN mode: 008-cancellation-email-template"
      );
      const dryRunResult008 = await runMigration008(true);
      console.log(`\n🎯 ${dryRunResult008.message}`);
      if (dryRunResult008.details) {
        console.log(
          `📊 Details: ${dryRunResult008.details.created} would be created, ${dryRunResult008.details.skipped} would be skipped`
        );
      }
      break;

    case "dry-run009":
      console.log(
        "🔍 Running migration in DRY RUN mode: 009-initial-payment-reminder-template"
      );
      const dryRunResult009 = await runMigration009(true);
      console.log(`\n🎯 ${dryRunResult009.message}`);
      if (dryRunResult009.details) {
        console.log(
          `📊 Details: ${dryRunResult009.details.created} would be created, ${dryRunResult009.details.skipped} would be skipped`
        );
      }
      break;

    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;

    default:
      console.log("❌ Unknown command. Use 'help' to see available commands.");
      process.exit(1);
  }

  process.exit(0);
}

function showHelp() {
  console.log(`
📖 Available Commands:

  run, 001           Run the migration to create initial tour packages
  002                Run the migration to create additional tour packages
  003                Run the migration to create final tour packages
  004                Run the migration to create payment plans
  005                Run the migration to create currency conversion rates (USD to EUR)
  006                Run the migration to create conditional email templates
  008                Run the migration to create cancellation email templates
  009                Run the migration to create initial payment reminder template
  rollback, undo     Rollback the migration 001 (delete created tours)
  rollback002        Rollback the migration 002 (delete created tours)
  rollback003        Rollback the migration 003 (delete created tours)
  rollback004        Rollback the migration 004 (delete created payment plans)
  rollback005        Rollback the migration 005 (delete currency conversion rates)
  rollback006        Rollback the migration 006 (delete conditional email templates)
  rollback008        Rollback the migration 008 (delete cancellation email template)
  rollback009        Rollback the migration 009 (delete initial payment reminder template)
  dry-run, test     Test the migration 001 without making changes
  dry-run002        Test the migration 002 without making changes
  dry-run003        Test the migration 003 without making changes
  dry-run004        Test the migration 004 without making changes
  dry-run005        Test the migration 005 without making changes
  dry-run006        Test the migration 006 without making changes
  dry-run008        Test the migration 008 without making changes
  dry-run009        Test the migration 009 without making changes
  help               Show this help message

📝 Examples:

  tsx migrations/migrate.ts 001        # Run migration 001 (initial tours)
  tsx migrations/migrate.ts 002        # Run migration 002 (additional tours)
  tsx migrations/migrate.ts 003        # Run migration 003 (final tours)
  tsx migrations/migrate.ts 004        # Run migration 004 (payment plans)
  tsx migrations/migrate.ts 005        # Run migration 005 (currency conversion)
  tsx migrations/migrate.ts 006        # Run migration 006 (conditional email templates)
  tsx migrations/migrate.ts 008        # Run migration 008 (cancellation email templates)
  tsx migrations/migrate.ts 009        # Run migration 009 (initial payment reminder template)
  tsx migrations/migrate.ts dry-run    # Test migration 001 without changes
  tsx migrations/migrate.ts dry-run002 # Test migration 002 without changes
  tsx migrations/migrate.ts dry-run003 # Test migration 003 without changes
  tsx migrations/migrate.ts dry-run004 # Test migration 004 without changes
  tsx migrations/migrate.ts dry-run005 # Test migration 005 without changes
  tsx migrations/migrate.ts dry-run006 # Test migration 006 without changes
  tsx migrations/migrate.ts dry-run008 # Test migration 008 without changes
  tsx migrations/migrate.ts rollback   # Undo migration 001
  tsx migrations/migrate.ts rollback002 # Undo migration 002
  tsx migrations/migrate.ts rollback003 # Undo migration 003
  tsx migrations/migrate.ts rollback004 # Undo migration 004
  tsx migrations/migrate.ts rollback005 # Undo migration 005
  tsx migrations/migrate.ts rollback006 # Undo migration 006
  tsx migrations/migrate.ts rollback008 # Undo migration 008
  tsx migrations/migrate.ts rollback009 # Undo migration 009

🔧 Options:

  --dry-run, -d     Run in dry-run mode (no actual changes)

📊 What These Migrations Do:

  Migration 001 - Initial Tour Packages:
  - Siargao Island Adventure (SIA)
  - Philippine Sunrise (PHS) 
  - Philippines Sunset (PSS)
  - Maldives Bucketlist (MLB)

  Migration 002 - Additional Tour Packages:
  - Sri Lanka Wander Tour (SLW)
  - Argentina's Wonders (ARW)
  - Brazil's Treasures (BZT)
  - Vietnam Expedition (VNE)

  Migration 003 - Final Tour Packages:
  - India Discovery Tour (IDD)
  - India Holi Festival Tour (IHF)
  - Tanzania Exploration (TXP)
  - New Zealand Expedition (NZE)

  Migration 004 - Payment Plans:
  - Invalid Booking (0% deposit)
  - Full Payment Required Within 2 Days (0% deposit)
  - P1 - Single Instalment (0% deposit, 100% in 1 payment)
  - P2 - Two Instalments (0% deposit, 50% × 2 payments)
  - P3 - Three Instalments (0% deposit, 33.33% × 3 payments)
  - P4 - Four Instalments (0% deposit, 25% × 4 payments)

  Migration 005 - Currency Conversion:
  - Converts all USD prices to EUR prices
  - Updates all currency fields in the database

  Migration 006 - Conditional Email Templates:
  - Adds reservation email template with conditional rendering
  - Supports different payment term scenarios (P1, P2, P3, P4, Invalid, etc.)
  - Dynamic content based on booking type and payment terms
  - Uses custom conditional syntax: <? if (condition) { ?> content <? } ?>

  Migration 008 - Cancellation Email Templates:
  - Adds a template for sending cancellation emails
  - Supports different booking statuses (Cancelled, Refunded, etc.)
  - Dynamic content based on booking details
  - Uses custom conditional syntax: <? if (condition) { ?> content <? } ?>

  Migration 009 - Initial Payment Reminder Template:
  - Adds a comprehensive payment reminder email template
  - Supports different payment methods (Stripe, Revolut, Ulster)
  - Dynamic payment tracker table with array-based data
  - Uses Google Apps Script-like syntax: <?= variable ?> and <? logic ?>
  - Includes calendar integration and payment tracking

  Each tour includes:
  - Complete itinerary with day-by-day activities
  - Multiple travel dates with capacity limits
  - Pricing and deposit information
  - Highlights and requirements
  - External links (Stripe, brochures)
`);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// ============================================================================
// RUN THE MIGRATION
// ============================================================================

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
}
