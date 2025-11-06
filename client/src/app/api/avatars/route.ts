import { NextRequest, NextResponse } from "next/server";
import { avatarService } from "@/lib/avatar-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emails } = body;

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request. Expected 'emails' array.",
        },
        { status: 400 }
      );
    }

    console.log("Avatar API called with emails:", emails);

    // Get avatars for all emails
    const avatarMap = await avatarService.getBatchAvatars(emails);

    // Convert Map to object for JSON response
    const avatarObject = Object.fromEntries(avatarMap);

    return NextResponse.json({
      success: true,
      data: {
        avatars: avatarObject,
        cacheStats: avatarService.getCacheStats(),
      },
    });
  } catch (error) {
    console.error("Error in Avatar API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch avatars",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Clear the avatar cache
    avatarService.clearCache();

    return NextResponse.json({
      success: true,
      message: "Avatar cache cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing avatar cache:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to clear avatar cache",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email parameter is required",
        },
        { status: 400 }
      );
    }

    console.log("🔍 Avatar API (GET) called with email:", email);

    // Get avatar for single email
    const avatarUrl = await avatarService.getAvatarUrl(email);

    console.log("📊 Avatar API (GET) result:", {
      email,
      avatarUrl,
      isGoogleAvatar: avatarUrl.includes("googleusercontent.com"),
      isDefaultAvatar: avatarUrl.includes("ui-avatars.com"),
    });

    return NextResponse.json({
      success: true,
      data: {
        email,
        avatarUrl,
        initials: avatarService.getAvatarInitials(email),
      },
    });
  } catch (error) {
    console.error("Error in Avatar API (GET):", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch avatar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
