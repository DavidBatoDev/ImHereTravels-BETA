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
  increment as firestoreIncrement,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
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
  status?: TemplateStatus;
  search?: string;
  createdBy?: string;
}

export interface TemplateQueryOptions {
  filters?: TemplateFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  startAfter?: any;
}

export interface TemplateStats {
  total: number;
  byType: Record<TemplateType, number>;
  byStatus: Record<TemplateStatus, number>;
  byUser: Record<string, number>;
  recentActivity: {
    lastCreated: Date | null;
    lastUpdated: Date | null;
    mostUsed: string | null;
  };
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class EmailTemplateService {
  /**
   * Create a new email template
   */
  static async createTemplate(
    data: CreateTemplateData,
    userId: string
  ): Promise<string> {
    try {
      // Validate template data
      const validation = this.validateTemplate(data);
      if (!validation.isValid) {
        throw new Error(
          `Template validation failed: ${validation.errors.join(", ")}`
        );
      }

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

      console.log(`Template created successfully with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error("Error creating template:", error);
      throw new Error(
        `Failed to create template: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
    total: number;
  }> {
    try {
      let q: Query<DocumentData> = collection(db, COLLECTION_NAME);

      // Apply filters
      if (options.filters) {
        if (options.filters.status) {
          q = query(q, where("status", "==", options.filters.status));
        }
        if (options.filters.createdBy) {
          q = query(
            q,
            where("metadata.createdBy", "==", options.filters.createdBy)
          );
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
            template.subject.toLowerCase().includes(searchTerm) ||
            template.content.toLowerCase().includes(searchTerm)
        );
      }

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
      const hasMore = querySnapshot.docs.length === (options.limit || 10);

      return {
        templates: filteredTemplates,
        lastDoc,
        hasMore,
        total: filteredTemplates.length,
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

      // Validate update data using partial validation
      const existingTemplate = await this.getTemplate(id);
      if (!existingTemplate) {
        throw new Error("Template not found");
      }

      const validation = this.validatePartialUpdate(
        updateData,
        existingTemplate
      );
      if (!validation.isValid) {
        throw new Error(
          `Template validation failed: ${validation.errors.join(", ")}`
        );
      }

      const updatePayload = {
        ...updateData,
        metadata: {
          ...existingTemplate.metadata, // Preserve existing metadata
          updatedAt: Timestamp.now(),
        },
      };

      console.log("Update payload:", updatePayload);
      console.log("Existing template metadata:", existingTemplate.metadata);

      await updateDoc(docRef, updatePayload);
      console.log(`Template ${id} updated successfully`);
    } catch (error) {
      console.error("Error updating template:", error);
      throw new Error(
        `Failed to update template: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
      console.log(`Template ${id} deleted successfully`);
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
        "metadata.usedCount": firestoreIncrement(1),
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
      console.log(
        `Bulk updated ${templateIds.length} templates to status: ${status}`
      );
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
  static async getTemplateStats(): Promise<TemplateStats> {
    try {
      const allTemplates = await this.getTemplates();
      const templates = allTemplates.templates;

      const stats: TemplateStats = {
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
        byUser: {},
        recentActivity: {
          lastCreated: null,
          lastUpdated: null,
          mostUsed: null,
        },
      };

      let maxUsage = 0;
      let mostUsedTemplate: string | null = null;

      templates.forEach((template) => {
        // Count by status
        stats.byStatus[template.status]++;

        // Count by user
        const createdBy = template.metadata?.createdBy || "unknown";
        stats.byUser[createdBy] = (stats.byUser[createdBy] || 0) + 1;

        // Track usage
        const usageCount = template.metadata?.usedCount || 0;
        if (usageCount > maxUsage) {
          maxUsage = usageCount;
          mostUsedTemplate = template.id;
        }
      });

      // Get recent activity
      if (templates.length > 0) {
        const sortedByCreated = [...templates].sort(
          (a, b) =>
            (b.metadata?.createdAt?.toDate?.() || new Date(0)).getTime() -
            (a.metadata?.createdAt?.toDate?.() || new Date(0)).getTime()
        );
        const sortedByUpdated = [...templates].sort(
          (a, b) =>
            (b.metadata?.updatedAt?.toDate?.() || new Date(0)).getTime() -
            (a.metadata?.updatedAt?.toDate?.() || new Date(0)).getTime()
        );

        stats.recentActivity.lastCreated =
          sortedByCreated[0]?.metadata?.createdAt?.toDate?.() || null;
        stats.recentActivity.lastUpdated =
          sortedByUpdated[0]?.metadata?.updatedAt?.toDate?.() || null;
        stats.recentActivity.mostUsed = mostUsedTemplate;
      }

      return stats;
    } catch (error) {
      console.error("Error getting template stats:", error);
      throw new Error("Failed to get template statistics");
    }
  }

  /**
   * Validate template data
   */
  static validateTemplate(data: CreateTemplateData): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!data.name?.trim()) {
      errors.push("Template name is required");
    }
    if (!data.subject?.trim()) {
      errors.push("Email subject is required");
    }
    if (!data.content?.trim()) {
      errors.push("Template content is required");
    }

    if (!data.status) {
      errors.push("Template status is required");
    }

    // Content validation
    if (data.content) {
      // Check for basic HTML structure
      if (
        !data.content.includes("<html") &&
        !data.content.includes("<!DOCTYPE")
      ) {
        warnings.push("Content doesn't appear to be valid HTML");
      }

      // Check for common email template elements
      if (!data.content.includes("<body")) {
        warnings.push("Content should include a <body> tag");
      }

      // Check for responsive design
      if (
        !data.content.includes("viewport") &&
        !data.content.includes("max-width")
      ) {
        warnings.push(
          "Consider adding responsive design elements for mobile compatibility"
        );
      }
    }

    // Variable validation
    if (data.variables && data.variables.length > 0) {
      const invalidVariables = data.variables.filter(
        (variable) => !variable.match(/^\{\{[\w_]+\}\}$/)
      );
      if (invalidVariables.length > 0) {
        errors.push(`Invalid variable format: ${invalidVariables.join(", ")}`);
      }
    }

    // Name length validation
    if (data.name && data.name.length > 100) {
      errors.push("Template name is too long (max 100 characters)");
    }

    // Subject length validation
    if (data.subject && data.subject.length > 200) {
      warnings.push(
        "Email subject is quite long (max 200 characters recommended)"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate partial template data for updates
   */
  static validatePartialUpdate(
    updateData: Partial<CreateTemplateData>,
    existingTemplate: CommunicationTemplate
  ): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Only validate fields that are being updated
    if (updateData.name !== undefined && !updateData.name?.trim()) {
      errors.push("Template name is required");
    }

    if (updateData.subject !== undefined && !updateData.subject?.trim()) {
      errors.push("Email subject is required");
    }

    if (updateData.content !== undefined && !updateData.content?.trim()) {
      errors.push("Template content is required");
    }

    if (updateData.status !== undefined && !updateData.status) {
      errors.push("Template status is required");
    }

    // Content validation if content is being updated
    if (updateData.content) {
      // Check for basic HTML structure
      if (
        !updateData.content.includes("<html") &&
        !updateData.content.includes("<!DOCTYPE")
      ) {
        warnings.push("Content doesn't appear to be valid HTML");
      }

      // Check for common email template elements
      if (!updateData.content.includes("<body")) {
        warnings.push("Content should include a <body> tag");
      }

      // Check for responsive design
      if (
        !updateData.content.includes("viewport") &&
        !updateData.content.includes("max-width")
      ) {
        warnings.push(
          "Consider adding responsive design elements for mobile compatibility"
        );
      }
    }

    // Name length validation
    if (updateData.name && updateData.name.length > 100) {
      errors.push("Template name is too long (max 100 characters)");
    }

    // Subject length validation
    if (updateData.subject && updateData.subject.length > 200) {
      warnings.push(
        "Email subject is quite long (max 200 characters recommended)"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Extract variables from HTML content
   */
  static extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map((match) => `{{${match[1]}}}`))];
  }

  /**
   * Search templates with full-text search
   */
  static async searchTemplates(
    searchTerm: string,
    options: Omit<TemplateQueryOptions, "filters"> = {}
  ): Promise<{
    templates: CommunicationTemplate[];
    lastDoc?: any;
    hasMore: boolean;
    total: number;
  }> {
    try {
      // Get all templates first (since Firestore doesn't support full-text search)
      const allTemplates = await this.getTemplates({
        ...options,
        filters: { search: searchTerm },
      });

      return allTemplates;
    } catch (error) {
      console.error("Error searching templates:", error);
      throw new Error("Failed to search templates");
    }
  }

  /**
   * Get templates by user
   */
  static async getTemplatesByUser(
    userId: string,
    options: Omit<TemplateQueryOptions, "filters"> = {}
  ): Promise<{
    templates: CommunicationTemplate[];
    lastDoc?: any;
    hasMore: boolean;
    total: number;
  }> {
    try {
      return await this.getTemplates({
        ...options,
        filters: { createdBy: userId },
      });
    } catch (error) {
      console.error("Error getting templates by user:", error);
      throw new Error("Failed to get templates by user");
    }
  }

  /**
   * Subscribe to real-time template updates
   */
  static subscribeToTemplates(
    callback: (templates: CommunicationTemplate[]) => void,
    options: TemplateQueryOptions = {}
  ): Unsubscribe {
    try {
      let q: Query<DocumentData> = collection(db, COLLECTION_NAME);

      // Apply filters
      if (options.filters) {
        if (options.filters.status) {
          q = query(q, where("status", "==", options.filters.status));
        }
        if (options.filters.createdBy) {
          q = query(
            q,
            where("metadata.createdBy", "==", options.filters.createdBy)
          );
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

      return onSnapshot(q, (querySnapshot) => {
        const templates: CommunicationTemplate[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const template: CommunicationTemplate = {
            id: doc.id,
            name: data.name,
            subject: data.subject,
            content: data.content,
            variables: data.variables || [],
            status: data.status,
            bccGroups: data.bccGroups || [],
            metadata: {
              createdAt: data.metadata?.createdAt?.toDate?.() || new Date(),
              updatedAt: data.metadata?.updatedAt?.toDate?.() || new Date(),
              createdBy: data.metadata?.createdBy,
              usedCount: data.metadata?.usedCount || 0,
            },
          };
          templates.push(template);
        });

        // Apply search filter if provided
        let filteredTemplates = templates;
        if (options.filters?.search) {
          const searchTerm = options.filters.search.toLowerCase();
          filteredTemplates = templates.filter(
            (template) =>
              template.name.toLowerCase().includes(searchTerm) ||
              template.subject.toLowerCase().includes(searchTerm) ||
              template.content.toLowerCase().includes(searchTerm)
          );
        }

        callback(filteredTemplates);
      });
    } catch (error) {
      console.error("Error setting up template subscription:", error);
      throw new Error("Failed to set up template subscription");
    }
  }

  /**
   * Bulk delete templates
   */
  static async bulkDeleteTemplates(templateIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);

      templateIds.forEach((id) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.delete(docRef);
      });

      await batch.commit();
      console.log(`Bulk deleted ${templateIds.length} templates`);
    } catch (error) {
      console.error("Error bulk deleting templates:", error);
      throw new Error("Failed to bulk delete templates");
    }
  }

  /**
   * Archive template instead of deleting
   */
  static async archiveTemplate(id: string): Promise<void> {
    try {
      await this.updateTemplate({ id, status: "archived" });
      console.log(`Template ${id} archived successfully`);
    } catch (error) {
      console.error("Error archiving template:", error);
      throw new Error("Failed to archive template");
    }
  }

  /**
   * Restore archived template
   */
  static async restoreTemplate(id: string): Promise<void> {
    try {
      await this.updateTemplate({ id, status: "draft" });
      console.log(`Template ${id} restored successfully`);
    } catch (error) {
      console.error("Error restoring template:", error);
      throw new Error("Failed to restore template");
    }
  }

  /**
   * Get template usage analytics
   */
  static async getTemplateAnalytics(
    templateId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalUsage: number;
    usageByDate: Record<string, number>;
    averageUsagePerDay: number;
    peakUsageDay: string | null;
  }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      // This would typically query a separate analytics collection
      // For now, return basic usage data
      const totalUsage = template.metadata?.usedCount || 0;

      return {
        totalUsage,
        usageByDate: {}, // Would be populated from analytics collection
        averageUsagePerDay: 0, // Would be calculated from analytics
        peakUsageDay: null, // Would be determined from analytics
      };
    } catch (error) {
      console.error("Error getting template analytics:", error);
      throw new Error("Failed to get template analytics");
    }
  }
}

// Export the service as default
export default EmailTemplateService;
