import { NextRequest, NextResponse } from "next/server";
import GmailApiService from "@/lib/gmail/gmail-api-service";

export async function POST(request: NextRequest) {
  try {
    console.log("=== Gmail Send API Called ===");

    const body = await request.json();
    const { to, cc, bcc, subject, body: emailBody, attachments } = body;

    console.log("Gmail send API called with:", {
      to,
      subject,
      bodyLength: emailBody?.length || 0,
      bodyPreview: emailBody?.substring(0, 200) + "...",
      body: emailBody,
    });

    // Initialize Gmail API service
    console.log("Initializing Gmail API service...");
    const gmailService = new GmailApiService();

    // Send email via Gmail API
    console.log("Calling gmailService.sendEmail...");
    const result = await gmailService.sendEmail({
      to,
      cc: cc ? [cc] : undefined,
      bcc: bcc ? [bcc] : undefined,
      subject,
      htmlContent: emailBody,
      attachments: attachments || [],
    });

    console.log("Email sent successfully via Gmail API:", result);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("=== ERROR in Gmail send API ===");
    console.error("Error details:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      },
      { status: 500 }
    );
  }
}
