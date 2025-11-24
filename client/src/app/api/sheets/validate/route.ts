import { NextRequest, NextResponse } from "next/server";
import { googleSheetsServerService } from "@/lib/google-sheets/google-sheets-server-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spreadsheetId } = body;

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, message: "Spreadsheet ID is required" },
        { status: 400 }
      );
    }

    // Validate spreadsheet access using Bella's account
    const isValid = await googleSheetsServerService.validateSpreadsheetAccess(
      spreadsheetId
    );

    if (isValid) {
      return NextResponse.json(
        {
          success: true,
          message: "Spreadsheet is accessible",
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message:
            "Spreadsheet not found or not accessible. Please check the ID and sharing permissions.",
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in validate API route:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to validate spreadsheet access",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
