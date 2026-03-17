#!/usr/bin/env node

// Load environment variables first
import dotenv from "dotenv";
import path from "path";

// Load .env.local file
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Environment variables loaded via dotenv

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
import {
  runMigration as runMigration010,
  rollbackMigration as rollbackMigration010,
} from "./010-scheduled-reminder-email-template";
import {
  runMigration as runMigration012,
  rollbackMigration as rollbackMigration012,
} from "./012-default-booking-sheet-columns";
import {
  runMigration as runMigration013,
  rollbackMigration as rollbackMigration013,
} from "./013-sample-booking-with-all-columns";
import {
  runMigration as runMigration014,
  rollbackMigration as rollbackMigration014,
} from "./014-update-column-interface";
import {
  runMigration as runMigration015,
  rollbackMigration as rollbackMigration015,
} from "./015-remove-column-behavior-fields";
import {
  runMigration as runMigration016,
  rollbackMigration as rollbackMigration016,
} from "./016-remove-column-required-field";
import {
  runMigration as runMigration017,
  rollbackMigration as rollbackMigration017,
} from "./017-update-payment-columns";
import {
  runMigration as runMigration018,
  rollbackMigration as rollbackMigration018,
  dryRun as dryRun018,
} from "./018-update-booking-field-names";
import {
  runMigration as runMigration019,
  rollbackMigration as rollbackMigration019,
  dryRun as dryRun019,
} from "./019-update-column-ids";
import {
  runMigration as runMigration020,
  rollbackMigration as rollbackMigration020,
  dryRun as dryRun020,
} from "./020-rebuild-columns-with-custom-ids";
import {
  runMigration as runMigration023,
  rollbackMigration as rollbackMigration023,
} from "./023-add-parent-tab-field";
import {
  runMigration024,
  rollbackMigration024,
} from "./024-update-parent-tabs";
import {
  runMigration025,
  rollbackMigration025,
} from "./025-remove-emoji-from-parent-tabs";
import {
  runMigration026,
  rollbackMigration026,
} from "./026-move-payment-progress-to-payment-setting";
import {
  runMigration as runMigration027,
  rollbackMigration as rollbackMigration027,
} from "./027-import-booking-sheet-columns";
import {
  runMigration as runMigration028,
  rollbackMigration as rollbackMigration028,
} from "./028-import-ts-folders";
import {
  runMigration as runMigration029,
  rollbackMigration as rollbackMigration029,
} from "./029-import-ts-files";
import {
  runMigration as runMigration030,
  rollbackMigration as rollbackMigration030,
} from "./030-import-payment-terms";
import {
  runMigration as runMigration031,
  rollbackMigration as rollbackMigration031,
} from "./031-import-tour-packages";
import {
  runMigration as runMigration032,
  rollbackMigration as rollbackMigration032,
} from "./032-import-email-templates";
import {
  runMigration as runMigration033,
  rollbackMigration as rollbackMigration033,
} from "./033-convert-duration-to-string";
import {
  runMigration as runMigration040,
  rollbackMigration as rollbackMigration040,
} from "./040-booking-confirmation-email-template";
import {
  runMigration as runMigration041,
  rollbackMigration as rollbackMigration041,
} from "./041-pre-departure-config";
import {
  runMigration as runMigration042,
  rollbackMigration as rollbackMigration042,
} from "./042-revolut-payment-status-email-templates";
import {
  runMigration as runMigration043,
  rollbackMigration as rollbackMigration043,
} from "./043-update-revolut-payment-status-term-label";
import {
  runMigration as runMigration044,
  rollbackMigration as rollbackMigration044,
} from "./044-late-fees-config";
import {
  runMigration as runMigration045,
  rollbackMigration as rollbackMigration045,
} from "./045-late-fee-notice-email-template";
import migration034 from "./034-initialize-columns-metadata";

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

    case "002":
      console.log("📊 Running migration: 002-additional-tour-packages");
      const result002 = await runMigration002(dryRun);
      console.log(`\n🎯 ${result002.message}`);
      if (result002.details) {
        console.log(
          `📊 Details: ${result002.details.created} created, ${result002.details.skipped} skipped, ${result002.details.errors} errors`,
        );
        if (
          result002.details.errorDetails &&
          result002.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          result002.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "043":
      console.log(
        "📊 Running migration: 043-update-revolut-payment-status-term-label",
      );
      const result043 = await runMigration043(dryRun);
      console.log(`\n🎯 ${result043.message}`);
      if (result043.details) {
        console.log(
          `📊 Details: ${result043.details.updated} updated, ${result043.details.skipped} skipped, ${result043.details.errors.length} errors`,
        );
        if (result043.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result043.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "044":
      console.log("📊 Running migration: 044-late-fees-config");
      await runMigration044();
      break;

    case "045":
      console.log("📊 Running migration: 045-late-fee-notice-email-template");
      const result045 = await runMigration045(dryRun);
      console.log(`\n🎯 ${result045.message}`);
      if (result045.details) {
        console.log(
          `📊 Details: ${result045.details.created} created, ${result045.details.skipped} skipped, ${result045.details.errors.length} errors`,
        );
        if (result045.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result045.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${result003.details.created} created, ${result003.details.skipped} skipped, ${result003.details.errors} errors`,
        );
        if (
          result003.details.errorDetails &&
          result003.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          result003.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${result004.details.created} created, ${result004.details.skipped} skipped, ${result004.details.errors.length} errors`,
        );
        if (result004.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result004.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${result005.details.updated} updated, ${result005.details.skipped} skipped, ${result005.details.errors.length} errors`,
        );
        if (result005.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result005.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${result006.details.created} created, ${result006.details.skipped} skipped, ${result006.details.errors.length} errors`,
        );
        if (result006.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result006.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
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
          `�� Details: ${result008.details.created} created, ${result008.details.skipped} skipped, ${result008.details.errors.length} errors`,
        );
        if (result008.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result008.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "009":
      console.log(
        "📊 Running migration: 009-initial-payment-reminder-template",
      );
      const result009 = await runMigration009(dryRun);
      console.log(`\n🎯 ${result009.message}`);
      if (result009.details) {
        console.log(
          `📊 Details: ${result009.details.created} created, ${result009.details.skipped} skipped, ${result009.details.errors.length} errors`,
        );
        if (result009.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result009.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "010":
      console.log(
        "📊 Running migration: 010-scheduled-reminder-email-template",
      );
      const result010 = await runMigration010(dryRun);
      console.log(`\n🎯 ${result010.message}`);
      if (result010.details) {
        console.log(
          `📊 Details: ${result010.details.created} created, ${result010.details.skipped} skipped, ${result010.details.errors.length} errors`,
        );
        if (result010.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result010.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "012":
      console.log("📊 Running migration: 012-default-booking-sheet-columns");
      const result012 = await runMigration012(dryRun);
      console.log(`\n🎯 ${result012.message}`);
      if (result012.details) {
        console.log(
          `📊 Details: ${result012.details.created} created, ${result012.details.skipped} skipped, ${result012.details.errors.length} errors`,
        );
        if (result012.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result012.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "013":
      console.log("📊 Running migration: 013-sample-booking-with-all-columns");
      const result013 = await runMigration013(dryRun);
      console.log(`\n🎯 ${result013.message}`);
      if (result013.details) {
        console.log(
          `📊 Details: ${
            result013.details.columnsFound
          } columns found, booking ${
            result013.details.bookingCreated ? "created" : "not created"
          }, ${result013.details.errors.length} errors`,
        );
        if (result013.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result013.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "014":
      console.log("📊 Running migration: 014-update-column-interface");
      const result014 = await runMigration014(dryRun);
      console.log(`\n🎯 ${result014.message}`);
      if (result014.details) {
        console.log(
          `📊 Details: ${result014.details.updatedCount} updated, ${result014.details.skippedCount} skipped, ${result014.details.errorCount} errors`,
        );
        if (result014.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          result014.details.migrationResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "015":
      console.log("📊 Running migration: 015-remove-column-behavior-fields");
      const result015 = await runMigration015(dryRun);
      console.log(`\n🎯 ${result015.message}`);
      if (result015.details) {
        console.log(
          `📊 Details: ${result015.details.updatedCount} updated, ${result015.details.skippedCount} skipped, ${result015.details.errorCount} errors`,
        );
        if (result015.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          result015.details.migrationResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "016":
      console.log("📊 Running migration: 016-remove-column-required-field");
      const result016 = await runMigration016(dryRun);
      console.log(`\n🎯 ${result016.message}`);
      if (result016.details) {
        console.log(
          `📊 Details: ${result016.details.updatedCount} updated, ${result016.details.skippedCount} skipped, ${result016.details.errorCount} errors`,
        );
        if (result016.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          result016.details.migrationResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "017":
      console.log("📊 Running migration: 017-update-payment-columns");
      const result017 = await runMigration017(dryRun);
      console.log(`\n🎯 ${result017.message}`);
      if (result017.details) {
        console.log(
          `📊 Details: ${result017.details.deletedCount} deleted, ${result017.details.addedCount} added, ${result017.details.updatedCount} updated, ${result017.details.errorCount} errors`,
        );
        if (result017.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          result017.details.migrationResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "018":
      console.log("📊 Running migration: 018-update-booking-field-names");
      if (dryRun) {
        await dryRun018();
      } else {
        await runMigration018();
      }
      break;

    case "019":
      console.log("📊 Running migration: 019-update-column-ids");
      if (dryRun) {
        await dryRun019();
      } else {
        await runMigration019();
      }
      break;

    case "020":
      console.log("📊 Running migration: 020-rebuild-columns-with-custom-ids");
      if (dryRun) {
        await dryRun020();
      } else {
        await runMigration020();
      }
      break;

    case "027":
      console.log("📊 Running migration: 027-import-booking-sheet-columns");
      const result027 = await runMigration027(dryRun);
      console.log(`\n🎯 ${result027.message}`);
      if (result027.details) {
        console.log(
          `📊 Details: ${result027.details.created} created, ${result027.details.skipped} skipped, ${result027.details.errors} errors`,
        );
        console.log(`📄 File: ${result027.details.fileUsed}`);
      }
      break;

    case "028":
      console.log("📊 Running migration: 028-import-ts-folders");
      const result028 = await runMigration028(dryRun);
      console.log(`\n🎯 ${result028.message}`);
      break;

    case "029":
      console.log("📊 Running migration: 029-import-ts-files");
      const result029 = await runMigration029(dryRun);
      console.log(`\n🎯 ${result029.message}`);
      break;

    case "030":
      console.log("📊 Running migration: 030-import-payment-terms");
      const result030 = await runMigration030(dryRun);
      console.log(`\n🎯 ${result030.message}`);
      break;

    case "031":
      console.log("📊 Running migration: 031-import-tour-packages");
      const result031 = await runMigration031(dryRun);
      console.log(`\n🎯 ${result031.message}`);
      break;

    case "032":
      console.log("📊 Running migration: 032-import-email-templates");
      const result032 = await runMigration032(dryRun);
      console.log(`\n🎯 ${result032.message}`);
      break;

    case "033":
      console.log("📊 Running migration: 033-convert-duration-to-string");
      const result033 = await runMigration033(dryRun);
      console.log(`\n🎯 ${result033.message}`);
      if (result033.details) {
        console.log(
          `📊 Details: ${result033.details.updated} updated, ${result033.details.skipped} skipped, ${result033.details.errors.length} errors`,
        );
        if (result033.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result033.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "040":
      console.log(
        "📊 Running migration: 040-booking-confirmation-email-template",
      );
      await runMigration040();
      break;

    case "041":
      console.log("📊 Running migration: 041-pre-departure-config");
      await runMigration041();
      break;

    case "042":
      console.log(
        "📊 Running migration: 042-revolut-payment-status-email-templates",
      );
      const result042 = await runMigration042(dryRun);
      console.log(`\n🎯 ${result042.message}`);
      if (result042.details) {
        console.log(
          `📊 Details: ${result042.details.created} created, ${result042.details.skipped} skipped, ${result042.details.errors.length} errors`,
        );
        if (result042.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result042.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "034":
      console.log("📊 Running migration: 034-initialize-columns-metadata");
      const result034 = await migration034.run();
      console.log(`\n🎯 ${result034.message}`);
      if (result034.details) {
        console.log(
          `📊 Details: ${result034.details.usersUpdated} users updated, ${result034.details.errors.length} errors`,
        );
        if (result034.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          result034.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "023":
      console.log("📊 Running migration: 023-add-parent-tab-field");
      const result023 = await runMigration023(dryRun);
      console.log(`\n🎯 ${result023.message}`);
      if (result023.details) {
        console.log(
          `📊 Details: ${result023.details.updatedCount} updated, ${result023.details.skippedCount} skipped, ${result023.details.errorCount} errors`,
        );
        if (result023.details.migrationResults) {
          const errors = result023.details.migrationResults.filter(
            (r: any) => r.status === "error",
          );
          if (errors.length > 0) {
            console.log("\n❌ Errors:");
            errors.forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
          }
        }
      }
      break;

    case "024":
      console.log("📊 Running migration: 024-update-parent-tabs");
      await runMigration024();
      break;

    case "025":
      console.log("📊 Running migration: 025-remove-emoji-from-parent-tabs");
      await runMigration025();
      break;

    case "026":
      console.log(
        "📊 Running migration: 026-move-payment-progress-to-payment-setting",
      );
      await runMigration026();
      break;

    case "rollback":
    case "rollback002":
      console.log("🔄 Rolling back migration: 002-additional-tour-packages");
      const rollbackResult002 = await rollbackMigration002();
      console.log(`\n🎯 ${rollbackResult002.message}`);
      if (rollbackResult002.details) {
        console.log(
          `📊 Details: ${rollbackResult002.details.deleted} deleted, ${rollbackResult002.details.errors} errors`,
        );
        if (
          rollbackResult002.details.errorDetails &&
          rollbackResult002.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          rollbackResult002.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback043":
      console.log(
        "🔄 Rolling back migration: 043-update-revolut-payment-status-term-label",
      );
      const rollbackResult043 = await rollbackMigration043();
      console.log(`\n🎯 ${rollbackResult043.message}`);
      break;

    case "rollback044":
      console.log("🔄 Rolling back migration: 044-late-fees-config");
      await rollbackMigration044();
      break;

    case "rollback045":
      console.log(
        "🔄 Rolling back migration: 045-late-fee-notice-email-template",
      );
      const rollbackResult045 = await rollbackMigration045();
      console.log(`\n🎯 ${rollbackResult045.message}`);
      break;

    case "rollback003":
      console.log("🔄 Rolling back migration: 003-final-tour-packages");
      const rollbackResult003 = await rollbackMigration003();
      console.log(`\n🎯 ${rollbackResult003.message}`);
      if (rollbackResult003.details) {
        console.log(
          `📊 Details: ${rollbackResult003.details.deleted} deleted, ${rollbackResult003.details.errors} errors`,
        );
        if (
          rollbackResult003.details.errorDetails &&
          rollbackResult003.details.errorDetails.length > 0
        ) {
          console.log("\n❌ Errors:");
          rollbackResult003.details.errorDetails.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${rollbackResult004.details.deleted} deleted, ${rollbackResult004.details.errors.length} errors`,
        );
        if (rollbackResult004.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult004.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${rollbackResult005.details.reverted} reverted, ${rollbackResult005.details.errors.length} errors`,
        );
        if (rollbackResult005.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult005.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${rollbackResult006.details.deleted} deleted, ${rollbackResult006.details.errors.length} errors`,
        );
        if (rollbackResult006.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult006.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
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
          `📊 Details: ${rollbackResult008.details.created} created, ${rollbackResult008.details.skipped} skipped, ${rollbackResult008.details.errors.length} errors`,
        );
        if (rollbackResult008.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult008.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback009":
      console.log(
        "🔄 Rolling back migration: 009-initial-payment-reminder-template",
      );
      const rollbackResult009 = await rollbackMigration009();
      console.log(`\n🎯 ${rollbackResult009.message}`);
      if (rollbackResult009.details) {
        console.log(
          `📊 Details: ${rollbackResult009.details.deleted} deleted, ${rollbackResult009.details.errors.length} errors`,
        );
        if (rollbackResult009.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult009.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback010":
      console.log(
        "🔄 Rolling back migration: 010-scheduled-reminder-email-template",
      );
      const rollbackResult010 = await rollbackMigration010();
      console.log(`\n🎯 ${rollbackResult010.message}`);
      if (rollbackResult010.details) {
        console.log(
          `📊 Details: ${rollbackResult010.details.deleted} deleted, ${rollbackResult010.details.errors.length} errors`,
        );
        if (rollbackResult010.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult010.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback012":
      console.log(
        "🔄 Rolling back migration: 012-default-booking-sheet-columns",
      );
      const rollbackResult012 = await rollbackMigration012();
      console.log(`\n🎯 ${rollbackResult012.message}`);
      if (rollbackResult012.details) {
        console.log(
          `📊 Details: ${rollbackResult012.details.deleted} deleted, ${rollbackResult012.details.errors.length} errors`,
        );
        if (rollbackResult012.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult012.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback013":
      console.log(
        "🔄 Rolling back migration: 013-sample-booking-with-all-columns",
      );
      const rollbackResult013 = await rollbackMigration013();
      console.log(`\n🎯 ${rollbackResult013.message}`);
      if (rollbackResult013.details) {
        console.log(
          `📊 Details: ${rollbackResult013.details.deleted} deleted, ${rollbackResult013.details.errors.length} errors`,
        );
        if (rollbackResult013.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult013.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback014":
      console.log("🔄 Rolling back migration: 014-update-column-interface");
      const rollbackResult014 = await rollbackMigration014();
      console.log(`\n🎯 ${rollbackResult014.message}`);
      if (rollbackResult014.details) {
        console.log(
          `📊 Details: ${rollbackResult014.details.rollbackCount} rolled back, ${rollbackResult014.details.errorCount} errors`,
        );
        if (rollbackResult014.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          rollbackResult014.details.rollbackResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "rollback015":
      console.log(
        "🔄 Rolling back migration: 015-remove-column-behavior-fields",
      );
      const rollbackResult015 = await rollbackMigration015();
      console.log(`\n🎯 ${rollbackResult015.message}`);
      if (rollbackResult015.details) {
        console.log(
          `📊 Details: ${rollbackResult015.details.rollbackCount} rolled back, ${rollbackResult015.details.errorCount} errors`,
        );
        if (rollbackResult015.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          rollbackResult015.details.rollbackResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "rollback016":
      console.log(
        "🔄 Rolling back migration: 016-remove-column-required-field",
      );
      const rollbackResult016 = await rollbackMigration016();
      console.log(`\n🎯 ${rollbackResult016.message}`);
      if (rollbackResult016.details) {
        console.log(
          `📊 Details: ${rollbackResult016.details.rollbackCount} rolled back, ${rollbackResult016.details.errorCount} errors`,
        );
        if (rollbackResult016.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          rollbackResult016.details.rollbackResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "rollback017":
      console.log("🔄 Rolling back migration: 017-update-payment-columns");
      const rollbackResult017 = await rollbackMigration017();
      console.log(`\n🎯 ${rollbackResult017.message}`);
      if (rollbackResult017.details) {
        console.log(
          `📊 Details: ${rollbackResult017.details.rollbackCount} rolled back, ${rollbackResult017.details.errorCount} errors`,
        );
        if (rollbackResult017.details.errorCount > 0) {
          console.log("\n❌ Errors:");
          rollbackResult017.details.rollbackResults
            .filter((r: any) => r.status === "error")
            .forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
        }
      }
      break;

    case "rollback018":
      console.log("🔄 Rolling back migration: 018-update-booking-field-names");
      await rollbackMigration018();
      break;

    case "rollback019":
      console.log("🔄 Rolling back migration: 019-update-column-ids");
      await rollbackMigration019();
      break;

    case "rollback020":
      console.log(
        "🔄 Rolling back migration: 020-rebuild-columns-with-custom-ids",
      );
      await rollbackMigration020();
      break;

    case "rollback033":
      console.log("🔄 Rolling back migration: 033-convert-duration-to-string");
      const rollbackResult033 = await rollbackMigration033();
      console.log(`\n🎯 ${rollbackResult033.message}`);
      if (rollbackResult033.details) {
        console.log(
          `📊 Details: ${rollbackResult033.details.reverted} reverted, ${rollbackResult033.details.errors.length} errors`,
        );
        if (rollbackResult033.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult033.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback040":
      console.log(
        "🔄 Rolling back migration: 040-booking-confirmation-email-template",
      );
      await rollbackMigration040();
      break;

    case "rollback041":
      console.log("🔄 Rolling back migration: 041-pre-departure-config");
      await rollbackMigration041();
      break;

    case "rollback042":
      console.log(
        "🔄 Rolling back migration: 042-revolut-payment-status-email-templates",
      );
      const rollbackResult042 = await rollbackMigration042();
      console.log(`\n🎯 ${rollbackResult042.message}`);
      if (rollbackResult042.details) {
        console.log(
          `📊 Details: ${rollbackResult042.details.deleted} deleted, ${rollbackResult042.details.errors.length} errors`,
        );
        if (rollbackResult042.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult042.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback034":
      console.log("🔄 Rolling back migration: 034-initialize-columns-metadata");
      const rollbackResult034 = await migration034.rollback();
      console.log(`\n🎯 ${rollbackResult034.message}`);
      if (rollbackResult034.details) {
        console.log(
          `📊 Details: ${rollbackResult034.details.usersRolledBack} users rolled back, ${rollbackResult034.details.errors.length} errors`,
        );
        if (rollbackResult034.details.errors.length > 0) {
          console.log("\n❌ Errors:");
          rollbackResult034.details.errors.forEach((error) =>
            console.log(`  - ${error}`),
          );
        }
      }
      break;

    case "rollback023":
      console.log("🔄 Rolling back migration: 023-add-parent-tab-field");
      const rollbackResult023 = await rollbackMigration023();
      console.log(`\n🎯 ${rollbackResult023.message}`);
      if (rollbackResult023.details) {
        console.log(
          `📊 Details: ${rollbackResult023.details.rollbackCount} rolled back, ${rollbackResult023.details.errorCount} errors`,
        );
        if (rollbackResult023.details.rollbackResults) {
          const errors = rollbackResult023.details.rollbackResults.filter(
            (r: any) => r.status === "error",
          );
          if (errors.length > 0) {
            console.log("\n❌ Errors:");
            errors.forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
          }
        }
      }
      break;

    case "rollback024":
      console.log("🔄 Rolling back migration: 024-update-parent-tabs");
      await rollbackMigration024();
      break;

    case "rollback025":
      console.log(
        "🔄 Rolling back migration: 025-remove-emoji-from-parent-tabs",
      );
      await rollbackMigration025();
      break;

    case "rollback026":
      console.log(
        "🔄 Rolling back migration: 026-move-payment-progress-to-payment-setting",
      );
      await rollbackMigration026();
      break;

    case "dry-run":
    case "dry-run002":
      console.log(
        "🔍 Running migration in DRY RUN mode: 002-additional-tour-packages",
      );
      const dryRunResult002 = await runMigration002(true);
      console.log(`\n🎯 ${dryRunResult002.message}`);
      if (dryRunResult002.details) {
        console.log(
          `📊 Details: ${dryRunResult002.details.created} would be created, ${dryRunResult002.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run003":
      console.log(
        "🔍 Running migration in DRY RUN mode: 003-final-tour-packages",
      );
      const dryRunResult003 = await runMigration003(true);
      console.log(`\n🎯 ${dryRunResult003.message}`);
      if (dryRunResult003.details) {
        console.log(
          `📊 Details: ${dryRunResult003.details.created} would be created, ${dryRunResult003.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run043":
      console.log(
        "🔍 Running migration in DRY RUN mode: 043-update-revolut-payment-status-term-label",
      );
      const dryRunResult043 = await runMigration043(true);
      console.log(`\n🎯 ${dryRunResult043.message}`);
      if (dryRunResult043.details) {
        console.log(
          `📊 Details: ${dryRunResult043.details.updated} would be updated, ${dryRunResult043.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run004":
      console.log("🔍 Running migration in DRY RUN mode: 004-payment-plans");
      const dryRunResult004 = await runMigration004(true);
      console.log(`\n🎯 ${dryRunResult004.message}`);
      if (dryRunResult004.details) {
        console.log(
          `📊 Details: ${dryRunResult004.details.created} would be created, ${dryRunResult004.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run005":
      console.log(
        "🔍 Running migration in DRY RUN mode: 005-currency-usd-to-eur",
      );
      const dryRunResult005 = await runMigration005(true);
      console.log(`\n🎯 ${dryRunResult005.message}`);
      if (dryRunResult005.details) {
        console.log(
          `📊 Details: ${dryRunResult005.details.updated} would be updated, ${dryRunResult005.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run006":
      console.log(
        "🔍 Running migration in DRY RUN mode: 006-conditional-email-templates",
      );
      const dryRunResult006 = await runMigration006(true);
      console.log(`\n🎯 ${dryRunResult006.message}`);
      if (dryRunResult006.details) {
        console.log(
          `📊 Details: ${dryRunResult006.details.created} would be created, ${dryRunResult006.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run008":
      console.log(
        "🔍 Running migration in DRY RUN mode: 008-cancellation-email-template",
      );
      const dryRunResult008 = await runMigration008(true);
      console.log(`\n🎯 ${dryRunResult008.message}`);
      if (dryRunResult008.details) {
        console.log(
          `📊 Details: ${dryRunResult008.details.created} would be created, ${dryRunResult008.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run009":
      console.log(
        "🔍 Running migration in DRY RUN mode: 009-initial-payment-reminder-template",
      );
      const dryRunResult009 = await runMigration009(true);
      console.log(`\n🎯 ${dryRunResult009.message}`);
      if (dryRunResult009.details) {
        console.log(
          `📊 Details: ${dryRunResult009.details.created} would be created, ${dryRunResult009.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run010":
      console.log(
        "🔍 Running migration in DRY RUN mode: 010-scheduled-reminder-email-template",
      );
      const dryRunResult010 = await runMigration010(true);
      console.log(`\n🎯 ${dryRunResult010.message}`);
      if (dryRunResult010.details) {
        console.log(
          `📊 Details: ${dryRunResult010.details.created} would be created, ${dryRunResult010.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run012":
      console.log(
        "🔍 Running migration in DRY RUN mode: 012-default-booking-sheet-columns",
      );
      const dryRunResult012 = await runMigration012(true);
      console.log(`\n🎯 ${dryRunResult012.message}`);
      if (dryRunResult012.details) {
        console.log(
          `📊 Details: ${dryRunResult012.details.created} would be created, ${dryRunResult012.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run013":
      console.log(
        "🔍 Running migration in DRY RUN mode: 013-sample-booking-with-all-columns",
      );
      const dryRunResult013 = await runMigration013(true);
      console.log(`\n🎯 ${dryRunResult013.message}`);
      if (dryRunResult013.details) {
        console.log(
          `📊 Details: ${dryRunResult013.details.columnsFound} columns found, would create sample booking`,
        );
      }
      break;

    case "dry-run014":
      console.log(
        "🔍 Running migration in DRY RUN mode: 014-update-column-interface",
      );
      const dryRunResult014 = await runMigration014(true);
      console.log(`\n🎯 ${dryRunResult014.message}`);
      if (dryRunResult014.details) {
        console.log(
          `📊 Details: ${dryRunResult014.details.updatedCount} would be updated, ${dryRunResult014.details.skippedCount} would be skipped`,
        );
      }
      break;

    case "dry-run015":
      console.log(
        "🔍 Running migration in DRY RUN mode: 015-remove-column-behavior-fields",
      );
      const dryRunResult015 = await runMigration015(true);
      console.log(`\n🎯 ${dryRunResult015.message}`);
      if (dryRunResult015.details) {
        console.log(
          `📊 Details: ${dryRunResult015.details.updatedCount} would be updated, ${dryRunResult015.details.skippedCount} would be skipped`,
        );
      }
      break;

    case "dry-run016":
      console.log(
        "🔍 Running migration in DRY RUN mode: 016-remove-column-required-field",
      );
      const dryRunResult016 = await runMigration016(true);
      console.log(`\n🎯 ${dryRunResult016.message}`);
      if (dryRunResult016.details) {
        console.log(
          `📊 Details: ${dryRunResult016.details.updatedCount} would be updated, ${dryRunResult016.details.skippedCount} would be skipped`,
        );
      }
      break;

    case "dry-run017":
      console.log(
        "🔍 Running migration in DRY RUN mode: 017-update-payment-columns",
      );
      const dryRunResult017 = await runMigration017(true);
      console.log(`\n🎯 ${dryRunResult017.message}`);
      if (dryRunResult017.details) {
        console.log(
          `📊 Details: ${dryRunResult017.details.deletedCount} would be deleted, ${dryRunResult017.details.addedCount} would be added, ${dryRunResult017.details.updatedCount} would be updated`,
        );
      }
      break;

    case "dry-run018":
      console.log(
        "🔍 Running migration in DRY RUN mode: 018-update-booking-field-names",
      );
      await dryRun018();
      break;

    case "dry-run019":
      console.log(
        "🔍 Running migration in DRY RUN mode: 019-update-column-ids",
      );
      await dryRun019();
      break;

    case "dry-run033":
      console.log(
        "🔍 Running migration in DRY RUN mode: 033-convert-duration-to-string",
      );
      const dryRunResult033 = await runMigration033(true);
      console.log(`\n🎯 ${dryRunResult033.message}`);
      if (dryRunResult033.details) {
        console.log(
          `📊 Details: ${dryRunResult033.details.updated} would be updated, ${dryRunResult033.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run020":
      console.log(
        "🔍 Running migration in DRY RUN mode: 020-rebuild-columns-with-custom-ids",
      );
      await dryRun020();
      break;

    case "dry-run023":
      console.log(
        "🔍 Running migration in DRY RUN mode: 023-add-parent-tab-field",
      );
      const dryRunResult023 = await runMigration023(true);
      console.log(`\n🎯 ${dryRunResult023.message}`);
      if (dryRunResult023.details) {
        console.log(
          `📊 Details: ${dryRunResult023.details.updatedCount} would be updated, ${dryRunResult023.details.skippedCount} skipped, ${dryRunResult023.details.errorCount} errors`,
        );
        if (dryRunResult023.details.migrationResults) {
          const errors = dryRunResult023.details.migrationResults.filter(
            (r: any) => r.status === "error",
          );
          if (errors.length > 0) {
            console.log("\n❌ Errors:");
            errors.forEach((error: any) =>
              console.log(`  - ${error.id}: ${error.error}`),
            );
          }
        }
      }
      break;

    case "dry-run042":
      console.log(
        "🔍 Running migration in DRY RUN mode: 042-revolut-payment-status-email-templates",
      );
      const dryRunResult042 = await runMigration042(true);
      console.log(`\n🎯 ${dryRunResult042.message}`);
      if (dryRunResult042.details) {
        console.log(
          `📊 Details: ${dryRunResult042.details.created} would be created, ${dryRunResult042.details.skipped} would be skipped`,
        );
      }
      break;

    case "dry-run045":
      console.log(
        "🔍 Running migration in DRY RUN mode: 045-late-fee-notice-email-template",
      );
      const dryRunResult045 = await runMigration045(true);
      console.log(`\n🎯 ${dryRunResult045.message}`);
      if (dryRunResult045.details) {
        console.log(
          `📊 Details: ${dryRunResult045.details.created} would be created, ${dryRunResult045.details.skipped} would be skipped`,
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
  010                Run the migration to create scheduled reminder email template
  012                Run the migration to create default booking sheet columns
  013                Run the migration to create sample booking with all columns
  014                Run the migration to update column interface (name->columnName, type->dataType)
  015                Run the migration to remove column behavior fields (visible, editable, sortable, filterable)
  016                Run the migration to remove column required field
  017                Run the migration to update payment columns structure
  018                Run the migration to update booking field names from col-<n> to Firestore column IDs
  019                Run the migration to update column id fields to use actual Firestore document IDs
  020                Run the migration to rebuild columns with custom IDs based on column names
  042                Run the migration to create Revolut payment decision email templates
  043                Run the migration to update Revolut payment templates with approved term labels
  044                Run the migration to create late-fees config document
  045                Run the migration to create late-fee notice email template
  rollback, undo     Rollback the migration 001 (delete created tours)
  rollback002        Rollback the migration 002 (delete created tours)
  rollback003        Rollback the migration 003 (delete created tours)
  rollback004        Rollback the migration 004 (delete created payment plans)
  rollback005        Rollback the migration 005 (delete currency conversion rates)
  rollback006        Rollback the migration 006 (delete conditional email templates)
  rollback008        Rollback the migration 008 (delete cancellation email template)
  rollback009        Rollback the migration 009 (delete initial payment reminder template)
  rollback010        Rollback the migration 010 (delete scheduled reminder email template)
  rollback012        Rollback the migration 012 (delete default booking sheet columns)
  rollback013        Rollback the migration 013 (delete sample booking)
  rollback014        Rollback the migration 014 (restore old column interface)
  rollback015        Rollback the migration 015 (restore column behavior fields)
  rollback016        Rollback the migration 016 (restore column required field)
  rollback017        Rollback the migration 017 (restore old payment columns structure)
  rollback018        Rollback the migration 018 (restore col-<n> field names)
  rollback019        Rollback the migration 019 (restore col-<n> id fields)
  rollback020        Rollback the migration 020 (delete columns with custom IDs)
  rollback042        Rollback the migration 042 (delete Revolut payment decision email templates)
  rollback043        Rollback the migration 043 (no-op informational rollback)
  rollback044        Rollback the migration 044 (delete late-fees config document)
  rollback045        Rollback the migration 045 (delete late-fee notice email template)
  dry-run, test     Test the migration 001 without making changes
  dry-run002        Test the migration 002 without making changes
  dry-run003        Test the migration 003 without making changes
  dry-run004        Test the migration 004 without making changes
  dry-run005        Test the migration 005 without making changes
  dry-run006        Test the migration 006 without making changes
  dry-run008        Test the migration 008 without making changes
  dry-run009        Test the migration 009 without making changes
  dry-run010        Test the migration 010 without making changes
  dry-run012        Test the migration 012 without making changes
  dry-run013        Test the migration 013 without making changes
  dry-run014        Test the migration 014 without making changes
  dry-run015        Test the migration 015 without making changes
  dry-run016        Test the migration 016 without making changes
  dry-run017        Test the migration 017 without making changes
  dry-run018        Test the migration 018 without making changes
  dry-run019        Test the migration 019 without making changes
  dry-run020        Test the migration 020 without making changes
  dry-run042        Test the migration 042 without making changes
  dry-run043        Test the migration 043 without making changes
  dry-run045        Test the migration 045 without making changes
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
  tsx migrations/migrate.ts 010        # Run migration 010 (scheduled reminder email template)
  tsx migrations/migrate.ts 012        # Run migration 012 (default booking sheet columns)
  tsx migrations/migrate.ts 013        # Run migration 013 (sample booking with all columns)
  tsx migrations/migrate.ts 014        # Run migration 014 (update column interface)
  tsx migrations/migrate.ts 015        # Run migration 015 (remove column behavior fields)
  tsx migrations/migrate.ts 016        # Run migration 016 (remove column required field)
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
  tsx migrations/migrate.ts rollback010 # Undo migration 010
  tsx migrations/migrate.ts rollback012 # Undo migration 012
  tsx migrations/migrate.ts rollback013 # Undo migration 013
  tsx migrations/migrate.ts rollback014 # Undo migration 014

🔧 Options:

  --dry-run, -d     Run in dry-run mode (no actual changes)

📊 What These Migrations Do:

  Migration 001 - Initial Tour Packages:
  - Siargao Island Adventure (SIA)
  - Philippine Sunrise (PHS) 
  - Philippine Sunset (PSS)
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
  - P1 - Single Installment (0% deposit, 100% in 1 payment)
  - P2 - Two Installments (0% deposit, 50% × 2 payments)
  - P3 - Three Installments (0% deposit, 33.33% × 3 payments)
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

  Migration 010 - Scheduled Reminder Email Template:
  - Adds a tour reminder email template for travelers before departure
  - Supports different booking types (Individual, Duo, Group)

  Migration 012 - Default Booking Sheet Columns:
  - Creates the initial set of 60+ columns for the booking sheet
  - Includes all core booking fields, traveler info, tour details, payment terms, etc.
  - Sets up the foundation for the hybrid column approach

  Migration 013 - Sample Booking with All Columns:
  - Creates a sample booking document with values for all defined columns
  - Demonstrates the hybrid column system in action
  - Provides test data for the sheet management interface

  Migration 014 - Update Column Interface:
  - Updates existing columns from old interface (name, type) to new interface
  - New fields: columnName, dataType, function, arguments, includeInForms
  - Automatically sets includeInForms=false for function columns
  - Enables integration with TypeScript functions from ts_files collection
  - Conditional rendering for group-specific information
  - Dynamic content based on booking details and special instructions
  - Professional layout with tour details table and important reminders

  Migration 012 - Default Booking Sheet Columns:
  - Populates the bookingSheetColumns collection with 60 default columns
  - Establishes the foundation for the hybrid booking system
  - Includes core booking fields, traveller information, tour details, pricing
  - Covers email management, payment terms, and cancellation handling
  - Sets up column metadata with types, validation, and behavior rules

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
