import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { TemplateStatus } from "@/types/mail";

const COLLECTION_NAME = "emailTemplates";

/**
 * GET /api/email-templates/stats - Get email template statistics
 */
export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    
    const stats = {
      total: 0,
      byStatus: {
        active: 0,
        draft: 0,
        archived: 0,
      } as Record<TemplateStatus, number>,
      byUser: {} as Record<string, number>,
      recentActivity: {
        lastCreated: null as Date | null,
        lastUpdated: null as Date | null,
        mostUsed: null as string | null,
      },
    };

    let maxUsage = 0;
    let mostUsedTemplate: string | null = null;
    let lastCreatedDate: Date | null = null;
    let lastUpdatedDate: Date | null = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      stats.total++;

      // Count by status
      const status = (data.status || "draft") as TemplateStatus;
      stats.byStatus[status]++;

      // Count by user
      const createdBy = data.metadata?.createdBy || "unknown";
      stats.byUser[createdBy] = (stats.byUser[createdBy] || 0) + 1;

      // Track usage
      const usageCount = data.metadata?.usedCount || 0;
      if (usageCount > maxUsage) {
        maxUsage = usageCount;
        mostUsedTemplate = doc.id;
      }

      // Track recent activity
      if (data.metadata?.createdAt) {
        const createdAt = data.metadata.createdAt.toDate();
        if (!lastCreatedDate || createdAt > lastCreatedDate) {
          lastCreatedDate = createdAt;
        }
      }

      if (data.metadata?.updatedAt) {
        const updatedAt = data.metadata.updatedAt.toDate();
        if (!lastUpdatedDate || updatedAt > lastUpdatedDate) {
          lastUpdatedDate = updatedAt;
        }
      }
    });

    stats.recentActivity.lastCreated = lastCreatedDate;
    stats.recentActivity.lastUpdated = lastUpdatedDate;
    stats.recentActivity.mostUsed = mostUsedTemplate;

    console.log(`✅ Generated email template statistics`);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Error getting template stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get template statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
