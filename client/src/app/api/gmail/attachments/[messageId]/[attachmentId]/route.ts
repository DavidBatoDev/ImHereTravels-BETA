import { NextRequest, NextResponse } from "next/server";
import GmailApiService from "@/lib/gmail/gmail-api-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string; attachmentId: string } }
) {
  try {
    const { messageId, attachmentId } = params;
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    console.log("Gmail attachment API called with:", {
      messageId,
      attachmentId,
      isPreview,
    });

    // Initialize Gmail API service
    const gmailService = new GmailApiService();

    // Fetch attachment data
    const attachmentData = await gmailService.downloadAttachment(
      messageId,
      attachmentId
    );

    if (isPreview) {
      // For preview mode, return the raw image data
      const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Get attachment info to determine MIME type
      const attachmentInfo = await gmailService.getAttachmentInfo(messageId, attachmentId);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': attachmentInfo.mimeType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: attachmentData,
    });
  } catch (error) {
    console.error("Error in Gmail attachment API:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to download attachment",
      },
      { status: 500 }
    );
  }
}
