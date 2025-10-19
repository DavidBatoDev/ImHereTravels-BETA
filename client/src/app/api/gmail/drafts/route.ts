import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, bcc, subject, content, draftId } = body;

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Create recipients string
    const recipients = [];
    if (to && to.length > 0) recipients.push(`To: ${to.join(", ")}`);
    if (cc && cc.length > 0) recipients.push(`Cc: ${cc.join(", ")}`);
    if (bcc && bcc.length > 0) recipients.push(`Bcc: ${bcc.join(", ")}`);

    // Create email message
    const message = [
      ...recipients,
      `Subject: ${subject || "(no subject)"}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      content || "",
    ].join("\n");

    // Encode message
    const encodedMessage = Buffer.from(message).toString("base64url");

    if (draftId) {
      // Update existing draft
      try {
        const response = await gmail.users.drafts.update({
          userId: "me",
          id: draftId,
          requestBody: {
            message: {
              raw: encodedMessage,
            },
          },
        });

        return NextResponse.json({
          success: true,
          draftId: response.data.id,
          message: "Draft updated successfully",
        });
      } catch (error: any) {
        // If update fails, create a new draft
        console.log("Failed to update draft, creating new one:", error.message);
      }
    }

    // Create new draft
    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });

    return NextResponse.json({
      success: true,
      draftId: response.data.id,
      message: "Draft created successfully",
    });
  } catch (error) {
    console.error("Error managing draft:", error);
    return NextResponse.json(
      { error: "Failed to manage draft" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get("draftId");

    if (!draftId) {
      return NextResponse.json(
        { error: "Draft ID is required" },
        { status: 400 }
      );
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    await gmail.users.drafts.delete({
      userId: "me",
      id: draftId,
    });

    return NextResponse.json({
      success: true,
      message: "Draft deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}
