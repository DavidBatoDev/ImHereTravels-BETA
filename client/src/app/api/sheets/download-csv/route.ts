import { NextRequest, NextResponse } from "next/server";
import { googleSheetsServerService } from "@/lib/google-sheets/google-sheets-server-service";
import { writeFile } from "fs/promises";
import { join } from "path";

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

    // Save CSV to exports folder for inspection
    try {
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const filename = `google-sheets-${
        sheetName || "export"
      }-${timestamp}.csv`;
      const exportPath = join(process.cwd(), "exports", filename);

      await writeFile(exportPath, csvContent, "utf-8");
      console.log(`✅ CSV saved to: ${exportPath}`);
    } catch (saveError) {
      console.error("Failed to save CSV to exports folder:", saveError);
      // Continue even if save fails
    }

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
