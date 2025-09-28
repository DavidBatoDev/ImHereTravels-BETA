import { SheetColumn } from "@/types/sheet-management";

/**
 * Utility to log all columns in the booking sheet with their order and properties
 */
export class ColumnLogger {
  /**
   * Logs all columns with their order and detailed information
   */
  static logColumns(columns: SheetColumn[]): void {
    console.log("📊 BOOKING SHEET COLUMNS LOG");
    console.log("=".repeat(50));
    console.log(`Total Columns: ${columns.length}`);
    console.log("");

    // Sort columns by order
    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

    sortedColumns.forEach((column, index) => {
      console.log(`${index + 1}. ${column.columnName}`);
      console.log(`   ID: ${column.id}`);
      console.log(`   Order: ${column.order}`);
      console.log(`   Parent Tab: ${column.parentTab || "General"}`);
      console.log(`   Data Type: ${column.dataType}`);
      console.log(`   Width: ${column.width}px`);
      console.log(
        `   Include in Forms: ${column.includeInForms ? "Yes" : "No"}`
      );

      if (column.color) {
        console.log(`   Color: ${column.color}`);
      }

      if (column.options && column.options.length > 0) {
        console.log(`   Options: [${column.options.join(", ")}]`);
      }

      if (column.function) {
        console.log(`   Function: ${column.function}`);
      }

      if (column.arguments && column.arguments.length > 0) {
        console.log(`   Arguments: ${column.arguments.length} argument(s)`);
        column.arguments.forEach((arg, argIndex) => {
          console.log(`     ${argIndex + 1}. ${arg.name}: ${arg.type}`);
          if (arg.columnReference) {
            console.log(`        Column Reference: ${arg.columnReference}`);
          }
          if (arg.columnReferences && arg.columnReferences.length > 0) {
            console.log(
              `        Column References: [${arg.columnReferences.join(", ")}]`
            );
          }
        });
      }

      console.log("");
    });

    // Summary by parent tab
    console.log("📂 SUMMARY BY PARENT TAB");
    console.log("-".repeat(30));
    const parentTabCounts = sortedColumns.reduce((acc, col) => {
      const parentTab = col.parentTab || "General";
      acc[parentTab] = (acc[parentTab] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(parentTabCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([parentTab, count]) => {
        console.log(`${parentTab}: ${count} column(s)`);
      });

    console.log("");

    // Summary by data type
    console.log("📈 SUMMARY BY DATA TYPE");
    console.log("-".repeat(30));
    const dataTypeCounts = sortedColumns.reduce((acc, col) => {
      acc[col.dataType] = (acc[col.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(dataTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([dataType, count]) => {
        console.log(`${dataType}: ${count} column(s)`);
      });

    console.log("");
    console.log("✅ Column logging complete");
  }

  /**
   * Logs columns in a compact format for quick reference
   */
  static logColumnsCompact(columns: SheetColumn[]): void {
    console.log("📋 COLUMNS QUICK REFERENCE");
    console.log("=".repeat(40));

    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

    sortedColumns.forEach((column, index) => {
      const formIndicator = column.includeInForms ? "📝" : "🔒";
      const typeIndicator = this.getDataTypeIcon(column.dataType);
      console.log(
        `${String(index + 1).padStart(
          2,
          " "
        )}. ${formIndicator} ${typeIndicator} ${column.columnName} (${
          column.dataType
        })`
      );
    });

    console.log("");
    console.log("Legend: 📝 = Include in Forms, 🔒 = Not in Forms");
    console.log(
      "Types: 📝 String, 🔢 Number, 💰 Currency, 📅 Date, ✅ Boolean, 📋 Select, ⚙️ Function, 📧 Email"
    );
  }

  /**
   * Exports columns to a structured format (useful for documentation)
   */
  static exportColumns(columns: SheetColumn[]): {
    totalColumns: number;
    columns: Array<{
      order: number;
      name: string;
      id: string;
      parentTab: string;
      dataType: string;
      width: number;
      includeInForms: boolean;
      color?: string;
      options?: string[];
      function?: string;
    }>;
    summary: Record<string, number>;
    parentTabSummary: Record<string, number>;
  } {
    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

    const dataTypeCounts = sortedColumns.reduce((acc, col) => {
      acc[col.dataType] = (acc[col.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parentTabCounts = sortedColumns.reduce((acc, col) => {
      const parentTab = col.parentTab || "General";
      acc[parentTab] = (acc[parentTab] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalColumns: columns.length,
      columns: sortedColumns.map((col) => ({
        order: col.order,
        name: col.columnName,
        id: col.id,
        parentTab: col.parentTab || "General",
        dataType: col.dataType,
        width: col.width,
        includeInForms: col.includeInForms,
        color: col.color,
        options: col.options,
        function: col.function,
      })),
      summary: dataTypeCounts,
      parentTabSummary: parentTabCounts,
    };
  }

  /**
   * Gets an icon for each data type
   */
  private static getDataTypeIcon(dataType: string): string {
    const icons: Record<string, string> = {
      string: "📝",
      number: "🔢",
      currency: "💰",
      date: "📅",
      boolean: "✅",
      select: "📋",
      function: "⚙️",
      email: "📧",
    };
    return icons[dataType] || "❓";
  }

  /**
   * Logs column order changes (useful for debugging reordering)
   */
  static logColumnOrderChange(
    oldColumns: SheetColumn[],
    newColumns: SheetColumn[]
  ): void {
    console.log("🔄 COLUMN ORDER CHANGE");
    console.log("=".repeat(30));

    const oldOrder = oldColumns
      .sort((a, b) => a.order - b.order)
      .map((col) => col.columnName);
    const newOrder = newColumns
      .sort((a, b) => a.order - b.order)
      .map((col) => col.columnName);

    console.log("Before:", oldOrder.join(" → "));
    console.log("After: ", newOrder.join(" → "));

    // Find moved columns
    const movedColumns = oldOrder.filter(
      (name, index) => newOrder[index] !== name
    );
    if (movedColumns.length > 0) {
      console.log("Moved columns:", movedColumns.join(", "));
    } else {
      console.log("No columns were moved");
    }

    console.log("");
  }
}

/**
 * Convenience function to log columns from the useSheetManagement hook
 */
export function logBookingSheetColumns(columns: SheetColumn[]): void {
  ColumnLogger.logColumns(columns);
}

/**
 * Convenience function for compact logging
 */
export function logBookingSheetColumnsCompact(columns: SheetColumn[]): void {
  ColumnLogger.logColumnsCompact(columns);
}
