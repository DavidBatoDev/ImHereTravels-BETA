import { NextRequest, NextResponse } from "next/server";
import GmailApiService from "@/lib/gmail/gmail-api-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;

    if (!messageId) {
      return NextResponse.json(
        {
          success: false,
          error: "Message ID is required",
        },
        { status: 400 }
      );
    }

    console.log("Gmail email content API called for message:", messageId);

    // Initialize Gmail API service
    const gmailService = new GmailApiService();

    // Get full email content
    const email = await gmailService.getEmailContent(messageId);

    return NextResponse.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error("Error in Gmail email content API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch email content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
