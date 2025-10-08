import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Timestamp } from "firebase/firestore";
import { SheetColumn } from "@/types/sheet-management";
import { bookingSheetColumnService } from "./booking-sheet-columns-service";
import { bookingService } from "./booking-service";

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
  id: string;
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
      // Fetch column metadata (excluding function types)
      const allColumns = await bookingSheetColumnService.getAllColumns();
      const nonFunctionColumns = allColumns.filter(
        (col) => col.dataType !== "function"
      );

      console.log("📊 [CSV IMPORT] Column mapping:", {
        totalColumns: allColumns.length,
        nonFunctionColumns: nonFunctionColumns.length,
        csvHeaders: parsedData.headers,
      });

      // Create mapping from CSV headers to Firestore fields
      const columnMapping = new Map<
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
          columnMapping.set(headerIndex, {
            field: column.id,
            dataType: column.dataType,
          });
        }
      });

      console.log("📊 [CSV IMPORT] Column mapping created:", {
        mappedColumns: Array.from(columnMapping.entries()).map(
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

      for (let i = 0; i < parsedData.rows.length; i++) {
        const row = parsedData.rows[i];
        const documentId = (i + 1).toString(); // Sequential IDs: "1", "2", "3"...

        const document: BookingDocument = {
          id: documentId,
          createdAt: now,
          updatedAt: now,
        };

        // Map CSV values to Firestore fields
        columnMapping.forEach((mapping, csvIndex) => {
          const cellValue = row[csvIndex];
          const convertedValue = this.convertValue(cellValue, mapping.dataType);
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
      case "currency":
        const numValue = parseFloat(stringValue);
        return isNaN(numValue) ? null : numValue;

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

      // Delete all existing bookings
      await bookingService.deleteAllBookings();
      console.log("✅ [CSV IMPORT] Deleted all existing bookings");

      // Create new bookings in batches to reduce listener churn
      const BATCH_SIZE = 400; // stay under 500 limit
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const slice = documents.slice(i, i + BATCH_SIZE);
        await Promise.all(
          slice.map(async (document) => {
            const { id, ...documentData } = document;
            await bookingService.createOrUpdateBooking(id, documentData);
          })
        );
      }

      console.log("✅ [CSV IMPORT] Created all new bookings");

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
    try {
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
