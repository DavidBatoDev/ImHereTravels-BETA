#!/usr/bin/env node

/**
 * Script to update all folder index.ts files to use withOrder helper
 *
 * This script:
 * 1. Reads each folder's index.ts
 * 2. Converts from direct exports to import+withOrder+export pattern
 * 3. Preserves the original export names
 *
 * Usage:
 *   node scripts/update-folder-indices.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COLUMNS_DIR = path.resolve(__dirname, "../src/app/functions/columns");
const DRY_RUN = process.argv.includes("--dry-run");

// Folders to update (excluding cancellation and payment-setting which are already done)
const FOLDERS_TO_UPDATE = [
  "identifier",
  "traveler-information",
  "tour-details",
  "discounts",
  "duo-or-group-booking",
  "full-payment",
  "payment-term-1",
  "payment-term-2",
  "payment-term-3",
  "payment-term-4",
  "reservation-email",
];

// Counters
let foldersProcessed = 0;
let foldersModified = 0;
let errorsEncountered = 0;

/**
 * Parse export statements from index file
 */
function parseExports(content) {
  const exportPattern =
    /^export\s+\{\s*(\w+)\s*\}\s+from\s+['"](\.\/[^'"]+)['"]/gm;
  const exports = [];
  let match;

  while ((match = exportPattern.exec(content)) !== null) {
    exports.push({
      columnName: match[1],
      filePath: match[2],
    });
  }

  return exports;
}

/**
 * Generate new index file content with withOrder pattern
 */
function generateNewContent(exports) {
  const lines = [];

  // Add withOrder import
  lines.push('import { withOrder } from "../column-orders";');

  // Add all imports with underscore prefix
  exports.forEach(({ columnName, filePath }) => {
    lines.push(
      `import { ${columnName} as _${columnName} } from "${filePath}";`,
    );
  });

  lines.push("");
  lines.push(
    "// Export columns with orders injected from global column-orders.ts",
  );

  // Add exports with withOrder applied
  exports.forEach(({ columnName }) => {
    lines.push(`export const ${columnName} = withOrder(_${columnName});`);
  });

  lines.push("");

  return lines.join("\n");
}

/**
 * Update a folder's index.ts file
 */
function updateFolderIndex(folderName) {
  try {
    foldersProcessed++;

    const indexPath = path.join(COLUMNS_DIR, folderName, "index.ts");

    if (!fs.existsSync(indexPath)) {
      console.log(`  ⏭️  Skipped (no index.ts): ${folderName}`);
      return false;
    }

    const content = fs.readFileSync(indexPath, "utf8");

    // Parse existing exports
    const exports = parseExports(content);

    if (exports.length === 0) {
      console.log(`  ⚠️  Warning: No exports found in ${folderName}/index.ts`);
      return false;
    }

    // Generate new content
    const newContent = generateNewContent(exports);

    if (DRY_RUN) {
      console.log(`\n  📁 ${folderName}/index.ts`);
      console.log(`     Found ${exports.length} exports`);
      console.log(`     Would update to use withOrder pattern`);
    } else {
      fs.writeFileSync(indexPath, newContent, "utf8");
      console.log(
        `  ✅ Updated: ${folderName}/index.ts (${exports.length} columns)`,
      );
    }

    foldersModified++;
    return true;
  } catch (error) {
    console.error(`  ❌ Error processing ${folderName}:`, error.message);
    errorsEncountered++;
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log("\n🚀 Updating folder index files to use withOrder...\n");

  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No files will be modified\n");
  }

  // Verify columns directory exists
  if (!fs.existsSync(COLUMNS_DIR)) {
    console.error(`❌ Columns directory not found: ${COLUMNS_DIR}`);
    process.exit(1);
  }

  console.log(`📁 Processing ${FOLDERS_TO_UPDATE.length} folders\n`);

  // Process each folder
  FOLDERS_TO_UPDATE.forEach((folderName) => {
    updateFolderIndex(folderName);
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Folders processed:      ${foldersProcessed}`);
  console.log(`Folders modified:       ${foldersModified}`);
  console.log(`Folders skipped:        ${foldersProcessed - foldersModified}`);
  console.log(`Errors encountered:     ${errorsEncountered}`);
  console.log("=".repeat(60) + "\n");

  if (DRY_RUN) {
    console.log(
      "💡 This was a dry run. Run without --dry-run to apply changes.\n",
    );
  } else if (foldersModified > 0) {
    console.log("✨ Folder index files successfully updated!\n");
    console.log("💡 Next steps:");
    console.log("   1. Review the changes with: git diff");
    console.log("   2. Test that columns still work correctly");
    console.log("   3. Commit the changes\n");
  } else {
    console.log("✨ No folders needed modification.\n");
  }

  process.exit(errorsEncountered > 0 ? 1 : 0);
}

// Run the script
main();
