import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { useAuthStore } from "@/store/auth-store";
import { TemplateStatus } from "@/types/mail";

const COLLECTION_NAME = "emailTemplates";

/**
 * POST /api/email-templates - Create a new email template
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { user } = useAuthStore.getState();
    const userId = user?.uid || "anonymous";

    console.log("Creating email template with user ID:", userId);

    // Prepare template data
    const templateData = {
      name: data.name,
      subject: data.subject,
      content: data.content,
      variables: data.variables || [],
      variableDefinitions: data.variableDefinitions || [],
      status: data.status || "draft",
      bccGroups: data.bccGroups || [],
      metadata: {
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
        usedCount: 0,
      },
    };

    const docRef = await addDoc(
      collection(db, COLLECTION_NAME),
      templateData
    );

    console.log(`✅ Created email template with ID: ${docRef.id}`);

    return NextResponse.json({ success: true, templateId: docRef.id });
  } catch (error) {
    console.error("Error creating email template:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create email template",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email-templates - Get all email templates with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const status = searchParams.get("status") as TemplateStatus | null;
    const createdBy = searchParams.get("createdBy");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "metadata.updatedAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const pageLimit = parseInt(searchParams.get("limit") || "50");

    console.log("GET /api/email-templates called with params:", {
      status,
      createdBy,
      search,
      sortBy,
      sortOrder,
      pageLimit,
    });

    // Build query
    let q = query(collection(db, COLLECTION_NAME));

    // Apply filters
    if (status) {
      q = query(q, where("status", "==", status));
    }

    if (createdBy) {
      q = query(q, where("metadata.createdBy", "==", createdBy));
    }

    // Apply sorting
    q = query(q, orderBy(sortBy, sortOrder));

    // Apply pagination limit
    q = query(q, limit(pageLimit));

    const querySnapshot = await getDocs(q);
    const templates: any[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        name: data.name || "",
        subject: data.subject || "",
        content: data.content || "",
        variables: data.variables || [],
        variableDefinitions: data.variableDefinitions || [],
        status: data.status || "draft",
        bccGroups: data.bccGroups || [],
        metadata: {
          createdAt: data.metadata?.createdAt,
          updatedAt: data.metadata?.updatedAt,
          createdBy: data.metadata?.createdBy || "",
          usedCount: data.metadata?.usedCount || 0,
        },
      });
    });

    // Apply text search client-side (Firestore doesn't support full-text search)
    let filteredTemplates = templates;
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredTemplates = templates.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.subject.toLowerCase().includes(searchTerm) ||
          template.content.toLowerCase().includes(searchTerm)
      );
    }

    console.log(`✅ Found ${filteredTemplates.length} email templates`);

    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    const hasMore = querySnapshot.docs.length === pageLimit;

    return NextResponse.json({
      success: true,
      templates: filteredTemplates,
      lastDoc: lastDoc?.id || null,
      hasMore,
      total: filteredTemplates.length,
    });
  } catch (error) {
    console.error("Error getting email templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch email templates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
