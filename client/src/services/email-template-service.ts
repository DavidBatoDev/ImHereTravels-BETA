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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  CommunicationTemplate,
  TemplateStatus,
  VariableDefinition,
} from "@/types/communications";

// Collection reference
const COLLECTION_NAME = "emailTemplates";

// Variable definition types are now imported from @/types/communications

export interface CreateTemplateData {
  name: string;
  subject: string;
  content: string;
  variables: string[];
  variableDefinitions?: VariableDefinition[];
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

// Add new interface for template processing
interface TemplateData {
  [key: string]: any;
}

// Add new interface for processing options
interface ProcessingOptions {
  removeConditionals?: boolean;
  defaultValues?: { [key: string]: any };
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

      // Prepare the template data for Firebase
      const templateData = {
        name: data.name,
        subject: data.subject,
        content: data.content,
        variables: data.variables || [],
        variableDefinitions: data.variableDefinitions || [],
        status: data.status,
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
        const data = docSnap.data();

        // Transform the data to match CommunicationTemplate interface
        const template: CommunicationTemplate = {
          id: docSnap.id,
          name: data.name || "",
          subject: data.subject || "",
          content: data.content || "",
          variables: data.variables || [],
          variableDefinitions: data.variableDefinitions || [],
          status: data.status || "draft",
          bccGroups: data.bccGroups || [],
          metadata: {
            createdAt: data.metadata?.createdAt?.toDate?.() || new Date(),
            updatedAt: data.metadata?.updatedAt?.toDate?.() || new Date(),
            createdBy: data.metadata?.createdBy || "",
            usedCount: data.metadata?.usedCount || 0,
          },
        };

        return template;
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
        const data = doc.data();

        // Transform the data to match CommunicationTemplate interface
        const template: CommunicationTemplate = {
          id: doc.id,
          name: data.name || "",
          subject: data.subject || "",
          content: data.content || "",
          variables: data.variables || [],
          variableDefinitions: data.variableDefinitions || [],
          status: data.status || "draft",
          bccGroups: data.bccGroups || [],
          metadata: {
            createdAt: data.metadata?.createdAt?.toDate?.() || new Date(),
            updatedAt: data.metadata?.updatedAt?.toDate?.() || new Date(),
            createdBy: data.metadata?.createdBy || "",
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

      // Prepare the update payload with proper data structure
      const updatePayload: any = {};

      // Only include fields that are being updated
      if (updateData.name !== undefined) updatePayload.name = updateData.name;
      if (updateData.subject !== undefined)
        updatePayload.subject = updateData.subject;
      if (updateData.content !== undefined)
        updatePayload.content = updateData.content;
      if (updateData.variables !== undefined)
        updatePayload.variables = updateData.variables;
      if (updateData.variableDefinitions !== undefined)
        updatePayload.variableDefinitions = updateData.variableDefinitions;
      if (updateData.status !== undefined)
        updatePayload.status = updateData.status;
      if (updateData.bccGroups !== undefined)
        updatePayload.bccGroups = updateData.bccGroups;

      // Always update the metadata
      updatePayload.metadata = {
        ...existingTemplate.metadata,
        updatedAt: Timestamp.now(),
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
    type: string
  ): Promise<CommunicationTemplate[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("status", "==", "active"),
        orderBy("metadata.updatedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const templates: CommunicationTemplate[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // Transform the data to match CommunicationTemplate interface
        const template: CommunicationTemplate = {
          id: doc.id,
          name: data.name || "",
          subject: data.subject || "",
          content: data.content || "",
          variables: data.variables || [],
          variableDefinitions: data.variableDefinitions || [],
          status: data.status || "draft",
          bccGroups: data.bccGroups || [],
          metadata: {
            createdAt: data.metadata?.createdAt?.toDate?.() || new Date(),
            updatedAt: data.metadata?.updatedAt?.toDate?.() || new Date(),
            createdBy: data.metadata?.createdBy || "",
            usedCount: data.metadata?.usedCount || 0,
          },
        };

        templates.push(template);
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

    // Variable validation - no longer needed since variables are explicitly defined by user
    // The new system doesn't require variables to be predefined in any specific format

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
   * Extract variables from HTML content (legacy method for compatibility)
   * Now extracts from <?= variable ?> syntax
   */
  static extractVariables(content: string): string[] {
    return this.extractTemplateVariables(content);
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
            variableDefinitions: data.variableDefinitions || [],
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

  /**
   * Process a template with conditional rendering and variable substitution
   * Using Google Apps Script-like syntax: <?= variable ?> for output and <? ... ?> for logic
   * @param template The HTML template string
   * @param data The data object containing variable values
   * @param options Processing options
   * @returns Processed HTML string
   */
  static processTemplate(
    template: string,
    data: TemplateData,
    options: ProcessingOptions = {}
  ): string {
    let processedTemplate = template;

    try {
      // Process conditional blocks and loops
      processedTemplate = this.processScriptLogic(
        processedTemplate,
        data,
        options
      );

      // Process variable outputs
      processedTemplate = this.processVariableOutputs(
        processedTemplate,
        data,
        options
      );
    } catch (error) {
      console.warn(
        "Template processing failed, returning original template:",
        error
      );
      // Return the original template if processing fails
      // This prevents the app from crashing
      return template;
    }

    return processedTemplate;
  }

  /**
   * Process script logic blocks (conditionals, loops) in the template
   * Handles: <? if (condition) { ?>...<? } ?>, <? for (loop) { ?>...<? } ?>, etc.
   */
  private static processScriptLogic(
    template: string,
    data: TemplateData,
    options: ProcessingOptions
  ): string {
    try {
      // Create a safe evaluation context
      const context = { ...data };

      // Use Function constructor to safely evaluate the template as JavaScript
      // This converts the template into executable JavaScript code
      const jsCode = this.convertTemplateToJS(template);

      // Execute the JavaScript code with the data context
      const func = new Function(
        ...Object.keys(context),
        `return \`${jsCode}\`;`
      );
      return func(...Object.values(context));
    } catch (error) {
      console.warn(
        "Error processing script logic, returning original template:",
        error
      );

      // Instead of throwing errors, return the original template
      // This prevents the app from crashing and allows the user to see the issue
      return template;
    }
  }

  /**
   * Convert template with <? ?> syntax to JavaScript template literal syntax
   */
  private static convertTemplateToJS(template: string): string {
    let jsCode = template;

    // Step 1: Convert <?= variable ?> to ${variable} (trim whitespace)
    jsCode = jsCode.replace(/<\?\s*=\s*([^?]+)\s*\?>/g, (match, variable) => {
      return `\${${variable.trim()}}`;
    });

    // Step 2: Process ALL conditional blocks in one pass to avoid conflicts
    // This approach processes the entire conditional structure as a unit
    jsCode = jsCode.replace(
      /<\?\s*if\s*\(([^)]+)\)\s*\{\s*\?>([\s\S]*?)(?:<\?\s*\}\s*else\s*if\s*\(([^)]+)\)\s*\{\s*\?>([\s\S]*?))*?(?:<\?\s*\}\s*else\s*\{\s*\?>([\s\S]*?))?<\?\s*\}\s*\?>/g,
      (match, ifCondition, ifContent, ...rest) => {
        // Parse the entire conditional structure
        const parts = [];

        // Add the first if condition
        parts.push(`${ifCondition.trim()} ? \`${ifContent}\``);

        // Process else if and else parts
        for (let i = 0; i < rest.length; i += 2) {
          if (rest[i] && rest[i + 1]) {
            // This is an else if
            parts.push(`${rest[i].trim()} ? \`${rest[i + 1]}\``);
          } else if (rest[i]) {
            // This is an else
            parts.push(`\`${rest[i]}\``);
            break;
          }
        }

        // If no else, add empty string fallback
        if (parts.length % 2 === 1) {
          parts.push('""');
        }

        // Build the ternary chain
        let result = `\${${parts[0]}`;
        for (let i = 1; i < parts.length; i += 2) {
          result += ` : ${parts[i]}`;
        }
        result += "}";

        return result;
      }
    );

    // Step 3: Handle for loops
    jsCode = jsCode.replace(
      /<\?\s*for\s*\(\s*(\w+)\s+of\s+(\w+)\s*\)\s*\{\s*\?>([\s\S]*?)<\?\s*\}\s*\?>/g,
      (match, item, array, content) => {
        return `\${${array}.map(${item} => \`${content}\`).join('')}`;
      }
    );

    return jsCode;
  }

  /**
   * Process conditional blocks properly to handle if/else if/else chains
   */
  private static processConditionalBlocks(template: string): string {
    let result = template;

    // Find and process each conditional block
    const conditionalBlockRegex =
      /<\?\s*if\s*\([^)]+\)\s*\{\s*\?>[\s\S]*?<\?\s*\}\s*\?>/g;

    result = result.replace(conditionalBlockRegex, (match) => {
      // Process this conditional block
      let blockCode = match;

      // Convert the opening if
      blockCode = blockCode.replace(
        /<\?\s*if\s*\(([^)]+)\)\s*{\s*\?>/g,
        "${$1 ? `"
      );

      // Convert else if statements
      blockCode = blockCode.replace(
        /<\?\s*}\s*else\s*if\s*\(([^)]+)\)\s*{\s*\?>/g,
        "` : ($1) ? `"
      );

      // Convert else statements
      blockCode = blockCode.replace(/<\?\s*}\s*else\s*{\s*\?>/g, "` : `");

      // Convert the final closing brace
      blockCode = blockCode.replace(/<\?\s*}\s*\?>$/, '` : ""}');

      return blockCode;
    });

    return result;
  }

  /**
   * Process variable outputs in the template (<?= variable ?> syntax)
   * This is a fallback for any <?= ?> tags that weren't processed by the main logic
   */
  private static processVariableOutputs(
    template: string,
    data: TemplateData,
    options: ProcessingOptions
  ): string {
    let result = template;

    // Replace any remaining <?= variable ?> with actual values
    result = result.replace(
      /<\?\s*=\s*([^?]+)\s*\?>/g,
      (match, variableName) => {
        const varName = variableName.trim();
        const value = data[varName];

        // If value is empty or undefined, use default or empty string
        if (value === undefined || value === null || value === "") {
          return options.defaultValues?.[varName] || "";
        } else {
          return String(value);
        }
      }
    );

    return result;
  }

  /**
   * Get all variables used in a template (from <?= variable ?> syntax)
   */
  static extractTemplateVariables(template: string): string[] {
    const variables = new Set<string>();

    // Extract variables from <?= variable ?> syntax
    const variableRegex = /<\?\s*=\s*([^?]+)\s*\?>/g;
    let match;
    while ((match = variableRegex.exec(template)) !== null) {
      const varName = match[1].trim();
      // Handle simple variable names (not complex expressions)
      if (/^\w+$/.test(varName)) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  /**
   * Validate template syntax for new <?= ?> and <? ?> format
   */
  static validateTemplateSyntax(template: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Count actual opening blocks (if and for statements)
    const ifBlocks = (template.match(/<\?\s*if\s*\(/g) || []).length;
    const forBlocks = (template.match(/<\?\s*for\s*\(/g) || []).length;

    // Count only TRUE closing blocks (not else if or else continuations)
    // A true closing block is <? } ?> that is NOT followed by else
    const allClosingTags = template.match(/<\?\s*\}\s*\?>/g) || [];
    const elseIfContinuations =
      template.match(/<\?\s*\}\s*else\s*if\s*\(/g) || [];
    const elseContinuations =
      template.match(/<\?\s*\}\s*else\s*\{\s*\?>/g) || [];

    const totalOpenBlocks = ifBlocks + forBlocks;
    const trueClosingBlocks = allClosingTags.length;

    if (totalOpenBlocks !== trueClosingBlocks) {
      errors.push(
        `Mismatched conditional/loop blocks: ${totalOpenBlocks} opening blocks, ${trueClosingBlocks} closing blocks`
      );
    }

    // Validate that variable output tags are properly closed
    const variablePatternWithClosing = /<\?\s*=\s*[^?]*\?>/g;
    const variablePatternWithoutClosing = /<\?\s*=\s*[^?]*(?!\?>)/g;

    const completeVariables = template.match(variablePatternWithClosing) || [];
    const incompleteVariables =
      template.match(variablePatternWithoutClosing) || [];

    // Remove complete variables from incomplete count to avoid double counting
    const actualIncompleteVariables = incompleteVariables.filter(
      (incomplete: string) => {
        return !completeVariables.some((complete: string) =>
          complete.includes(incomplete)
        );
      }
    );

    if (actualIncompleteVariables.length > 0) {
      errors.push("Incomplete variable output tags found (missing ?>)");
    }

    // Validate overall tag balance
    // Count all <? openings vs all ?> closings
    const allOpenings = template.match(/<\?/g) || [];
    const allClosings = template.match(/\?>/g) || [];

    if (allOpenings.length !== allClosings.length) {
      errors.push(
        `Mismatched script tags: ${allOpenings.length} opening tags, ${allClosings.length} closing tags`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export the service as default
export default EmailTemplateService;
