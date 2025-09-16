import { useEffect, useRef } from "react";
import { SheetColumn } from "@/types/sheet-management";
import { ColumnLogger } from "@/utils/column-logger";

interface UseColumnLoggerOptions {
  /**
   * Whether to log columns when they change
   */
  logOnChange?: boolean;

  /**
   * Whether to use compact logging format
   */
  compact?: boolean;

  /**
   * Whether to log column order changes
   */
  logOrderChanges?: boolean;

  /**
   * Custom log prefix
   */
  prefix?: string;
}

/**
 * Hook to automatically log column information when columns change
 */
export function useColumnLogger(
  columns: SheetColumn[],
  options: UseColumnLoggerOptions = {}
) {
  const {
    logOnChange = true,
    compact = false,
    logOrderChanges = false,
    prefix = "📊",
  } = options;

  const previousColumnsRef = useRef<SheetColumn[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (columns.length > 0) {
        console.log(
          `${prefix} Initial columns loaded: ${columns.length} columns`
        );
        if (compact) {
          ColumnLogger.logColumnsCompact(columns);
        } else {
          ColumnLogger.logColumns(columns);
        }
      }
      previousColumnsRef.current = [...columns];
      return;
    }

    if (!logOnChange || columns.length === 0) {
      return;
    }

    const previousColumns = previousColumnsRef.current;

    // Check if columns have changed
    const hasChanged =
      columns.length !== previousColumns.length ||
      columns.some((col, index) => {
        const prevCol = previousColumns[index];
        return !prevCol || col.id !== prevCol.id || col.order !== prevCol.order;
      });

    if (hasChanged) {
      console.log(`${prefix} Columns updated: ${columns.length} columns`);

      if (logOrderChanges && previousColumns.length > 0) {
        ColumnLogger.logColumnOrderChange(previousColumns, columns);
      }

      if (compact) {
        ColumnLogger.logColumnsCompact(columns);
      } else {
        ColumnLogger.logColumns(columns);
      }
    }

    previousColumnsRef.current = [...columns];
  }, [columns, logOnChange, compact, logOrderChanges, prefix]);
}

/**
 * Hook to log columns only once when they're first loaded
 */
export function useColumnLoggerOnce(
  columns: SheetColumn[],
  options: Omit<UseColumnLoggerOptions, "logOnChange"> = {}
) {
  const { compact = false, prefix = "📊" } = options;
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (!hasLoggedRef.current && columns.length > 0) {
      hasLoggedRef.current = true;
      console.log(`${prefix} Columns loaded: ${columns.length} columns`);

      if (compact) {
        ColumnLogger.logColumnsCompact(columns);
      } else {
        ColumnLogger.logColumns(columns);
      }
    }
  }, [columns, compact, prefix]);
}
