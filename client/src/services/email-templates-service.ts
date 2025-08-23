import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  Query,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CommunicationTemplate,
  CommunicationMetadata,
  TemplateType,
  TemplateStatus,
} from "@/types/communications";

// Collection reference
const COLLECTION_NAME = "emailTemplates";

export interface CreateTemplateData {
  type: TemplateType;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  status: TemplateStatus;
  bccGroups?: string[];
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  id: string;
}

export interface TemplateFilters {
  type?: TemplateType;
  status?: TemplateStatus;
  search?: string;
}

export interface TemplateQueryOptions {
  filters?: TemplateFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  startAfter?: any;
}

export class EmailTemplatesService {
  /**
   * Create a new email template
   */
  static async createTemplate(
    data: CreateTemplateData,
    userId: string
  ): Promise<string> {
    try {
      const templateData: Omit<CommunicationTemplate, "id"> = {
        ...data,
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
      return docRef.id;
    } catch (error) {
      console.error("Error creating template:", error);
      throw new Error("Failed to create template");
    }
  }

  /**
   * Get a single template by ID
   */
  static async getTemplate(id: string): Promise<CommunicationTemplate | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as CommunicationTemplate;
      }
      return null;
    } catch (error) {
      console.error("Error getting template:", error);
      throw new Error("Failed to get template");
    }
  }

  /**
   * Get all templates with optional filtering and pagination
   */
  static async getTemplates(options: TemplateQueryOptions = {}): Promise<{
    templates: CommunicationTemplate[];
    lastDoc?: any;
    hasMore: boolean;
  }> {
    try {
      let q: Query<DocumentData> = collection(db, COLLECTION_NAME);

      // Apply filters
      if (options.filters) {
        if (options.filters.type) {
          q = query(q, where("type", "==", options.filters.type));
        }
        if (options.filters.status) {
          q = query(q, where("status", "==", options.filters.status));
        }
      }

      // Apply sorting
      const sortField = options.sortBy || "metadata.updatedAt";
      const sortOrder = options.sortOrder || "desc";
      q = query(q, orderBy(sortField, sortOrder));

      // Apply pagination
      if (options.limit) {
        q = query(q, limit(options.limit));
      }
      if (options.startAfter) {
        q = query(q, startAfter(options.startAfter));
      }

      const querySnapshot = await getDocs(q);
      const templates: CommunicationTemplate[] = [];

      querySnapshot.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() } as CommunicationTemplate);
      });

      // Apply search filter if provided
      let filteredTemplates = templates;
      if (options.filters?.search) {
        const searchTerm = options.filters.search.toLowerCase();
        filteredTemplates = templates.filter(
          (template) =>
            template.name.toLowerCase().includes(searchTerm) ||
            template.subject.toLowerCase().includes(searchTerm)
        );
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      const hasMore = querySnapshot.docs.length === (options.limit || 10);

      return {
        templates: filteredTemplates,
        lastDoc,
        hasMore,
      };
    } catch (error) {
      console.error("Error getting templates:", error);
      throw new Error("Failed to get templates");
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(data: UpdateTemplateData): Promise<void> {
    try {
      const { id, ...updateData } = data;
      const docRef = doc(db, COLLECTION_NAME, id);

      const updatePayload = {
        ...updateData,
        metadata: {
          updatedAt: Timestamp.now(),
        },
      };

      await updateDoc(docRef, updatePayload);
    } catch (error) {
      console.error("Error updating template:", error);
      throw new Error("Failed to update template");
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting template:", error);
      throw new Error("Failed to delete template");
    }
  }

  /**
   * Duplicate a template
   */
  static async duplicateTemplate(
    templateId: string,
    userId: string
  ): Promise<string> {
    try {
      const originalTemplate = await this.getTemplate(templateId);
      if (!originalTemplate) {
        throw new Error("Template not found");
      }

      const duplicateData: CreateTemplateData = {
        type: originalTemplate.type,
        name: `${originalTemplate.name} (Copy)`,
        subject: originalTemplate.subject,
        content: originalTemplate.content,
        variables: originalTemplate.variables,
        status: "draft",
        bccGroups: originalTemplate.bccGroups,
      };

      return await this.createTemplate(duplicateData, userId);
    } catch (error) {
      console.error("Error duplicating template:", error);
      throw new Error("Failed to duplicate template");
    }
  }

  /**
   * Update template usage count
   */
  static async incrementUsageCount(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        "metadata.usedCount": increment(1),
        "metadata.updatedAt": Timestamp.now(),
      });
    } catch (error) {
      console.error("Error incrementing usage count:", error);
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Bulk update template statuses
   */
  static async bulkUpdateStatus(
    templateIds: string[],
    status: TemplateStatus
  ): Promise<void> {
    try {
      const batch = writeBatch(db);

      templateIds.forEach((id) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.update(docRef, {
          status,
          "metadata.updatedAt": Timestamp.now(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error bulk updating statuses:", error);
      throw new Error("Failed to bulk update statuses");
    }
  }

  /**
   * Get templates by type
   */
  static async getTemplatesByType(
    type: TemplateType
  ): Promise<CommunicationTemplate[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("type", "==", type),
        where("status", "==", "active"),
        orderBy("metadata.updatedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const templates: CommunicationTemplate[] = [];

      querySnapshot.forEach((doc) => {
        templates.push({ id: doc.id, ...doc.data() } as CommunicationTemplate);
      });

      return templates;
    } catch (error) {
      console.error("Error getting templates by type:", error);
      throw new Error("Failed to get templates by type");
    }
  }

  /**
   * Get template statistics
   */
  static async getTemplateStats(): Promise<{
    total: number;
    byType: Record<TemplateType, number>;
    byStatus: Record<TemplateStatus, number>;
  }> {
    try {
      const allTemplates = await this.getTemplates();
      const templates = allTemplates.templates;

      const stats = {
        total: templates.length,
        byType: {
          reservation: 0,
          "payment-reminder": 0,
          cancellation: 0,
          "adventure-kit": 0,
        },
        byStatus: {
          active: 0,
          draft: 0,
          archived: 0,
        },
      };

      templates.forEach((template) => {
        stats.byType[template.type]++;
        stats.byStatus[template.status]++;
      });

      return stats;
    } catch (error) {
      console.error("Error getting template stats:", error);
      throw new Error("Failed to get template statistics");
    }
  }
}

// Helper function for increment operation
function increment(n: number) {
  return n;
}
