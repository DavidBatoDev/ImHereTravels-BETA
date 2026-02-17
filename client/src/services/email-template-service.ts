import {
  Timestamp,
  onSnapshot,
  Unsubscribe,
  Query,
  DocumentData,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MailTemplate, TemplateStatus, VariableDefinition } from "@/types/mail";
import nunjucks from "nunjucks";

// Collection reference
const COLLECTION_NAME = "emailTemplates";
const API_BASE = "/api/email-templates";

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

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

// ============================================================================
// EMAIL TEMPLATE SERVICE - HTTP API CLIENT
// ============================================================================

export class EmailTemplateService {
  // ==========================================================================
  // CREATE OPERATIONS
  // ==========================================================================

  /**
   * Create a new email template
   */
  static async createTemplate(
    data: CreateTemplateData,
    userId: string
  ): Promise<string> {
    try {
      // Client-side validation
      const validation = this.validateTemplate(data);
      if (!validation.isValid) {
        throw new Error(
          `Template validation failed: ${validation.errors.join(", ")}`
        );
      }

      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to create template");
      }

      console.log(`✅ Created template with ID: ${result.templateId}`);
      return result.templateId;
    } catch (error) {
      console.error("Error creating template:", error);
      throw new Error(
        `Failed to create template: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // ==========================================================================
  // READ OPERATIONS
  // ==========================================================================

  /**
   * Get a single template by ID
   */
  static async getTemplate(id: string): Promise<MailTemplate | null> {
    try {
      const response = await fetch(`${API_BASE}/${id}`);

      if (response.status === 404) {
        return null;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to get template");
      }

      return result.template;
    } catch (error) {
      console.error("Error getting template:", error);
      throw new Error("Failed to get template");
    }
  }

  /**
   * Get all templates with optional filtering and pagination
   */
  static async getTemplates(options: TemplateQueryOptions = {}): Promise<{
    templates: MailTemplate[];
    lastDoc?: any;
    hasMore: boolean;
    total: number;
  }> {
    try {
      const params = new URLSearchParams();

      // Apply filters
      if (options.filters?.status) {
        params.append("status", options.filters.status);
      }
      if (options.filters?.createdBy) {
        params.append("createdBy", options.filters.createdBy);
      }
      if (options.filters?.search) {
        params.append("search", options.filters.search);
      }

      // Apply sorting
      if (options.sortBy) {
        params.append("sortBy", options.sortBy);
      }
      if (options.sortOrder) {
        params.append("sortOrder", options.sortOrder);
      }

      // Apply limit
      if (options.limit) {
        params.append("limit", options.limit.toString());
      }

      const response = await fetch(`${API_BASE}?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to get templates");
      }

      return {
        templates: result.templates,
        lastDoc: result.lastDoc,
        hasMore: result.hasMore,
        total: result.total,
      };
    } catch (error) {
      console.error("Error getting templates:", error);
      throw new Error("Failed to get templates");
    }
  }

  /**
   * Get templates by type
   */
  static async getTemplatesByType(type: string): Promise<MailTemplate[]> {
    try {
      const result = await this.getTemplates({
        filters: { status: "active" },
        sortBy: "metadata.updatedAt",
        sortOrder: "desc",
      });

      return result.templates;
    } catch (error) {
      console.error("Error getting templates by type:", error);
      throw new Error("Failed to get templates by type");
    }
  }

  /**
   * Search templates with full-text search
   */
  static async searchTemplates(
    searchTerm: string,
    options: Omit<TemplateQueryOptions, "filters"> = {}
  ): Promise<{
    templates: MailTemplate[];
    lastDoc?: any;
    hasMore: boolean;
    total: number;
  }> {
    try {
      return await this.getTemplates({
        ...options,
        filters: { search: searchTerm },
      });
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
    templates: MailTemplate[];
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
   * Get template statistics
   */
  static async getTemplateStats(): Promise<TemplateStats> {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to get template statistics");
      }

      return result.stats;
    } catch (error) {
      console.error("Error getting template stats:", error);
      throw new Error("Failed to get template statistics");
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

      // This would typically query a separate analytics collection via API
      // For now, return basic usage data from the template
      const totalUsage = template.metadata?.usedCount || 0;

      return {
        totalUsage,
        usageByDate: {},
        averageUsagePerDay: 0,
        peakUsageDay: null,
      };
    } catch (error) {
      console.error("Error getting template analytics:", error);
      throw new Error("Failed to get template analytics");
    }
  }

  // ==========================================================================
  // UPDATE OPERATIONS
  // ==========================================================================

  /**
   * Update an existing template
   */
  static async updateTemplate(data: UpdateTemplateData): Promise<void> {
    try {
      const { id, ...updateData } = data;

      // Get existing template for partial validation
      const existingTemplate = await this.getTemplate(id);
      if (!existingTemplate) {
        throw new Error("Template not found");
      }

      // Validate update data
      const validation = this.validatePartialUpdate(
        updateData,
        existingTemplate
      );
      if (!validation.isValid) {
        throw new Error(
          `Template validation failed: ${validation.errors.join(", ")}`
        );
      }

      const response = await fetch(`${API_BASE}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update template");
      }

      console.log(`✅ Updated template ${id}`);
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
   * Update template usage count
   */
  static async incrementUsageCount(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/${id}/increment-usage`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Don't throw error for usage tracking failures
        console.warn("Failed to increment usage count:", result.error);
      }
    } catch (error) {
      console.error("Error incrementing usage count:", error);
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Archive template instead of deleting
   */
  static async archiveTemplate(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/${id}/archive`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to archive template");
      }

      console.log(`✅ Archived template ${id}`);
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
      const response = await fetch(`${API_BASE}/${id}/restore`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to restore template");
      }

      console.log(`✅ Restored template ${id}`);
    } catch (error) {
      console.error("Error restoring template:", error);
      throw new Error("Failed to restore template");
    }
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete template");
      }

      console.log(`✅ Deleted template ${id}`);
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
      const response = await fetch(`${API_BASE}/${templateId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to duplicate template");
      }

      console.log(`✅ Duplicated template ${templateId} to ${result.templateId}`);
      return result.templateId;
    } catch (error) {
      console.error("Error duplicating template:", error);
      throw new Error("Failed to duplicate template");
    }
  }

  // ==========================================================================
  // BATCH OPERATIONS
  // ==========================================================================

  /**
   * Bulk update template statuses
   */
  static async bulkUpdateStatus(
    templateIds: string[],
    status: TemplateStatus
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/batch/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateIds, status }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to bulk update statuses");
      }

      console.log(`✅ Bulk updated ${result.count} templates to status: ${status}`);
    } catch (error) {
      console.error("Error bulk updating statuses:", error);
      throw new Error("Failed to bulk update statuses");
    }
  }

  /**
   * Bulk delete templates
   */
  static async bulkDeleteTemplates(templateIds: string[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/batch/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateIds }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to bulk delete templates");
      }

      console.log(`✅ Bulk deleted ${result.count} templates`);
    } catch (error) {
      console.error("Error bulk deleting templates:", error);
      throw new Error("Failed to bulk delete templates");
    }
  }

  // ==========================================================================
  // REAL-TIME SUBSCRIPTION (Keep Client-Side - Firebase specific)
  // ==========================================================================

  /**
   * Subscribe to real-time template updates
   */
  static subscribeToTemplates(
    callback: (templates: MailTemplate[]) => void,
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
        const templates: MailTemplate[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const template: MailTemplate = {
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

  // ==========================================================================
  // VALIDATION LOGIC (Keep Client-Side - Pure logic, no Firebase)
  // ==========================================================================

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
    existingTemplate: MailTemplate
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

  // ==========================================================================
  // TEMPLATE PROCESSING (Keep Client-Side - Nunjucks, no Firebase)
  // ==========================================================================

  /**
   * Extract variables from HTML content (legacy method for compatibility)
   * Now extracts from <?= variable ?> syntax
   */
  static extractVariables(content: string): string[] {
    return this.extractTemplateVariables(content);
  }

  /**
   * Process a template with Nunjucks templating engine
   * @param template The HTML template string with Nunjucks syntax
   * @param data The data object containing variable values
   * @param options Processing options
   * @returns Processed HTML string
   */
  static processTemplate(
    template: string,
    data: TemplateData,
    options: ProcessingOptions = {}
  ): string {
    try {
      // Configure Nunjucks environment
      const env = nunjucks.configure({
        autoescape: false, // We're dealing with HTML templates
        throwOnUndefined: false, // Don't throw on undefined variables
        trimBlocks: true,
        lstripBlocks: true,
      });

      // Add custom filters if needed
      env.addFilter("currency", (value: number, symbol = "£") => {
        return `${symbol}${value.toFixed(2)}`;
      });

      env.addFilter("date", (value: string | Date, format = "YYYY-MM-DD") => {
        const date = new Date(value);
        return date.toLocaleDateString();
      });

      // Render the template with Nunjucks
      const processedTemplate = env.renderString(template, data);

      return processedTemplate;
    } catch (error) {
      console.warn(
        "Template processing failed, returning original template:",
        error
      );
      // Return the original template if processing fails
      // This prevents the app from crashing
      return template;
    }
  }

  /**
   * Get all variables used in a template (from Nunjucks syntax)
   * Only extracts variables for UI purposes - Nunjucks handles all processing
   */
  static extractTemplateVariables(template: string): string[] {
    const variables = new Set<string>();

    // Common keywords to exclude
    const excludedKeywords = [
      "true",
      "false",
      "null",
      "undefined",
      "length",
      "item",
      "element",
      "key",
      "value",
      "prop",
      "property",
    ];

    // Extract variables from {{ variable }} syntax only
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    let match;
    while ((match = variableRegex.exec(template)) !== null) {
      const expression = match[1].trim();

      // Skip filters and complex expressions
      if (
        expression.includes("|") ||
        expression.includes("(") ||
        expression.includes(")")
      ) {
        continue;
      }

      // Extract simple variable names
      const varMatches = expression.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
      if (varMatches) {
        varMatches.forEach((varName) => {
          if (!excludedKeywords.includes(varName)) {
            variables.add(varName);
          }
        });
      }
    }

    return Array.from(variables);
  }

  /**
   * Validate template syntax for Nunjucks format
   */
  static validateTemplateSyntax(template: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Use Nunjucks to validate the template syntax
      const env = nunjucks.configure({
        autoescape: false,
        throwOnUndefined: false,
        trimBlocks: true,
        lstripBlocks: true,
      });

      // Try to render the template to check for syntax errors
      env.renderString(template, {});
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`Template syntax error: ${error.message}`);
      } else {
        errors.push("Unknown template syntax error");
      }
    }

    // Basic validation for common issues
    const openVariables = (template.match(/\{\{/g) || []).length;
    const closeVariables = (template.match(/\}\}/g) || []).length;

    if (openVariables !== closeVariables) {
      errors.push(
        `Mismatched variable tags: ${openVariables} opening {{, ${closeVariables} closing }}`
      );
    }

    const openBlocks = (template.match(/\{%/g) || []).length;
    const closeBlocks = (template.match(/%\}/g) || []).length;

    if (openBlocks !== closeBlocks) {
      errors.push(
        `Mismatched block tags: ${openBlocks} opening {%, ${closeBlocks} closing %}`
      );
    }

    // Check for common syntax issues
    const unclosedVariables = template.match(/\{\{[^}]*$/g);
    if (unclosedVariables) {
      errors.push("Unclosed variable tags found");
    }

    const unclosedBlocks = template.match(/\{%[^%]*$/g);
    if (unclosedBlocks) {
      errors.push("Unclosed block tags found");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export the service as default
export default EmailTemplateService;
