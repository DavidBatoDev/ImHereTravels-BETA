import { google } from "googleapis";

export interface GoogleSheetsSyncResult {
  success: boolean;
  message: string;
  data?: {
    totalRows: number;
    validRows: number;
  };
  error?: string;
}

/**
 * Server-side Google Sheets service using Bella's authenticated account
 * This should only be used in API routes or server components
 */
class GoogleSheetsServerService {
  private oauth2Client: any;
  private sheets: any;

  constructor() {
    // Initialize OAuth2 client using Bella's account credentials
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob" // For server-side apps
    );

    // Set refresh token credentials (Bella's account)
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    // Set the required scopes for Google Sheets
    this.oauth2Client.scopes = [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
    ];

    // Initialize Google Sheets API client
    this.sheets = google.sheets({ version: "v4", auth: this.oauth2Client });
  }

  /**
   * Download CSV data from Google Sheets using Bella's authenticated account
   * @param spreadsheetId - The Google Spreadsheet ID
   * @param sheetName - The sheet name to export (default: "Main Dashboard")
   * @returns Promise with CSV content as string
   */
  async downloadCSVContent(
    spreadsheetId: string,
    sheetName: string = "Main Dashboard"
  ): Promise<string> {
    try {
      // Get the spreadsheet data using Google Sheets API
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `'${sheetName}'`, // Use sheet name with quotes to handle spaces
      });

      const values = response.data.values;

      if (!values || values.length === 0) {
        throw new Error("No data found in the specified sheet");
      }

      // Convert the data to CSV format
      const csvContent = this.convertToCSV(values);

      return csvContent;
    } catch (error) {
      console.error("Error downloading CSV from Google Sheets:", error);
      throw new Error(
        `Failed to download spreadsheet: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Convert 2D array to CSV string
   * @param data - 2D array of values
   * @returns CSV formatted string
   */
  private convertToCSV(data: any[][]): string {
    return data
      .map((row) =>
        row
          .map((cell) => {
            // Handle cells that contain commas, quotes, or newlines
            const cellValue = String(cell ?? "");
            if (
              cellValue.includes(",") ||
              cellValue.includes('"') ||
              cellValue.includes("\n")
            ) {
              return `"${cellValue.replace(/"/g, '""')}"`;
            }
            return cellValue;
          })
          .join(",")
      )
      .join("\n");
  }

  /**
   * Validate if a spreadsheet ID is valid and accessible using Bella's account
   * @param spreadsheetId - The Google Spreadsheet ID to validate
   * @returns Promise with validation result
   */
  async validateSpreadsheetAccess(spreadsheetId: string): Promise<boolean> {
    try {
      // Try to get basic spreadsheet metadata
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        fields: "spreadsheetId,properties.title",
      });

      return !!response.data.spreadsheetId;
    } catch (error) {
      console.error("Error validating spreadsheet access:", error);
      return false;
    }
  }

  /**
   * Get list of sheet names in a spreadsheet
   * @param spreadsheetId - The Google Spreadsheet ID
   * @returns Promise with array of sheet names
   */
  async getSheetNames(spreadsheetId: string): Promise<string[]> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        fields: "sheets.properties.title",
      });

      const sheets = response.data.sheets || [];
      return sheets.map((sheet: any) => sheet.properties.title);
    } catch (error) {
      console.error("Error getting sheet names:", error);
      throw new Error(
        `Failed to get sheet names: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export const googleSheetsServerService = new GoogleSheetsServerService();
