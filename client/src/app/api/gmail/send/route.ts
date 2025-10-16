import { NextRequest, NextResponse } from "next/server";
import GmailApiService from "@/lib/gmail/gmail-api-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, bcc, subject, body: emailBody, attachments } = body;

    console.log("Gmail send API called with:", { to, subject });

    // Initialize Gmail API service
    const gmailService = new GmailApiService();

    // Send email via Gmail API
    const result = await gmailService.sendEmail({
      to,
      cc: cc ? [cc] : undefined,
      bcc: bcc ? [bcc] : undefined,
      subject,
      htmlContent: emailBody,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in Gmail send API:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
