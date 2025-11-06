import { NextRequest, NextResponse } from "next/server";
import GmailApiService from "@/lib/gmail/gmail-api-service";

export async function GET(request: NextRequest) {
  try {
    console.log("Gmail labels API called");

    // Initialize Gmail API service
    const gmailService = new GmailApiService();

    // Get all Gmail labels
    const labels = await gmailService.getLabels();

    return NextResponse.json({
      success: true,
      data: labels,
    });
  } catch (error) {
    console.error("Error in Gmail labels API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch labels",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
