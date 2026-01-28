#!/usr/bin/env node

/**
 * Script to remove `order` fields from all column files
 *
 * This script:
 * 1. Recursively finds all TypeScript column files
 * 2. Removes the `order: <number>` property from the data object
 * 3. Preserves all other formatting and code structure
 *
 * Usage:
 *   node scripts/remove-order-fields.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COLUMNS_DIR = path.resolve(__dirname, "../src/app/functions/columns");
const DRY_RUN = process.argv.includes("--dry-run");
const VERBOSE = process.argv.includes("--verbose");

// Counters
let filesProcessed = 0;
let filesModified = 0;
let errorsEncountered = 0;

/**
 * Recursively get all TypeScript files in a directory
 */
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and other common directories
      if (!["node_modules", "dist", "build", ".next"].includes(file)) {
        getAllTsFiles(filePath, fileList);
      }
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      // Skip index files and the column-orders.ts file
      if (
        file !== "index.ts" &&
        file !== "column-orders.ts" &&
        file !== "functions-index.ts"
      ) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Remove order field from a TypeScript file
 */
function removeOrderField(filePath) {
  try {
    filesProcessed++;

    const content = fs.readFileSync(filePath, "utf8");

    // Pattern to match the order property with optional trailing comma
    // This handles various formatting styles:
    // - order: 1,
    // - order: 35.5,
    // - order: 100,
    // With flexible whitespace
    const orderPattern = /^(\s*)order:\s*\d+(?:\.\d+)?,?\s*$/gm;

    // Check if the file contains an order field
    if (!orderPattern.test(content)) {
      if (VERBOSE) {
        console.log(
          `  ⏭️  Skipped (no order field): ${path.relative(COLUMNS_DIR, filePath)}`,
        );
      }
      return false;
    }

    // Reset regex lastIndex
    orderPattern.lastIndex = 0;

    // Remove the order field
    let newContent = content.replace(orderPattern, "");

    // Clean up any double blank lines that might result from removal
    newContent = newContent.replace(/\n\n\n+/g, "\n\n");

    // Only write if content changed
    if (newContent !== content) {
      if (DRY_RUN) {
        console.log(
          `  🔍 Would modify: ${path.relative(COLUMNS_DIR, filePath)}`,
        );
      } else {
        fs.writeFileSync(filePath, newContent, "utf8");
        console.log(`  ✅ Modified: ${path.relative(COLUMNS_DIR, filePath)}`);
      }
      filesModified++;
      return true;
    }

    return false;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
    errorsEncountered++;
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log("\n🚀 Starting order field removal...\n");

  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No files will be modified\n");
  }

  // Verify columns directory exists
  if (!fs.existsSync(COLUMNS_DIR)) {
    console.error(`❌ Columns directory not found: ${COLUMNS_DIR}`);
    process.exit(1);
  }

  console.log(`📁 Scanning directory: ${COLUMNS_DIR}\n`);

  // Get all TypeScript column files
  const tsFiles = getAllTsFiles(COLUMNS_DIR);

  console.log(`📄 Found ${tsFiles.length} column files to process\n`);

  // Process each file
  tsFiles.forEach((filePath) => {
    removeOrderField(filePath);
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total files scanned:    ${filesProcessed}`);
  console.log(`Files modified:         ${filesModified}`);
  console.log(`Files skipped:          ${filesProcessed - filesModified}`);
  console.log(`Errors encountered:     ${errorsEncountered}`);
  console.log("=".repeat(60) + "\n");

  if (DRY_RUN) {
    console.log(
      "💡 This was a dry run. Run without --dry-run to apply changes.\n",
    );
  } else if (filesModified > 0) {
    console.log(
      "✨ Order fields successfully removed from all column files!\n",
    );
    console.log("💡 Next steps:");
    console.log("   1. Review the changes with: git diff");
    console.log("   2. Test that columns still work correctly");
    console.log("   3. Commit the changes\n");
  } else {
    console.log("✨ No files needed modification.\n");
  }

  process.exit(errorsEncountered > 0 ? 1 : 0);
}

// Run the script
main();
