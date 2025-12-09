import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Timestamp } from "firebase/firestore";
import { SheetColumn } from "@/types/sheet-management";
import { bookingSheetColumnService } from "./booking-sheet-columns-service";
import { bookingService } from "./booking-service";
import { bookingVersionHistoryService } from "./booking-version-history-service";
import { useAuthStore } from "@/store/auth-store";
import { setImporting } from "./import-state";

export interface CSVImportResult {
  success: boolean;
  message: string;
  data?: {
    totalRows: number;
    validRows: number;
    headers: string[];
    preview: any[];
  };
  error?: string;
}

export interface ParsedCSVData {
  headers: string[];
  rows: any[][];
  totalRows: number;
  validRows: number;
}

export interface BookingDocument {
  id?: string; // Optional since it will be added after Firebase document creation
  createdAt: Timestamp;
  updatedAt: Timestamp;
  [key: string]: any;
}

class CSVImportService {
  /**
   * Parse uploaded file (CSV or Excel) and extract data from 'Main Dashboard' sheet
   */
  async parseFile(file: File): Promise<CSVImportResult> {
    try {
      const fileExtension = file.name.toLowerCase().split(".").pop();

      if (fileExtension === "csv") {
        return await this.parseCSVFile(file);
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        return await this.parseExcelFile(file);
      } else {
        return {
          success: false,
          message:
            "Unsupported file format. Please upload a CSV or Excel file.",
          error: "INVALID_FORMAT",
        };
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      return {
        success: false,
        message: "Failed to parse file",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSVFile(file: File): Promise<CSVImportResult> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        complete: (result) => {
          try {
            const parsedData = this.extractDataFromRows(
              result.data as string[][]
            );
            resolve({
              success: true,
              message: `Successfully parsed CSV file with ${parsedData.validRows} valid rows`,
              data: {
                totalRows: parsedData.totalRows,
                validRows: parsedData.validRows,
                headers: parsedData.headers,
                preview: parsedData.rows.slice(0, 5), // First 5 rows for preview
              },
            });
          } catch (error) {
            resolve({
              success: false,
              message: "Failed to process CSV data",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
        error: (error) => {
          resolve({
            success: false,
            message: "Failed to parse CSV file",
            error: error.message,
          });
        },
      });
    });
  }

  /**
   * Parse Excel file and find 'Main Dashboard' sheet
   */
  private async parseExcelFile(file: File): Promise<CSVImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });

          // Look for 'Main Dashboard' sheet
          const mainDashboardSheet = workbook.Sheets["Main Dashboard"];
          if (!mainDashboardSheet) {
            resolve({
              success: false,
              message:
                "Could not find 'Main Dashboard' sheet in the Excel file",
              error: "SHEET_NOT_FOUND",
            });
            return;
          }

          // Convert sheet to array of arrays
          const sheetData = XLSX.utils.sheet_to_json(mainDashboardSheet, {
            header: 1,
            defval: "",
          }) as string[][];

          const parsedData = this.extractDataFromRows(sheetData);
          resolve({
            success: true,
            message: `Successfully parsed Excel file with ${parsedData.validRows} valid rows`,
            data: {
              totalRows: parsedData.totalRows,
              validRows: parsedData.validRows,
              headers: parsedData.headers,
              preview: parsedData.rows.slice(0, 5), // First 5 rows for preview
            },
          });
        } catch (error) {
          resolve({
            success: false,
            message: "Failed to process Excel file",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          message: "Failed to read Excel file",
          error: "FILE_READ_ERROR",
        });
      };

      reader.readAsBinaryString(file);
    });
  }

  /**
   * Extract header and data rows according to the specification:
   * - Row 3 is the header row
   * - Rows 4+ are data rows
   * - Skip rows where column A is empty
   */
  private extractDataFromRows(rawData: string[][]): ParsedCSVData {
    if (rawData.length < 4) {
      throw new Error(
        "File must have at least 4 rows (header at row 3, data starting at row 4)"
      );
    }

    // Row 3 (index 2) is the header row
    const headers = rawData[2] || [];
    if (headers.length === 0) {
      throw new Error("Header row (row 3) is empty");
    }

    // Rows 4+ (index 3+) are data rows
    const dataRows = rawData.slice(3);

    // Filter out rows where column A is empty
    const validRows = dataRows.filter((row) => {
      const columnA = row[0];
      return columnA && columnA.toString().trim() !== "";
    });

    return {
      headers: headers.map((h) => h.toString().trim()),
      rows: validRows,
      totalRows: dataRows.length,
      validRows: validRows.length,
    };
  }

  /**
   * Map CSV data to Firestore documents using column metadata
   */
  async mapCSVToBookingDocuments(
    parsedData: ParsedCSVData
  ): Promise<BookingDocument[]> {
    try {
      // Fetch ALL column metadata (including function types)
      const allColumns = await bookingSheetColumnService.getAllColumns();

      console.log("📊 [CSV IMPORT] Column mapping:", {
        totalColumns: allColumns.length,
        csvHeaders: parsedData.headers,
      });

      // Separate non-function and function columns
      const nonFunctionColumns = allColumns.filter(
        (col) => col.dataType !== "function"
      );
      const functionColumns = allColumns.filter(
        (col) => col.dataType === "function"
      );

      // Step 1: Map non-function columns first
      const nonFunctionColumnMapping = new Map<
        number,
        { field: string; dataType: string }
      >();

      nonFunctionColumns.forEach((column) => {
        const headerIndex = parsedData.headers.findIndex(
          (header) =>
            header.toLowerCase().trim() ===
            column.columnName.toLowerCase().trim()
        );

        if (headerIndex !== -1) {
          nonFunctionColumnMapping.set(headerIndex, {
            field: column.id,
            dataType: column.dataType,
          });
        }
      });

      // Step 2: Map function columns
      const functionColumnMapping = new Map<
        number,
        { field: string; dataType: string }
      >();

      functionColumns.forEach((column) => {
        const headerIndex = parsedData.headers.findIndex(
          (header) =>
            header.toLowerCase().trim() ===
            column.columnName.toLowerCase().trim()
        );

        if (headerIndex !== -1) {
          functionColumnMapping.set(headerIndex, {
            field: column.id,
            dataType: column.dataType,
          });
        }
      });

      console.log("📊 [CSV IMPORT] Column mapping created:", {
        nonFunctionColumns: Array.from(nonFunctionColumnMapping.entries()).map(
          ([index, mapping]) => ({
            csvIndex: index,
            csvHeader: parsedData.headers[index],
            firestoreField: mapping.field,
            dataType: mapping.dataType,
          })
        ),
        functionColumns: Array.from(functionColumnMapping.entries()).map(
          ([index, mapping]) => ({
            csvIndex: index,
            csvHeader: parsedData.headers[index],
            firestoreField: mapping.field,
            dataType: mapping.dataType,
          })
        ),
      });

      // Generate documents
      const documents: BookingDocument[] = [];
      const now = Timestamp.now();

      // For CSV import, use sequential row numbers starting from 1
      // Gap-filling will be handled by the individual add booking functionality
      console.log("🔍 [CSV IMPORT DEBUG]", {
        totalRowsToImport: parsedData.rows.length,
        rowNumbers: Array.from(
          { length: parsedData.rows.length },
          (_, i) => i + 1
        ),
      });

      for (let i = 0; i < parsedData.rows.length; i++) {
        const row = parsedData.rows[i];
        const rowNumber = i + 1; // Use sequential row numbers starting from 1

        const document: BookingDocument = {
          row: rowNumber, // Add row field for ordering
          createdAt: now,
          updatedAt: now,
        };

        // Step 1: Map non-function columns first
        nonFunctionColumnMapping.forEach((mapping, csvIndex) => {
          const cellValue = row[csvIndex];
          const convertedValue = this.convertValue(cellValue, mapping.dataType);
          document[mapping.field] = convertedValue;
        });

        // Step 2: Map function columns after non-function columns
        functionColumnMapping.forEach((mapping, csvIndex) => {
          const cellValue = row[csvIndex];
          // Store function column values as-is (don't apply type conversion except for currency)
          let convertedValue;
          if (mapping.dataType === "function") {
            // For function columns, check if it looks like a currency value
            if (cellValue && cellValue.toString().trim() !== "") {
              const stringValue = cellValue.toString().trim();

              // Check if it looks like a currency value and try to parse it
              // Only parse as currency if it contains currency symbols like $, €, £, etc.
              const hasCurrencySymbol = /[$€£¥₹₽¢₱₦₩₪₨₡₵₫﷼]/.test(stringValue);

              if (hasCurrencySymbol) {
                convertedValue = this.parseCurrencyValue(stringValue);
              } else {
                // Store as string for function columns
                convertedValue = stringValue;
              }
            } else {
              convertedValue = null;
            }
          } else {
            convertedValue = this.convertValue(cellValue, mapping.dataType);
          }
          document[mapping.field] = convertedValue;
        });

        documents.push(document);
      }

      return documents;
    } catch (error) {
      console.error("❌ [CSV IMPORT] Error mapping CSV to documents:", error);
      throw error;
    }
  }

  /**
   * Parse currency value by stripping currency symbols
   * Handles formats like: $123.45, €100, £50.00, ¥1000, 123.45, $1,234.56, (100.00), -$50
   *
   * Test cases:
   * - "$123.45" → 123.45
   * - "€1,234.56" → 1234.56
   * - "£50.00" → 50.00
   * - "¥1000" → 1000
   * - "123.45" → 123.45
   * - "$1,234,567.89" → 1234567.89
   * - "(100.00)" → -100.00
   * - "-$50.25" → -50.25
   * - "$-75.50" → -75.50
   * - "USD 500" → 500
   * - "500 EUR" → 500
   * - "$" → null
   * - "" → null
   * - "abc" → null
   */
  private parseCurrencyValue(value: string): number | null {
    if (!value || value.trim() === "") {
      return null;
    }

    const trimmedValue = value.toString().trim();

    // Handle negative values in parentheses (e.g., "(100.00)" = -100.00)
    let isNegative = false;
    let workingValue = trimmedValue;

    if (workingValue.startsWith("(") && workingValue.endsWith(")")) {
      isNegative = true;
      workingValue = workingValue.substring(1, workingValue.length - 1).trim();
    }

    // Common currency symbols to strip (including less common ones)
    const currencySymbols = [
      "$",
      "€",
      "£",
      "¥",
      "₹",
      "₽",
      "¢",
      "₱",
      "₦",
      "₩",
      "₪",
      "₨",
      "₡",
      "₵",
      "₫",
      "﷼",
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "CAD",
      "AUD",
      "CNY",
      "INR",
      "PHP",
      "SGD",
      "HKD",
      "THB",
      "MYR",
      "KRW",
      "TWD",
      "VND",
    ];

    // Remove currency symbols from the beginning and end
    let cleanValue = workingValue;

    // Strip currency symbols from the beginning
    for (const symbol of currencySymbols) {
      if (cleanValue.toLowerCase().startsWith(symbol.toLowerCase())) {
        cleanValue = cleanValue.substring(symbol.length).trim();
        break;
      }
    }

    // Strip currency symbols from the end
    for (const symbol of currencySymbols) {
      if (cleanValue.toLowerCase().endsWith(symbol.toLowerCase())) {
        cleanValue = cleanValue
          .substring(0, cleanValue.length - symbol.length)
          .trim();
        break;
      }
    }

    // Remove common thousand separators (commas, spaces) but keep decimal points
    cleanValue = cleanValue.replace(/[,\s]/g, "");

    // Handle minus signs
    if (cleanValue.startsWith("-") || cleanValue.endsWith("-")) {
      isNegative = true;
      cleanValue = cleanValue.replace(/-/g, "");
    }

    // Remove any remaining non-numeric characters except decimal point
    cleanValue = cleanValue.replace(/[^\d.]/g, "");

    // Ensure only one decimal point exists
    const decimalParts = cleanValue.split(".");
    if (decimalParts.length > 2) {
      // If multiple decimal points, take first as integer part and last as decimal part
      cleanValue =
        decimalParts[0] + "." + decimalParts[decimalParts.length - 1];
    }

    // Parse the cleaned value
    const numValue = parseFloat(cleanValue);

    // Return null if parsing failed or if the result is not a valid number
    if (isNaN(numValue)) {
      return null;
    }

    // Apply negative sign if needed
    return isNegative ? -numValue : numValue;
  }

  /**
   * Convert cell value to the appropriate data type
   */
  private convertValue(value: any, dataType: string): any {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const stringValue = value.toString().trim();

    switch (dataType) {
      case "string":
      case "email":
      case "select":
        return stringValue;

      case "number":
        // If the value contains any non-digit characters (except decimal points for pure numbers),
        // keep it as a string to preserve formatting
        if (
          stringValue !== parseFloat(stringValue).toString() ||
          stringValue.includes(",")
        ) {
          return stringValue;
        }
        const numValue = parseFloat(stringValue);
        return isNaN(numValue) ? null : numValue;

      case "currency":
        // Handle currency values that may have currency symbols
        const currencyValue = this.parseCurrencyValue(stringValue);

        // Log currency parsing for debugging when actual transformation occurs
        const originalHadSymbols = /[$€£¥₹₽¢₱₦₩₪₨₡₵₫﷼,\(\)\-\s]/.test(
          stringValue
        );
        if (originalHadSymbols && currencyValue !== null) {
          console.log(
            `💱 [CURRENCY PARSE] "${stringValue}" → ${currencyValue}`
          );
        }

        return currencyValue;

      case "boolean":
        const lowerValue = stringValue.toLowerCase();
        if (
          lowerValue === "true" ||
          lowerValue === "1" ||
          lowerValue === "yes"
        ) {
          return true;
        } else if (
          lowerValue === "false" ||
          lowerValue === "0" ||
          lowerValue === "no"
        ) {
          return false;
        }
        return null;

      case "date":
        try {
          const date = new Date(stringValue);
          return isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
        } catch {
          return null;
        }

      default:
        return stringValue;
    }
  }

  /**
   * Replace all booking documents in Firestore
   */
  async replaceAllBookings(
    documents: BookingDocument[]
  ): Promise<CSVImportResult> {
    try {
      console.log("🔥 [CSV IMPORT] Starting Firestore replacement...", {
        documentsToCreate: documents.length,
      });

      // Get current user info for version tracking
      const { user, userProfile } = useAuthStore.getState();
      const currentUserId = user?.uid || "system";
      const currentUserName =
        userProfile?.profile?.firstName && userProfile?.profile?.lastName
          ? `${userProfile.profile.firstName} ${userProfile.profile.lastName}`
          : userProfile?.email || user?.email || "System";

      // Get all existing booking IDs before deletion for version tracking
      const existingBookings = await bookingService.getAllBookings();
      const existingBookingIds = existingBookings.map((booking) => booking.id);

      // Delete all existing bookings
      await bookingService.deleteAllBookings();
      console.log("✅ [CSV IMPORT] Deleted all existing bookings");

      // Temporarily disable individual version tracking during bulk import if configured
      // We'll create a single bulk operation snapshot instead
      const config = bookingService.getVersionTrackingConfig();
      const shouldSkipIndividualTracking =
        config.performance.skipVersioningForBulkImports;

      let originalCreateTracking: boolean | undefined;
      let originalUpdateTracking: boolean | undefined;

      if (shouldSkipIndividualTracking) {
        originalCreateTracking = config.trackingLevels.create;
        originalUpdateTracking = config.trackingLevels.update;

        // Disable individual tracking during bulk import
        bookingService.setVersionTracking("create", false);
        bookingService.setVersionTracking("update", false);
        console.log(
          "📝 [CSV IMPORT] Temporarily disabled individual version tracking for bulk import"
        );
      }

      try {
        // Create new bookings in batches to reduce listener churn
        const BATCH_SIZE = 400; // stay under 500 limit
        for (let i = 0; i < documents.length; i += BATCH_SIZE) {
          const slice = documents.slice(i, i + BATCH_SIZE);
          await Promise.all(
            slice.map(async (document, index) => {
              // Create booking with Firebase auto-generated ID (empty object to get UID)
              const newId = await bookingService.createBooking({});

              // Ensure we have a valid ID
              if (!newId) {
                throw new Error(
                  `Failed to generate ID for document at index ${i + index}`
                );
              }

              // Create the complete document with the generated ID
              const documentWithId = {
                ...document,
                id: newId, // Use the Firebase-generated UID
              };

              // Update the document with all the data including the id field
              await bookingService.updateBooking(newId, documentWithId);
            })
          );
        }
      } finally {
        // Restore original tracking settings if they were changed
        if (
          shouldSkipIndividualTracking &&
          originalCreateTracking !== undefined &&
          originalUpdateTracking !== undefined
        ) {
          bookingService.setVersionTracking("create", originalCreateTracking);
          bookingService.setVersionTracking("update", originalUpdateTracking);
          console.log(
            "📝 [CSV IMPORT] Restored original version tracking settings"
          );
        }
      }

      console.log("✅ [CSV IMPORT] Created all new bookings");

      // Create bulk import version snapshot after successful import
      try {
        // Get the IDs of all newly created bookings
        const newBookings = await bookingService.getAllBookings();
        const newBookingIds = newBookings.map((booking) => booking.id);

        await bookingVersionHistoryService.createBulkOperationSnapshot({
          operationType: "import",
          operationDescription: `CSV Import: Replaced ${existingBookingIds.length} existing bookings with ${documents.length} new bookings`,
          affectedBookingIds: [...existingBookingIds, ...newBookingIds], // Include both deleted and created booking IDs
          userId: currentUserId,
          userName: currentUserName,
          totalCount: existingBookingIds.length + documents.length,
          successCount: documents.length,
          failureCount: 0,
        });

        console.log("✅ [CSV IMPORT] Created bulk import version snapshot");
      } catch (versionError) {
        console.error(
          "❌ [CSV IMPORT] Failed to create version snapshot:",
          versionError
        );
        // Don't fail the entire import if version tracking fails
        // Version tracking is supplementary and shouldn't break the main operation
      }

      return {
        success: true,
        message: `Successfully imported ${documents.length} bookings`,
        data: {
          totalRows: documents.length,
          validRows: documents.length,
          headers: [],
          preview: [],
        },
      };
    } catch (error) {
      console.error("❌ [CSV IMPORT] Error replacing bookings:", error);
      return {
        success: false,
        message: "Failed to replace bookings in Firestore",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Complete import process: parse file, map data, and replace bookings
   */
  async importCSV(file: File): Promise<CSVImportResult> {
    // Import at top of method
    const { db } = await import("@/lib/firebase");
    const { doc, setDoc, Timestamp } = await import("firebase/firestore");

    try {
      // Mark importing to prevent function executions elsewhere
      setImporting(true);

      // Set config flag to skip Cloud Function triggers
      await setDoc(
        doc(db, "config", "import-sync"),
        {
          skipTriggers: true,
          operation: "csv-import",
          startedAt: Timestamp.now(),
        },
        { merge: true }
      );
      console.log("🚫 [CSV IMPORT] Set skip flag for triggers");
      // Step 1: Parse file
      const parseResult = await this.parseFile(file);
      if (!parseResult.success || !parseResult.data) {
        return parseResult;
      }

      // Step 2: Re-parse to get full data (not just preview)
      const fullParseResult = await this.parseFileComplete(file);
      if (!fullParseResult.success || !fullParseResult.data) {
        return {
          success: false,
          message: fullParseResult.message,
          error: fullParseResult.error,
        };
      }

      // Step 3: Map CSV to documents
      const documents = await this.mapCSVToBookingDocuments(
        fullParseResult.data!
      );

      // Step 4: Replace all bookings
      const replaceResult = await this.replaceAllBookings(documents);

      return replaceResult;
    } catch (error) {
      console.error("❌ [CSV IMPORT] Error in import process:", error);
      return {
        success: false,
        message: "Import failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      // Clear importing flag
      setImporting(false);

      // Clear config flag to re-enable triggers
      try {
        const { db } = await import("@/lib/firebase");
        const { doc, setDoc, Timestamp } = await import("firebase/firestore");
        await setDoc(
          doc(db, "config", "import-sync"),
          {
            skipTriggers: false,
            operation: null,
            completedAt: Timestamp.now(),
          },
          { merge: true }
        );
        console.log("✅ [CSV IMPORT] Cleared skip flag for triggers");
      } catch (flagError) {
        console.error("❌ [CSV IMPORT] Failed to clear skip flag:", flagError);
      }
    }
  }

  /**
   * Parse file and return complete data (not just preview)
   */
  private async parseFileComplete(file: File): Promise<{
    success: boolean;
    data?: ParsedCSVData;
    message: string;
    error?: string;
  }> {
    try {
      const fileExtension = file.name.toLowerCase().split(".").pop();

      if (fileExtension === "csv") {
        return await this.parseCSVFileComplete(file);
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        return await this.parseExcelFileComplete(file);
      } else {
        return {
          success: false,
          message:
            "Unsupported file format. Please upload a CSV or Excel file.",
          error: "INVALID_FORMAT",
        };
      }
    } catch (error) {
      console.error("Error parsing file for complete data:", error);
      return {
        success: false,
        message: "Failed to parse file",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Parse CSV file and return complete data
   */
  private async parseCSVFileComplete(file: File): Promise<{
    success: boolean;
    data?: ParsedCSVData;
    message: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        complete: (result) => {
          try {
            const parsedData = this.extractDataFromRows(
              result.data as string[][]
            );
            resolve({
              success: true,
              message: `Successfully parsed CSV file with ${parsedData.validRows} valid rows`,
              data: parsedData,
            });
          } catch (error) {
            resolve({
              success: false,
              message: "Failed to process CSV data",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
        error: (error) => {
          resolve({
            success: false,
            message: "Failed to parse CSV file",
            error: error.message,
          });
        },
      });
    });
  }

  /**
   * Parse Excel file and return complete data
   */
  private async parseExcelFileComplete(file: File): Promise<{
    success: boolean;
    data?: ParsedCSVData;
    message: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });

          // Look for 'Main Dashboard' sheet
          const mainDashboardSheet = workbook.Sheets["Main Dashboard"];
          if (!mainDashboardSheet) {
            resolve({
              success: false,
              message:
                "Could not find 'Main Dashboard' sheet in the Excel file",
              error: "SHEET_NOT_FOUND",
            });
            return;
          }

          // Convert sheet to array of arrays
          const sheetData = XLSX.utils.sheet_to_json(mainDashboardSheet, {
            header: 1,
            defval: "",
          }) as string[][];

          const parsedData = this.extractDataFromRows(sheetData);
          resolve({
            success: true,
            message: `Successfully parsed Excel file with ${parsedData.validRows} valid rows`,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            success: false,
            message: "Failed to process Excel file",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          message: "Failed to read Excel file",
          error: "FILE_READ_ERROR",
        });
      };

      reader.readAsBinaryString(file);
    });
  }
}

export const csvImportService = new CSVImportService();
