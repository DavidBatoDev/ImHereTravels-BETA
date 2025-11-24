export interface GoogleSheetsSyncResult {
  success: boolean;
  message: string;
  data?: {
    totalRows: number;
    validRows: number;
  };
  error?: string;
}

// Hardcoded spreadsheet ID for ImHereTravels
const IMHERE_TRAVELS_SPREADSHEET_ID =
  "1n9nghnDLhZronH1Ax7-LYUUqY_mQJqGMHtRfLAJHNKM";

/**
 * Client-side Google Sheets sync service
 * Downloads CSV from Google Sheets and passes to CSV import service
 */
class GoogleSheetsSyncService {
  /**
   * Download CSV from Google Sheets and return as File object
   * Uses the hardcoded ImHereTravels spreadsheet ID
   * @param sheetName - The sheet name to download (default: "Main Dashboard")
   * @returns Promise with File object containing CSV data
   */
  async downloadCSVAsFile(sheetName: string = "Main Dashboard"): Promise<File> {
    try {
      const response = await fetch("/api/sheets/download-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId: IMHERE_TRAVELS_SPREADSHEET_ID,
          sheetName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to download CSV from Google Sheets"
        );
      }

      const csvContent = await response.text();

      // Convert CSV string to File object
      const blob = new Blob([csvContent], { type: "text/csv" });
      const file = new File([blob], `google-sheets-${sheetName}.csv`, {
        type: "text/csv",
      });

      return file;
    } catch (error) {
      console.error("Error downloading CSV from Google Sheets:", error);
      throw error;
    }
  }

  /**
   * Validate if the hardcoded spreadsheet is accessible
   * @returns Promise with validation result
   */
  async validateSpreadsheetAccess(): Promise<boolean> {
    try {
      const response = await fetch("/api/sheets/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId: IMHERE_TRAVELS_SPREADSHEET_ID,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Error validating spreadsheet access:", error);
      return false;
    }
  }
}

export const googleSheetsSyncService = new GoogleSheetsSyncService();
