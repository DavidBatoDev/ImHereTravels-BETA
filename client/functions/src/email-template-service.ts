import nunjucks from "nunjucks";

export interface TemplateData {
  [key: string]: any;
}

export interface ProcessingOptions {
  autoescape?: boolean;
  throwOnUndefined?: boolean;
}

/**
 * Email template processing service using Nunjucks
 * This is a simplified version for Firebase Functions
 */
export default class EmailTemplateService {
  /**
   * Process a template string with provided data using Nunjucks
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
        autoescape: options.autoescape ?? false, // We're dealing with HTML templates
        throwOnUndefined: options.throwOnUndefined ?? false, // Don't throw on undefined variables
        trimBlocks: true,
        lstripBlocks: true,
      });

      // Add custom filters if needed
      env.addFilter("currency", (value: number, symbol = "£") => {
        if (typeof value !== "number") return "";
        return `${symbol}${value.toFixed(2)}`;
      });

      env.addFilter("date", (value: string | Date, format = "YYYY-MM-DD") => {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return "";
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
   * Extract all variables used in a template (from Nunjucks syntax)
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
      "index",
      "loop",
      "super",
      "macro",
      "import",
      "extends",
      "block",
      "endblock",
      "if",
      "endif",
      "for",
      "endfor",
      "set",
      "endset",
      "filter",
      "endfilter",
      "raw",
      "endraw",
      "autoescape",
      "endautoescape",
      "call",
      "endcall",
      "include",
      "import",
      "from",
      "as",
    ];

    // Simple regex to find variable patterns like {{ variableName }} or {{ variableName.property }}
    const variableRegex =
      /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}/g;
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1].trim();

      // Skip if it's an excluded keyword
      if (excludedKeywords.includes(variable.toLowerCase())) {
        continue;
      }

      // Handle nested properties - only add the root property
      const rootVariable = variable.split(".")[0];
      if (
        rootVariable &&
        !excludedKeywords.includes(rootVariable.toLowerCase())
      ) {
        variables.add(rootVariable);
      }
    }

    return Array.from(variables);
  }
}
