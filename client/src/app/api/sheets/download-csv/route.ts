import { NextRequest, NextResponse } from "next/server";
import { googleSheetsServerService } from "@/lib/google-sheets/google-sheets-server-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spreadsheetId, sheetName } = body;

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, message: "Spreadsheet ID is required" },
        { status: 400 }
      );
    }

    // Download CSV content from Google Sheets
    const csvContent = await googleSheetsServerService.downloadCSVContent(
      spreadsheetId,
      sheetName || "Main Dashboard"
    );

    // Return CSV as plain text
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="google-sheets-${
          sheetName || "export"
        }.csv"`,
      },
    });
  } catch (error) {
    console.error("Error in download-csv API route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to download CSV from Google Sheets",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
