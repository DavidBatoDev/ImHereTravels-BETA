#!/usr/bin/env tsx

/**
 * Script to log all columns in the booking sheet
 *
 * Usage:
 *   npm run log-columns
 *   or
 *   npx tsx src/scripts/log-columns.ts
 */

import { ColumnLogger } from "../utils/column-logger";
import { defaultBookingColumns } from "../lib/default-booking-columns";
import { SheetColumn } from "../types/sheet-management";

// Convert default columns to full SheetColumn objects with IDs
const columnsWithIds: SheetColumn[] = defaultBookingColumns.map(
  (col, index) => ({
    ...col,
    id: `col-${index + 1}`,
  })
);

console.log("🚀 Starting column logging script...");
console.log("");

// Log columns in detailed format
ColumnLogger.logColumns(columnsWithIds);

console.log("");
console.log("📊 Exporting columns data...");

// Export columns data
const exportedData = ColumnLogger.exportColumns(columnsWithIds);
console.log(JSON.stringify(exportedData, null, 2));

console.log("");
console.log("✅ Column logging script completed!");
