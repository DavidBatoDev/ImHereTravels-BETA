"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timestamp } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Eye,
  Code,
  Upload,
  Palette,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmailTemplateService from "@/services/email-template-service";
import { VariableDefinition, VariableType } from "@/types/communications";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Types
import { CommunicationTemplate, TemplateStatus } from "@/types/communications";

// Add new interface for conditional rendering
interface ConditionalBlock {
  condition: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CommunicationTemplate | null;
  onSave: (template: CommunicationTemplate) => void;
  isLoading?: boolean;
}

// Template statuses
const templateStatuses = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

// Monaco Editor Component
function MonacoEditor({
  value,
  onChange,
  language = "html",
  height = "400px",
  zoomLevel = 1,
  onEditorReady,
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  zoomLevel?: number;
  onEditorReady?: (editor: any) => void;
}) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!window.monaco) {
      const script1 = document.createElement("script");
      script1.src =
        "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs/loader.min.js";
      script1.onload = () => {
        window.require.config({
          paths: {
            vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs",
          },
        });
        window.require(["vs/editor/editor.main"], () => {
          initializeEditor();
        });
      };
      document.head.appendChild(script1);
    } else {
      initializeEditor();
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (
      editorRef.current &&
      isEditorReady &&
      value !== editorRef.current.getValue()
    ) {
      // Use setValue with a flag to prevent unnecessary change events
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        editorRef.current.setValue(value);
      }
    }
  }, [value, isEditorReady]);

  // Update zoom level when it changes
  useEffect(() => {
    if (editorRef.current && isEditorReady) {
      const newFontSize = Math.round(14 * zoomLevel);
      const newLineHeight = Math.round(20 * zoomLevel);

      editorRef.current.updateOptions({
        fontSize: newFontSize,
        lineHeight: newLineHeight,
      });

      // Trigger layout update to prevent clipping
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }, 0);
    }
  }, [zoomLevel, isEditorReady]);

  // Handle container resize
  useEffect(() => {
    if (containerRef.current && editorRef.current && isEditorReady) {
      const resizeObserver = new ResizeObserver(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isEditorReady]);

  const initializeEditor = () => {
    if (containerRef.current && window.monaco) {
      editorRef.current = window.monaco.editor.create(containerRef.current, {
        value: value,
        language: language,
        theme: "vs",
        automaticLayout: true,
        fontSize: Math.round(14 * zoomLevel),
        lineHeight: Math.round(20 * zoomLevel),
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        formatOnPaste: true,
        formatOnType: true,
        // Ensure proper container sizing
        fixedOverflowWidgets: true,
        overviewRulerBorder: false,
        // Better scroll behavior
        scrollbar: {
          vertical: "visible",
          horizontal: "visible",
          verticalScrollbarSize: Math.round(12 * zoomLevel),
          horizontalScrollbarSize: Math.round(12 * zoomLevel),
          useShadows: false,
        },
        // Add these options to reduce flashing
        renderWhitespace: "none",
        renderLineHighlight: "all",
        smoothScrolling: true,
        // Prevent cursor jumping
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        // Better performance
        largeFileOptimizations: true,
        maxTokenizationLineLength: 20000,
      });

      editorRef.current.onDidChangeModelContent(() => {
        const newValue = editorRef.current.getValue();
        onChange(newValue);
      });

      // Notify parent component that editor is ready
      if (onEditorReady) {
        onEditorReady(editorRef.current);
      }

      setIsEditorReady(true);
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: "100%",
        overflow: "hidden", // Let Monaco handle scrolling
        position: "relative", // Ensure proper positioning
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading editor...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Beautify function
function beautifyHTML(html: string): string {
  return html
    .replace(/></g, ">\n<")
    .replace(/^\s*\n/gm, "")
    .split("\n")
    .map((line, index, array) => {
      const depth =
        (line.match(/</g) || []).length - (line.match(/\//g) || []).length;
      const indent = "    ".repeat(
        Math.max(0, index > 0 ? getIndentLevel(array.slice(0, index)) : 0)
      );
      return indent + line.trim();
    })
    .join("\n");
}

function getIndentLevel(lines: string[]): number {
  let level = 0;
  lines.forEach((line) => {
    const openTags = (line.match(/<[^\/][^>]*>/g) || []).length;
    const closeTags = (line.match(/<\/[^>]*>/g) || []).length;
    level += openTags - closeTags;
  });
  return Math.max(0, level);
}

// Variable Definition Item Component
interface VariableDefinitionItemProps {
  variable: VariableDefinition;
  index: number;
  onUpdate: (updates: Partial<VariableDefinition>) => void;
  onRemove: () => void;
  onAddMapField: (key: string, type: VariableType) => void;
  onRemoveMapField: (key: string) => void;
  onInsert: () => void;
}

function VariableDefinitionItem({
  variable,
  index,
  onUpdate,
  onRemove,
  onAddMapField,
  onRemoveMapField,
  onInsert,
}: VariableDefinitionItemProps) {
  const [isExpanded, setIsExpanded] = useState(
    variable.type === "map" || variable.type === "array"
  );

  const typeColors = {
    string: "bg-blue-50 text-blue-700 border-blue-200",
    number: "bg-green-50 text-green-700 border-green-200",
    boolean: "bg-purple-50 text-purple-700 border-purple-200",
    array: "bg-orange-50 text-orange-700 border-orange-200",
    map: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="border rounded-lg p-2 space-y-2 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-xs font-medium text-gray-500 min-w-[1rem]">
            {index + 1}.
          </span>
          <Input
            value={variable.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Variable name"
            className="h-6 text-xs flex-1"
          />
          <Select
            value={variable.type}
            onValueChange={(value: VariableType) => onUpdate({ type: value })}
          >
            <SelectTrigger
              className={`h-6 w-20 text-xs border ${typeColors[variable.type]}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">string</SelectItem>
              <SelectItem value="number">number</SelectItem>
              <SelectItem value="boolean">boolean</SelectItem>
              <SelectItem value="array">array</SelectItem>
              <SelectItem value="map">map</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onInsert}
            className="h-6 w-6 p-0 text-xs"
            title="Insert into template"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-xs text-red-600 hover:bg-red-50"
            title="Remove variable"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Array Configuration */}
      {variable.type === "array" && (
        <div className="ml-4 pl-2 border-l-2 border-gray-200 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Element type:</span>
            <Select
              value={variable.arrayElementType || "string"}
              onValueChange={(value: VariableType) =>
                onUpdate({ arrayElementType: value })
              }
            >
              <SelectTrigger className="h-6 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">string</SelectItem>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="map">map</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-gray-400">
            Access with: {`<?= ${variable.name}[0] ?>`},{" "}
            {`<?= ${variable.name}.length ?>`}
          </div>
        </div>
      )}

      {/* Map Configuration */}
      {variable.type === "map" && (
        <div className="ml-4 pl-2 border-l-2 border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Fields:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddMapField("", "string")}
              className="h-5 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Field
            </Button>
          </div>

          {variable.mapFields &&
            Object.entries(variable.mapFields).map(([key, field]) => (
              <div key={key} className="flex items-center space-x-1">
                <Input
                  value={key}
                  onChange={(e) => {
                    // Handle key rename
                    const newMapFields = { ...variable.mapFields };
                    delete newMapFields[key];
                    newMapFields[e.target.value] = field;
                    onUpdate({ mapFields: newMapFields });
                  }}
                  placeholder="field name"
                  className="h-5 text-xs flex-1"
                />
                <span className="text-xs text-gray-400">:</span>
                <Select
                  value={field.type}
                  onValueChange={(value: VariableType) => {
                    const newMapFields = { ...variable.mapFields };
                    newMapFields[key] = { ...field, type: value };
                    onUpdate({ mapFields: newMapFields });
                  }}
                >
                  <SelectTrigger
                    className={`h-5 w-16 text-xs border ${
                      typeColors[field.type]
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">string</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                    <SelectItem value="array">array</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveMapField(key)}
                  className="h-5 w-5 p-0 text-xs text-red-600 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

          {variable.mapFields && Object.keys(variable.mapFields).length > 0 && (
            <div className="text-xs text-gray-400">
              Access with:{" "}
              {`<?= ${variable.name}.${
                Object.keys(variable.mapFields)[0] || "field"
              } ?>`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading = false,
}: TemplateDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    status: "draft" as TemplateStatus,
    variables: [] as string[],
  });

  const [editorView, setEditorView] = useState("split");
  const [htmlContent, setHtmlContent] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [codeEditorZoom, setCodeEditorZoom] = useState(1);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Variable definitions state
  const [variableDefinitions, setVariableDefinitions] = useState<
    VariableDefinition[]
  >([]);
  const [rightSidebarTab, setRightSidebarTab] = useState<
    "info" | "tools" | "variables"
  >("info");

  // Test data state
  const [testData, setTestData] = useState<{ [key: string]: any }>({});

  const editorRef = useRef<any>(null);

  // Function to extract all variables referenced in the template
  const extractAllTemplateVariables = (content: string) => {
    const variables = new Set<string>();

    // JavaScript keywords and common loop counters to exclude
    const excludedKeywords = [
      "true",
      "false",
      "null",
      "undefined",
      "let",
      "const",
      "var",
      "i",
      "j",
      "k",
      "index",
      "idx",
      "counter",
      "count",
      "n",
      "num",
      "length",
      "item",
      "element",
      "key",
      "value",
      "prop",
      "property",
    ];

    // Extract from <?= variable ?> syntax
    const variableRegex = /<\?\s*=\s*([^?]+)\s*\?>/g;
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      const varName = match[1].trim();
      // Handle simple variable names (not complex expressions)
      if (/^\w+$/.test(varName) && !excludedKeywords.includes(varName)) {
        variables.add(varName);
      }
    }

    // Extract from conditional statements <? if (variable === "value") { ?>
    const conditionalRegex = /<\?\s*if\s*\(([^)]+)\)\s*\{/g;
    while ((match = conditionalRegex.exec(content)) !== null) {
      const condition = match[1];
      // Extract variable names from conditions like "paymentMethod === 'Stripe'"
      const varMatches = condition.match(/\b\w+\b/g);
      if (varMatches) {
        varMatches.forEach((varName) => {
          if (!excludedKeywords.includes(varName)) {
            variables.add(varName);
          }
        });
      }
    }

    // Extract from for loops <? for (let i = 0; i < array.length; i++) { ?>
    const forLoopRegex = /<\?\s*for\s*\([^)]*\)\s*\{/g;
    while ((match = forLoopRegex.exec(content)) !== null) {
      // Don't extract loop counters from for loops
      // They are automatically handled by the template processing
    }

    return Array.from(variables);
  };

  // Function to convert test data from flat structure to nested structure for processing
  const convertTestDataForProcessing = (flatData: { [key: string]: any }) => {
    const processedData: { [key: string]: any } = {};

    // First, extract all variables referenced in the template
    const allTemplateVariables = extractAllTemplateVariables(htmlContent);

    // Initialize all template variables with empty values if they don't exist
    allTemplateVariables.forEach((varName) => {
      if (!(varName in flatData)) {
        processedData[varName] = "";
      }
    });

    // Process the actual test data
    Object.entries(flatData).forEach(([key, value]) => {
      try {
        if (key.includes(".")) {
          // Handle nested properties (like "companyName.field")
          const [parentKey, ...childKeys] = key.split(".");
          const childKey = childKeys.join(".");

          // Ensure parent key is an object, not a string
          if (
            !processedData[parentKey] ||
            typeof processedData[parentKey] !== "object"
          ) {
            processedData[parentKey] = {};
          }

          // Only proceed if parent is actually an object
          if (
            typeof processedData[parentKey] === "object" &&
            processedData[parentKey] !== null
          ) {
            processedData[parentKey][childKey] = value;
          } else {
            console.warn(
              `Cannot set property '${childKey}' on non-object value for '${parentKey}'`
            );
          }
        } else {
          // Handle direct properties
          processedData[key] = value;
        }
      } catch (error) {
        console.error(`Error processing test data for key '${key}':`, error);
        // Set a safe fallback value
        processedData[key] = "";
      }
    });

    console.log("All template variables:", allTemplateVariables);
    console.log("Original test data:", flatData);
    console.log("Processed test data:", processedData);

    return processedData;
  };

  useEffect(() => {
    console.log("Template changed:", template);
    console.log("Template ID:", template?.id);
    console.log("Template ID length:", template?.id?.length);

    if (template && template.id && template.id.length === 20) {
      // This is an existing template (Firestore ID is 20 characters)
      const newFormData = {
        name: template.name,
        subject: template.subject,
        content: template.content,
        status: template.status as TemplateStatus,
        variables: template.variables,
      };
      console.log("Setting form data for existing template:", newFormData);
      setFormData(newFormData);
      setHtmlContent(template.content);

      // Load existing variable definitions
      if (template.variableDefinitions) {
        setVariableDefinitions(template.variableDefinitions);
      } else {
        setVariableDefinitions([]);
      }
    } else {
      // This is a new template or no template
      const simpleEmailTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: #333;">Your Email Title</h1>
    </div>
    
    <div style="background-color: #ffffff; padding: 20px; border: 1px solid #dee2e6;">
        <h2 style="color: #333; margin-top: 0;">Hello <?= fullName ?>,</h2>
        
        <p>This is your email content using the new Google Apps Script-like syntax:</p>
        
                 <ul>
             <li>Use &lt;?= variable ?&gt; for outputting variables</li>
             <li>Use &lt;? if (condition) { ?&gt; for conditionals</li>
             <li>Use &lt;? for (loop) { ?&gt; for loops</li>
             <li>Everything in &lt;? ?&gt; tags is dynamic logic</li>
        </ul>
        
        <? if (paymentMethod === "Stripe") { ?>
            <p><strong>Payment Method:</strong> Pay securely online with Stripe</p>
            <a href="https://buy.stripe.com/example" target="_blank" 
               style="background-color: #28a745; color: white; text-decoration: none; 
                      font-weight: bold; padding: 8px 16px; border-radius: 4px; 
                      display: inline-block; margin-top: 8px;">
                Pay with Stripe
            </a>
        <? } else if (paymentMethod === "Bank") { ?>
            <p><strong>Bank Details:</strong></p>
            <ul>
                <li>Account Name: <?= companyName ?></li>
                <li>Account Number: <?= accountNumber ?></li>
                <li>Sort Code: <?= sortCode ?></li>
            </ul>
        <? } else { ?>
            <p>Payment details will be provided separately.</p>
        <? } ?>
        
        <center>
            <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Call to Action</a>
        </center>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6c757d;">
        <p style="margin: 0 0 10px 0;">© 2024 ImHereTravels | All rights reserved</p>
        <p style="margin: 0;">You can customize this footer with your company information.</p>
    </div>
</body>
</html>`;

      const newFormData = {
        name: "",
        subject: "",
        content: simpleEmailTemplate,
        status: "draft" as TemplateStatus,
        variables: extractVariables(simpleEmailTemplate),
      };
      console.log("Setting form data for new template:", newFormData);
      setFormData(newFormData);
      setHtmlContent(simpleEmailTemplate);

      // Initialize with some default variable definitions that match the template
      setVariableDefinitions([
        {
          id: "1",
          name: "fullName",
          type: "string",
          description: "Full name of the recipient",
        },
        {
          id: "2",
          name: "paymentMethod",
          type: "string",
          description: "Payment method selected",
        },
        {
          id: "3",
          name: "companyName",
          type: "string",
          description: "Company name for bank details",
        },
        {
          id: "4",
          name: "accountNumber",
          type: "string",
          description: "Bank account number",
        },
        {
          id: "5",
          name: "sortCode",
          type: "string",
          description: "Bank sort code",
        },
      ]);

      // Also set the subject to match the template type
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          subject: "Your Adventure Awaits - Booking Confirmed!",
        }));
      }, 100);
    }

    // Clear validation messages when template changes
    setValidationErrors([]);
    setValidationWarnings([]);
  }, [template]);

  // Auto-validate when content, variable definitions, or form data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Form field validation
      if (!formData.name?.trim()) {
        errors.push("Template name is required");
      } else if (formData.name.length > 100) {
        errors.push("Template name is too long (max 100 characters)");
      }

      if (!formData.subject?.trim()) {
        errors.push("Email subject is required");
      } else if (formData.subject.length > 200) {
        warnings.push(
          "Email subject is quite long (max 200 characters recommended)"
        );
      }

      if (!formData.status) {
        errors.push("Template status is required");
      }

      // Content validation
      if (htmlContent) {
        if (!htmlContent.trim()) {
          errors.push("Template content is required");
        } else {
          // Validate conditional syntax
          const conditionalValidation = validateConditionalSyntax(htmlContent);
          if (!conditionalValidation.isValid) {
            conditionalValidation.errors.forEach((error) =>
              errors.push(`Conditional syntax: ${error}`)
            );
          }

          // Validate variable references
          const undefinedVariables = validateVariableReferences(htmlContent);
          if (undefinedVariables.length > 0) {
            undefinedVariables.forEach((varName) => {
              warnings.push(
                `Variable '${varName}' is used in template but not defined in Variables tab`
              );
            });
          }

          // Test template processing with sample data to catch processScriptLogic errors
          try {
            if (Object.keys(testData).length > 0) {
              const processedData = convertTestDataForProcessing(testData);
              EmailTemplateService.processTemplate(htmlContent, processedData);
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            // Check if this is a processScriptLogic error (TypeError, ReferenceError, etc.)
            const isScriptLogicError =
              errorMessage.includes("Cannot create property") ||
              errorMessage.includes("Cannot set property") ||
              errorMessage.includes("TypeError") ||
              errorMessage.includes("ReferenceError") ||
              errorMessage.includes("Template processing failed") ||
              errorMessage.includes("is not defined") ||
              errorMessage.includes("Cannot read property");

            if (isScriptLogicError) {
              // Extract the specific variable name from ReferenceError messages
              let warningMessage = `Template processing warning: ${errorMessage}`;

              if (errorMessage.includes("is not defined")) {
                const varMatch = errorMessage.match(/(\w+) is not defined/);
                if (varMatch) {
                  const varName = varMatch[1];
                  warningMessage = `Variable '${varName}' is referenced in template but not provided in test data. This will cause rendering issues in the preview.`;
                }
              }

              warnings.push(warningMessage);
            } else {
              // Only treat non-script errors as actual errors
              errors.push(`Template processing error: ${errorMessage}`);
            }
          }

          // HTML structure warnings
          if (
            !htmlContent.includes("<html") &&
            !htmlContent.includes("<!DOCTYPE")
          ) {
            warnings.push("Content doesn't appear to be valid HTML");
          }

          if (!htmlContent.includes("<body")) {
            warnings.push("Content should include a <body> tag");
          }

          if (
            !htmlContent.includes("viewport") &&
            !htmlContent.includes("max-width")
          ) {
            warnings.push(
              "Consider adding responsive design elements for mobile compatibility"
            );
          }
        }
      }

      // Update validation state
      setValidationErrors(errors);
      setValidationWarnings(warnings);
    }, 300); // Faster debounce for form inputs

    return () => clearTimeout(timer);
  }, [
    htmlContent,
    variableDefinitions,
    formData.name,
    formData.subject,
    formData.status,
    testData, // Add testData dependency to re-validate when test data changes
  ]);

  // Calculate preview scale based on container size
  const calculatePreviewScale = (containerWidth: number) => {
    // Use a base email width of 600px, but ensure it scales appropriately
    // The scale will automatically adjust to fit within 430px-630px bounds
    const baseWidth = 600;
    return Math.min(containerWidth / baseWidth, 1);
  };

  // Update preview scale when container size changes
  useEffect(() => {
    const updatePreviewScale = () => {
      const previewContainers = document.querySelectorAll(
        "[data-preview-container]"
      );
      previewContainers.forEach((container) => {
        if (container instanceof HTMLElement) {
          const rect = container.getBoundingClientRect();
          const scale = calculatePreviewScale(rect.width);
          container.style.setProperty("--preview-scale", scale.toString());
        }
      });
    };

    // Initial update
    updatePreviewScale();

    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(updatePreviewScale);
    const previewContainers = document.querySelectorAll(
      "[data-preview-container]"
    );
    previewContainers.forEach((container) => {
      if (container instanceof HTMLElement) {
        resizeObserver.observe(container);
      }
    });

    // Fallback for window resize
    window.addEventListener("resize", updatePreviewScale);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePreviewScale);
    };
  }, [htmlContent, testData]); // Also update when testData changes

  // Function to parse conditional blocks in the template
  const parseConditionalBlocks = (content: string): ConditionalBlock[] => {
    const blocks: ConditionalBlock[] = [];
    const conditionalRegex = /<\? if \(([^)]+)\) \{ \?>/g;
    const endRegex = /<\? \}/g;

    // Find all conditional blocks and their positions
    const conditionalMatches: Array<{
      condition: string;
      startIndex: number;
      matchLength: number;
    }> = [];
    let match;

    while ((match = conditionalRegex.exec(content)) !== null) {
      conditionalMatches.push({
        condition: match[1].trim(),
        startIndex: match.index,
        matchLength: match[0].length,
      });
    }

    // Find end tags and complete blocks
    let endMatch;
    let currentBlockIndex = 0;

    while ((endMatch = endRegex.exec(content)) !== null) {
      if (currentBlockIndex < conditionalMatches.length) {
        const conditionalMatch = conditionalMatches[currentBlockIndex];
        const block: ConditionalBlock = {
          condition: conditionalMatch.condition,
          startIndex: conditionalMatch.startIndex,
          endIndex: endMatch.index,
          content: content.substring(
            conditionalMatch.startIndex + conditionalMatch.matchLength,
            endMatch.index
          ),
        };

        blocks.push(block);
        currentBlockIndex++;
      }
    }

    return blocks;
  };

  // Function to validate conditional syntax
  const validateConditionalSyntax = (
    content: string
  ): { isValid: boolean; errors: string[] } => {
    try {
      const result = EmailTemplateService.validateTemplateSyntax(content);
      return {
        isValid: result.isValid,
        errors: result.errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error}`],
      };
    }
  };

  // Variable definition management functions
  const addVariableDefinition = (type: VariableType = "string") => {
    const newId = Date.now().toString();
    const newVariable: VariableDefinition = {
      id: newId,
      name: "",
      type: type,
    };
    setVariableDefinitions((prev) => [...prev, newVariable]);
  };

  const removeVariableDefinition = (id: string) => {
    setVariableDefinitions((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVariableDefinition = (
    id: string,
    updates: Partial<VariableDefinition>
  ) => {
    setVariableDefinitions((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };

  const addMapField = (
    variableId: string,
    key: string = "",
    type: VariableType = "string"
  ) => {
    setVariableDefinitions((prev) =>
      prev.map((v) => {
        if (v.id === variableId) {
          const newField: VariableDefinition = {
            id: Date.now().toString(),
            name: key,
            type: type,
          };
          return {
            ...v,
            mapFields: {
              ...v.mapFields,
              [key || `field_${Object.keys(v.mapFields || {}).length + 1}`]:
                newField,
            },
          };
        }
        return v;
      })
    );
  };

  const removeMapField = (variableId: string, fieldKey: string) => {
    setVariableDefinitions((prev) =>
      prev.map((v) => {
        if (v.id === variableId && v.mapFields) {
          const newMapFields = { ...v.mapFields };
          delete newMapFields[fieldKey];
          return { ...v, mapFields: newMapFields };
        }
        return v;
      })
    );
  };

  const generateVariableCode = (
    variable: VariableDefinition,
    path: string = ""
  ): string => {
    const fullPath = path ? `${path}.${variable.name}` : variable.name;

    switch (variable.type) {
      case "array":
        return `<?= ${fullPath} ?>`;
      case "map":
        return `<?= ${fullPath} ?>`;
      default:
        return `<?= ${fullPath} ?>`;
    }
  };

  // Function to extract all variable references from template content
  const extractVariableReferences = (content: string): string[] => {
    const references = new Set<string>();
    let currentLoopVariable: string | null = null;

    // First pass: identify loop variables and their scope
    const loopMatches = content.match(/<\?\s*for\s*\([^)]+\)\s*\{\s*\?>/g);
    if (loopMatches) {
      loopMatches.forEach((match) => {
        const loopMatch = match.match(/<\?\s*for\s*\(([^)]+)\)\s*\{\s*\?>/);
        if (loopMatch && loopMatch[1]) {
          const loopExpression = loopMatch[1].trim();

          // Skip generic instructional examples
          if (
            loopExpression.includes("loop") &&
            (loopExpression.includes("{") || loopExpression === "loop")
          ) {
            return;
          }

          // Extract loop variable declaration (e.g., "let i = 0" -> "i")
          const loopVarMatch = loopExpression.match(
            /^(?:let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/
          );
          const loopVarName = loopVarMatch ? loopVarMatch[1] : null;

          if (loopVarName) {
            // Skip common loop variables
            if (
              ![
                "i",
                "j",
                "k",
                "index",
                "idx",
                "counter",
                "count",
                "n",
                "num",
              ].includes(loopVarName)
            ) {
              references.add(loopVarName);
            } else {
              currentLoopVariable = loopVarName; // Track the current loop variable
            }
          }

          // Extract other variables from the loop expression, excluding loop variables
          const variables = loopExpression.match(
            /\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g
          );
          if (variables) {
            variables.forEach((variable) => {
              // Skip loop variables, keywords, and common loop patterns
              if (
                variable &&
                variable !== loopVarName && // Skip the actual loop variable
                ![
                  "let",
                  "const",
                  "var",
                  "i",
                  "j",
                  "k",
                  "index",
                  "idx",
                  "counter",
                  "count",
                  "n",
                  "num",
                  "item",
                  "of",
                  "in",
                  "length",
                  "loop", // Skip the instructional example
                ].includes(variable)
              ) {
                const rootVar = variable.split(".")[0];
                references.add(rootVar);
              }
            });
          }
        }
      });
    }

    // Extract variables from <?= variable ?> tags, but be smarter about loop context
    const outputMatches = content.match(/<\?\s*=\s*([^?]+)\s*\?>/g);
    if (outputMatches) {
      outputMatches.forEach((match) => {
        const varMatch = match.match(/<\?\s*=\s*([^?]+)\s*\?>/);
        if (varMatch && varMatch[1]) {
          const expression = varMatch[1].trim();

          // Skip generic instructional examples
          if (
            expression === "variable" ||
            expression === "example" ||
            expression === "placeholder"
          ) {
            return;
          }

          // Extract simple variable names and object property access
          const variables = expression.match(
            /\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g
          );
          if (variables) {
            variables.forEach((variable) => {
              if (variable) {
                // Get the root variable name (before any dot notation)
                const rootVar = variable.split(".")[0];

                // Skip if this is a loop variable (like 'i' in 'terms[i]')
                if (currentLoopVariable && rootVar === currentLoopVariable) {
                  return;
                }

                // Skip common loop variables in any context
                if (
                  [
                    "i",
                    "j",
                    "k",
                    "index",
                    "idx",
                    "counter",
                    "count",
                    "n",
                    "num",
                  ].includes(rootVar)
                ) {
                  return;
                }

                references.add(rootVar);
              }
            });
          }
        }
      });
    }

    // Extract variables from conditional statements with structural analysis
    const conditionalMatches = content.match(
      /<\?\s*if\s*\([^)]+\)\s*\{\s*\?>/g
    );
    if (conditionalMatches) {
      conditionalMatches.forEach((match) => {
        const condMatch = match.match(/<\?\s*if\s*\(([^)]+)\)\s*\{\s*\?>/);
        if (condMatch && condMatch[1]) {
          const condition = condMatch[1].trim();

          // Skip generic instructional examples
          if (
            condition === "condition" ||
            condition === "example" ||
            condition === "placeholder"
          ) {
            return;
          }

          // Split by logical operators to analyze each comparison separately
          const comparisons = condition.split(/\s+(?:&&|\|\|)\s+/);

          comparisons.forEach((comparison) => {
            const trimmedComparison = comparison.trim();

            // Look for patterns like: variable === "string" or variable !== "string"
            const comparisonMatch = trimmedComparison.match(
              /^([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*(===|!==|==|!=)\s*["'][^"']*["']$/
            );

            if (comparisonMatch) {
              // Valid comparison pattern found - only add the variable part, not the string literal
              const variable = comparisonMatch[1];
              const rootVar = variable.split(".")[0];

              // Skip JavaScript keywords and common loop variables
              if (
                rootVar &&
                ![
                  "true",
                  "false",
                  "null",
                  "undefined",
                  "let",
                  "const",
                  "var",
                  "if",
                  "else",
                  "for",
                  "while",
                  "i",
                  "j",
                  "k",
                  "index",
                  "idx",
                  "counter",
                  "count",
                  "n",
                  "num",
                  "length",
                  "item",
                  "element",
                  "key",
                  "value",
                  "prop",
                  "property",
                  "of",
                  "in",
                  "loop",
                ].includes(rootVar)
              ) {
                references.add(rootVar);
              }
            } else {
              // For more complex conditions, extract variables more carefully
              // Remove string literals first to avoid false positives
              let cleanComparison = trimmedComparison;
              cleanComparison = cleanComparison.replace(/"[^"]*"/g, "");
              cleanComparison = cleanComparison.replace(/'[^']*'/g, "");

              const variables = cleanComparison.match(
                /\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g
              );
              if (variables) {
                variables.forEach((variable) => {
                  const rootVar = variable.split(".")[0];

                  // Skip JavaScript keywords, operators, and common loop variables
                  if (
                    rootVar &&
                    ![
                      "true",
                      "false",
                      "null",
                      "undefined",
                      "let",
                      "const",
                      "var",
                      "if",
                      "else",
                      "for",
                      "while",
                      "i",
                      "j",
                      "k",
                      "index",
                      "idx",
                      "counter",
                      "count",
                      "n",
                      "num",
                      "length",
                      "item",
                      "element",
                      "key",
                      "value",
                      "prop",
                      "property",
                      "of",
                      "in",
                      "loop",
                    ].includes(rootVar)
                  ) {
                    references.add(rootVar);
                  }
                });
              }
            }
          });
        }
      });
    }

    return Array.from(references);
  };

  // Function to validate variable references against definitions
  const validateVariableReferences = (content: string): string[] => {
    const referencedVariables = extractVariableReferences(content);
    const definedVariableNames = variableDefinitions.map((def) => def.name);

    const undefinedVariables = referencedVariables.filter(
      (varName) =>
        !definedVariableNames.includes(varName) && varName.trim() !== ""
    );

    return undefinedVariables;
  };

  const validateTemplate = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!formData.name?.trim()) {
      errors.push("Template name is required");
    }
    if (!formData.subject?.trim()) {
      errors.push("Email subject is required");
    }
    if (!htmlContent?.trim()) {
      errors.push("Template content is required");
    }

    // Content validation
    if (htmlContent) {
      // Check for basic HTML structure
      if (
        !htmlContent.includes("<html") &&
        !htmlContent.includes("<!DOCTYPE")
      ) {
        warnings.push("Content doesn't appear to be valid HTML");
      }

      // Check for common email template elements
      if (!htmlContent.includes("<body")) {
        warnings.push("Content should include a <body> tag");
      }

      // Check for responsive design
      if (
        !htmlContent.includes("viewport") &&
        !htmlContent.includes("max-width")
      ) {
        warnings.push(
          "Consider adding responsive design elements for mobile compatibility"
        );
      }

      // Validate conditional syntax
      const conditionalValidation = validateConditionalSyntax(htmlContent);
      if (!conditionalValidation.isValid) {
        conditionalValidation.errors.forEach((error) =>
          errors.push(`Conditional syntax: ${error}`)
        );
      }

      // Validate variable references - NEW VALIDATION
      const undefinedVariables = validateVariableReferences(htmlContent);
      if (undefinedVariables.length > 0) {
        undefinedVariables.forEach((varName) => {
          warnings.push(
            `Variable '${varName}' is used in template but not defined in Variables tab`
          );
        });
      }

      // Test template processing with sample data to catch processScriptLogic errors
      try {
        if (Object.keys(testData).length > 0) {
          const processedData = convertTestDataForProcessing(testData);
          EmailTemplateService.processTemplate(htmlContent, processedData);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check if this is a processScriptLogic error (TypeError, ReferenceError, etc.)
        const isScriptLogicError =
          errorMessage.includes("Cannot create property") ||
          errorMessage.includes("Cannot set property") ||
          errorMessage.includes("TypeError") ||
          errorMessage.includes("ReferenceError") ||
          errorMessage.includes("Template processing failed") ||
          errorMessage.includes("is not defined") ||
          errorMessage.includes("Cannot read property");

        if (isScriptLogicError) {
          // Extract the specific variable name from ReferenceError messages
          let warningMessage = `Template processing warning: ${errorMessage}`;

          if (errorMessage.includes("is not defined")) {
            const varMatch = errorMessage.match(/(\w+) is not defined/);
            if (varMatch) {
              const varName = varMatch[1];
              warningMessage = `Variable '${varName}' is referenced in template but not provided in test data. This will cause rendering issues in the preview.`;
            }
          }

          warnings.push(warningMessage);
        } else {
          // Only treat non-script errors as actual errors
          errors.push(`Template processing error: ${errorMessage}`);
        }
      }
    }

    // Name length validation
    if (formData.name && formData.name.length > 100) {
      errors.push("Template name is too long (max 100 characters)");
    }

    // Subject length validation
    if (formData.subject && formData.subject.length > 200) {
      warnings.push(
        "Email subject is quite long (max 200 characters recommended)"
      );
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);

    return errors.length === 0;
  };

  const handleSaveTemplate = () => {
    if (!validateTemplate()) {
      toast({
        title: "Validation Failed",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    // Debug logging
    console.log("Form data:", formData);
    console.log("Original template:", template);
    console.log("Original template ID:", template?.id);
    console.log("Original template ID length:", template?.id?.length);

    const templateData: CommunicationTemplate = {
      id: template?.id || "", // Don't assign temporary ID for new templates
      name: formData.name,
      subject: formData.subject,
      content: htmlContent,
      variables: extractVariables(htmlContent),
      variableDefinitions: variableDefinitions, // Include variable definitions
      status: formData.status,
      bccGroups: template?.bccGroups || [],
      metadata: {
        createdAt:
          template?.metadata?.createdAt instanceof Timestamp
            ? template.metadata.createdAt
            : Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: template?.metadata?.createdBy || "current-user", // TODO: Get actual user ID
        usedCount: template?.metadata?.usedCount || 0,
      },
    };

    console.log("Template data being created:", templateData);
    console.log("Template data ID:", templateData.id);
    console.log("Template data ID length:", templateData.id?.length);

    // Show warnings if any
    if (validationWarnings.length > 0) {
      toast({
        title: "Template Saved with Warnings",
        description: `Template saved successfully. ${validationWarnings.length} warning(s) found.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Template Saved",
        description: "Template saved successfully",
      });
    }

    onSave(templateData);
  };

  const extractVariables = (content: string): string[] => {
    return EmailTemplateService.extractTemplateVariables(content);
  };

  const handleBeautifyCode = () => {
    const beautified = beautifyHTML(htmlContent);
    setHtmlContent(beautified);
  };

  const insertVariable = (variable: string) => {
    setHtmlContent((prev) => prev + variable);
  };

  // Navigate to variable location in code
  const navigateToVariable = (variable: string) => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      const variableIndex = content.indexOf(variable);

      if (variableIndex !== -1) {
        // Calculate line number from character index
        const lines = content.substring(0, variableIndex).split("\n");
        const lineNumber = lines.length;

        // Set cursor position and scroll to the line
        editorRef.current.revealLineInCenter(lineNumber);
        editorRef.current.setPosition({
          lineNumber: lineNumber,
          column: lines[lines.length - 1].length + 1,
        });

        // Focus the editor
        editorRef.current.focus();
      }
    }
  };

  // Keyboard shortcuts for zoom (only affects code editor)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "=":
          case "+":
            e.preventDefault();
            setCodeEditorZoom((prev) => Math.min(2, prev + 0.1));
            break;
          case "-":
            e.preventDefault();
            setCodeEditorZoom((prev) => Math.max(0.5, prev - 0.1));
            break;
          case "0":
            e.preventDefault();
            setCodeEditorZoom(1);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs/editor/editor.main.css"
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {template
                    ? "Edit Email Template"
                    : "Create New Email Template"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  Design your email template with our advanced editor. Use
                  variables to personalize content and conditional rendering for
                  dynamic content.
                </DialogDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button variant="outline" size="sm">
                  <Code className="mr-2 h-4 w-4" />
                  View Code
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Validation Messages */}
          {(validationErrors.length > 0 || validationWarnings.length > 0) && (
            <div className="mb-4 space-y-2">
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-red-600 text-sm"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              ))}
              {validationWarnings.map((warning, index) => {
                // Check if this is an undefined variable warning
                const undefinedVarMatch = warning.match(
                  /Variable '(.+)' is used in template but not defined/
                );
                const variableName = undefinedVarMatch
                  ? undefinedVarMatch[1]
                  : null;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between text-yellow-600 text-sm bg-yellow-50 p-2 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{warning}</span>
                    </div>
                    {variableName && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Add the undefined variable as a new string variable
                          const newId = Date.now().toString();
                          const newVariable: VariableDefinition = {
                            id: newId,
                            name: variableName,
                            type: "string",
                            description: `Auto-generated from template usage`,
                          };
                          setVariableDefinitions((prev) => [
                            ...prev,
                            newVariable,
                          ]);
                          // Switch to variables tab
                          setRightSidebarTab("variables");
                        }}
                        className="h-6 px-2 text-xs text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100"
                      >
                        + Define
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-4 max-h-[calc(90vh-200px)] overflow-auto">
            <div className="grid grid-cols-10 gap-4 h-[600px]">
              {/* Left Side - Editor (70%) */}
              <div className="col-span-7 space-y-3">
                {/* Editor Controls */}
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={editorView === "split" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditorView("split")}
                      className="h-8 px-3"
                    >
                      <Code className="mr-2 h-3 w-3" />
                      Split
                    </Button>
                    <Button
                      variant={editorView === "code" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditorView("code")}
                      className="h-8 px-3"
                    >
                      <Code className="mr-2 h-3 w-3" />
                      Code
                    </Button>
                    <Button
                      variant={editorView === "preview" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditorView("preview")}
                      className="h-8 px-3"
                    >
                      <Eye className="mr-2 h-3 w-3" />
                      Preview
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBeautifyCode}
                      className="h-8 px-3"
                    >
                      <Palette className="mr-2 h-4 w-4" />
                      Format
                    </Button>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const imageUrl = URL.createObjectURL(file);
                          const imageTag = `<img src="${imageUrl}" alt="${file.name}" style="max-width: 100%; height: auto;">`;
                          setHtmlContent((prev) => prev + "\n" + imageTag);
                        }
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingImage}
                        className="h-8 px-3"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Image
                      </Button>
                    </Label>
                  </div>
                </div>

                {/* Editor */}
                <div
                  className="border rounded-lg overflow-hidden bg-white flex-1"
                  style={{ minHeight: 0 }}
                >
                  {editorView === "split" && (
                    <div className="grid grid-cols-2 divide-x h-[500px] min-h-0">
                      <div className="flex flex-col h-full min-h-0">
                        <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <span>HTML Code</span>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setCodeEditorZoom((prev) =>
                                    Math.max(0.5, prev - 0.1)
                                  )
                                }
                                className="h-6 w-6 p-0 text-xs"
                                title="Zoom Out (Ctrl/Cmd + -)"
                              >
                                -
                              </Button>
                              <span className="text-xs min-w-[3rem] text-center">
                                {Math.round(codeEditorZoom * 100)}%
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setCodeEditorZoom((prev) =>
                                    Math.min(2, prev + 0.1)
                                  )
                                }
                                className="h-6 w-6 p-0 text-xs"
                                title="Zoom In (Ctrl/Cmd + +)"
                              >
                                +
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCodeEditorZoom(1)}
                                className="h-6 px-2 text-xs"
                                title="Reset Zoom (Ctrl/Cmd + 0)"
                              >
                                Reset
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div
                          className="flex-1 min-h-0 relative overflow-hidden"
                          style={{ minHeight: 0 }}
                        >
                          <MonacoEditor
                            value={htmlContent}
                            onChange={setHtmlContent}
                            language="html"
                            height="100%"
                            zoomLevel={codeEditorZoom}
                            onEditorReady={(editor) => {
                              editorRef.current = editor;
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col h-full min-h-0">
                        <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <span>
                              Live Preview
                              {Object.keys(testData).length > 0 && (
                                <span className="text-green-600 ml-2">
                                  (with test data)
                                </span>
                              )}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPreviewZoom((prev) =>
                                    Math.max(0.5, prev - 0.1)
                                  )
                                }
                                className="h-6 w-6 p-0 text-xs"
                                title="Zoom Out"
                              >
                                -
                              </Button>
                              <span className="text-xs min-w-[3rem] text-center">
                                {Math.round(previewZoom * 100)}%
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPreviewZoom((prev) =>
                                    Math.min(2, prev + 0.1)
                                  )
                                }
                                className="h-6 w-6 p-0 text-xs"
                                title="Zoom In"
                              >
                                +
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewZoom(1)}
                                className="h-6 px-2 text-xs"
                                title="Reset Zoom"
                              >
                                Reset
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 p-4 overflow-auto bg-gray-50 min-h-0">
                          <div
                            className="w-full max-w-2xl mx-auto"
                            data-preview-container
                          >
                            <div
                              className="bg-white rounded shadow-sm"
                              style={{
                                transform: `scale(calc(var(--preview-scale, 1) * ${previewZoom}))`,
                                transformOrigin:
                                  previewZoom < 1 ? "top left" : "top left",
                                width: "600px",
                                height: "750px",
                                // maxWidth: "100%",
                                // maxHeight: "100%",
                                marginBottom: `${Math.max(
                                  0,
                                  (previewZoom - 1) * 750
                                )}px`,
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{
                                  __html:
                                    Object.keys(testData).length > 0
                                      ? EmailTemplateService.processTemplate(
                                          htmlContent,
                                          convertTestDataForProcessing(testData)
                                        )
                                      : htmlContent,
                                }}
                                className="w-full h-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {editorView === "code" && (
                    <div className="flex flex-col h-[500px] min-h-0">
                      <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <span>HTML Code Editor</span>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCodeEditorZoom((prev) =>
                                  Math.max(0.5, prev - 0.1)
                                )
                              }
                              className="h-6 w-6 p-0 text-xs"
                              title="Zoom Out (Ctrl/Cmd + -)"
                            >
                              -
                            </Button>
                            <span className="text-xs min-w-[3rem] text-center">
                              {Math.round(codeEditorZoom * 100)}%
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCodeEditorZoom((prev) =>
                                  Math.min(2, prev + 0.1)
                                )
                              }
                              className="h-6 w-6 p-0 text-xs"
                              title="Zoom In (Ctrl/Cmd + +)"
                            >
                              +
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCodeEditorZoom(1)}
                              className="h-6 px-2 text-xs"
                              title="Reset Zoom (Ctrl/Cmd + 0)"
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div
                        className="flex-1 min-h-0 relative overflow-hidden"
                        style={{ minHeight: 0 }}
                      >
                        <MonacoEditor
                          value={htmlContent}
                          onChange={setHtmlContent}
                          language="html"
                          height="100%"
                          zoomLevel={codeEditorZoom}
                          onEditorReady={(editor) => {
                            editorRef.current = editor;
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {editorView === "preview" && (
                    <div className="flex flex-col h-[500px]">
                      <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <span>
                            Live Preview
                            {Object.keys(testData).length > 0 && (
                              <span className="text-green-600 ml-2">
                                (with test data)
                              </span>
                            )}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPreviewZoom((prev) =>
                                  Math.max(0.5, prev - 0.1)
                                )
                              }
                              className="h-6 w-6 p-0 text-xs"
                              title="Zoom Out"
                            >
                              -
                            </Button>
                            <span className="text-xs min-w-[3rem] text-center">
                              {Math.round(previewZoom * 100)}%
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPreviewZoom((prev) =>
                                  Math.min(2, prev + 0.1)
                                )
                              }
                              className="h-6 w-6 p-0 text-xs"
                              title="Zoom In"
                            >
                              +
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewZoom(1)}
                              className="h-6 px-2 text-xs"
                              title="Reset Zoom"
                            >
                              Reset
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 p-4 overflow-auto bg-gray-50 min-h-0">
                        <div
                          className="w-full max-w-2xl mx-auto"
                          data-preview-container
                        >
                          <div
                            className="bg-white rounded shadow-sm overflow-hidden"
                            style={{
                              transform: `scale(calc(var(--preview-scale, 1) * ${previewZoom}))`,
                              transformOrigin:
                                previewZoom < 1 ? "top center" : "top left",
                              width: "600px",
                              height: "750px",
                              maxWidth: "100%",
                              maxHeight: "100%",
                              marginBottom: `${Math.max(
                                0,
                                (previewZoom - 1) * 750
                              )}px`,
                            }}
                          >
                            {(() => {
                              try {
                                if (Object.keys(testData).length > 0) {
                                  const processedData =
                                    convertTestDataForProcessing(testData);

                                  // Log the processed data for debugging
                                  console.log(
                                    "Live Preview - Original test data:",
                                    testData
                                  );
                                  console.log(
                                    "Live Preview - Processed test data:",
                                    processedData
                                  );

                                  const processedHtml =
                                    EmailTemplateService.processTemplate(
                                      htmlContent,
                                      processedData
                                    );

                                  return (
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: processedHtml,
                                      }}
                                      className="w-full h-full"
                                    />
                                  );
                                } else {
                                  return (
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: htmlContent,
                                      }}
                                      className="w-full h-full"
                                    />
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "Error processing template:",
                                  error
                                );

                                // Check if this is a processScriptLogic error
                                const errorMessage =
                                  error instanceof Error
                                    ? error.message
                                    : String(error);
                                const isScriptLogicError =
                                  errorMessage.includes(
                                    "Cannot create property"
                                  ) ||
                                  errorMessage.includes(
                                    "Cannot set property"
                                  ) ||
                                  errorMessage.includes("TypeError") ||
                                  errorMessage.includes("ReferenceError") ||
                                  errorMessage.includes(
                                    "Template processing failed"
                                  ) ||
                                  errorMessage.includes("is not defined") ||
                                  errorMessage.includes("Cannot read property");

                                if (isScriptLogicError) {
                                  // Show as a warning instead of blocking error
                                  return (
                                    <div className="w-full h-full p-4 bg-amber-50 border border-amber-200 rounded">
                                      <div className="text-amber-800">
                                        <h3 className="font-semibold text-lg mb-2">
                                          Template Processing Warning
                                        </h3>
                                        <p className="text-sm mb-2">
                                          The template has a processing warning
                                          but can still be saved. This usually
                                          indicates a data type mismatch or
                                          undefined variable.
                                        </p>
                                        <div className="bg-amber-100 p-3 rounded text-xs font-mono">
                                          {errorMessage.includes(
                                            "is not defined"
                                          )
                                            ? (() => {
                                                const varMatch =
                                                  errorMessage.match(
                                                    /(\w+) is not defined/
                                                  );
                                                if (varMatch) {
                                                  const varName = varMatch[1];
                                                  return `Variable '${varName}' is referenced in template but not provided in test data.`;
                                                }
                                                return errorMessage;
                                              })()
                                            : errorMessage}
                                        </div>
                                        <p className="text-sm mt-2 text-amber-600">
                                          {errorMessage.includes(
                                            "is not defined"
                                          )
                                            ? "Add this variable to your test data or define it in the Variables tab."
                                            : "Check the Variables tab to ensure all variables are properly defined with correct types."}
                                        </p>
                                        <div className="mt-3 p-2 bg-white rounded border border-amber-300">
                                          <p className="text-xs text-amber-700">
                                            <strong>Note:</strong> This warning
                                            won't prevent you from saving the
                                            template, but the preview may not
                                            render correctly until resolved.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  // Show as a blocking error for non-script issues
                                  return (
                                    <div className="w-full h-full p-4 bg-red-50 border border-red-200 rounded">
                                      <div className="text-red-800">
                                        <h3 className="font-semibold text-lg mb-2">
                                          Template Processing Error
                                        </h3>
                                        <p className="text-sm mb-2">
                                          An error occurred while processing the
                                          template with test data:
                                        </p>
                                        <div className="bg-red-100 p-3 rounded text-xs font-mono">
                                          {errorMessage}
                                        </div>
                                        <p className="text-sm mt-2 text-red-600">
                                          Check the console for more details and
                                          ensure all required variables are
                                          defined.
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Tabbed Interface (30%) */}
              <div className="col-span-3 max-h-full overflow-y-auto">
                {/* Tab Navigation */}
                <div className="flex border-b mb-3">
                  <button
                    onClick={() => setRightSidebarTab("info")}
                    className={`px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
                      rightSidebarTab === "info"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Info
                  </button>
                  <button
                    onClick={() => setRightSidebarTab("variables")}
                    className={`px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
                      rightSidebarTab === "variables"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Variables
                  </button>
                  <button
                    onClick={() => setRightSidebarTab("tools")}
                    className={`px-2 py-2 text-xs font-medium border-b-2 transition-colors ${
                      rightSidebarTab === "tools"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Test Data
                  </button>
                </div>

                {/* Tab Content */}
                {rightSidebarTab === "info" && (
                  <div className="space-y-3">
                    {/* Basic Info */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
                        Template Information
                      </h3>

                      {/* Real-time Validation Summary */}
                      <div className="bg-gray-50 p-2 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">
                            Form Status:
                          </span>
                          <div className="flex items-center space-x-2">
                            {validationErrors.length > 0 && (
                              <span className="flex items-center text-red-600">
                                <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                                {validationErrors.length} error
                                {validationErrors.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {validationWarnings.length > 0 && (
                              <span className="flex items-center text-yellow-600">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                                {validationWarnings.length} warning
                                {validationWarnings.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {validationErrors.length === 0 &&
                              validationWarnings.length === 0 && (
                                <span className="flex items-center text-green-600">
                                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                  All good!
                                </span>
                              )}
                          </div>
                        </div>
                        <div className="text-gray-600">
                          {formData.name
                            ? `${formData.name.length}/100`
                            : "0/100"}{" "}
                          name •
                          {formData.subject
                            ? `${formData.subject.length}/200`
                            : "0/200"}{" "}
                          subject •{formData.status || "No status"}
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="template-name"
                          className="text-xs font-medium"
                        >
                          Template Name
                        </Label>
                        <Input
                          id="template-name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Template name"
                          className={`mt-1 h-8 text-xs ${
                            validationErrors.some((error) =>
                              error.includes("Template name")
                            )
                              ? "border-red-500 focus:border-red-500"
                              : formData.name && formData.name.length > 80
                              ? "border-yellow-500 focus:border-yellow-500"
                              : ""
                          }`}
                        />
                        {formData.name && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {formData.name.length}/100 characters
                            </span>
                            {formData.name.length > 80 && (
                              <span className="text-xs text-yellow-600">
                                Getting long
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor="template-status"
                          className="text-xs font-medium"
                        >
                          Status
                        </Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: TemplateStatus) =>
                            setFormData((prev) => ({ ...prev, status: value }))
                          }
                        >
                          <SelectTrigger
                            className={`mt-1 h-8 text-xs ${
                              validationErrors.some((error) =>
                                error.includes("Template status")
                              )
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {templateStatuses.map((status) => (
                              <SelectItem
                                key={status.value}
                                value={status.value}
                              >
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="template-subject"
                          className="text-xs font-medium"
                        >
                          Email Subject
                        </Label>
                        <Input
                          id="template-subject"
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              subject: e.target.value,
                            }))
                          }
                          placeholder="Email subject"
                          className={`mt-1 h-8 text-xs ${
                            validationErrors.some((error) =>
                              error.includes("Email subject")
                            )
                              ? "border-red-500 focus:border-red-500"
                              : formData.subject &&
                                formData.subject.length > 150
                              ? "border-yellow-500 focus:border-yellow-500"
                              : ""
                          }`}
                        />
                        {formData.subject && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {formData.subject.length}/200 characters
                            </span>
                            {formData.subject.length > 150 && (
                              <span className="text-xs text-yellow-600">
                                Subject getting long
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Template Variables */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
                        Template Variables
                      </h3>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <Label className="text-xs font-medium mb-2 block">
                          Variables Found in Code
                        </Label>
                        <div className="flex flex-wrap gap-1">
                          {extractVariables(htmlContent).map((variable) => (
                            <Badge
                              key={variable}
                              variant="secondary"
                              className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors text-xs px-1 py-0"
                              onClick={() => navigateToVariable(variable)}
                              title={`Click to go to ${variable} in code`}
                            >
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {rightSidebarTab === "variables" && (
                  <div className="space-y-3">
                    {/* Variable Definition Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">
                          Define Variables
                        </h3>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addVariableDefinition("string")}
                            className="h-6 px-2 text-xs"
                          >
                            + String
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addVariableDefinition("array")}
                            className="h-6 px-2 text-xs"
                          >
                            + Array
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addVariableDefinition("map")}
                            className="h-6 px-2 text-xs"
                          >
                            + Map
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Define your template variables with types, similar to
                        Firestore collections
                      </div>
                    </div>

                    {/* Variable Usage Summary */}
                    {variableDefinitions.length > 0 && (
                      <div className="bg-gray-50 p-2 rounded-lg text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">
                            Usage Status:
                          </span>
                          <div className="flex space-x-2">
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                              Used
                            </span>
                            <span className="flex items-center">
                              <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                              Unused
                            </span>
                          </div>
                        </div>
                        <div className="text-gray-600">
                          {extractVariableReferences(htmlContent).length}{" "}
                          variables referenced in template
                        </div>
                      </div>
                    )}

                    {/* Variable Definitions List */}
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {variableDefinitions.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-xs">
                          No variables defined yet.
                          <br />
                          Click above to add your first variable.
                        </div>
                      ) : (
                        variableDefinitions.map((variable, index) => {
                          const isUsed = extractVariableReferences(
                            htmlContent
                          ).includes(variable.name);
                          return (
                            <div key={variable.id} className="relative">
                              {/* Usage indicator */}
                              <div
                                className={`absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${
                                  isUsed ? "bg-green-500" : "bg-gray-400"
                                }`}
                              ></div>
                              <div className="pl-2">
                                <VariableDefinitionItem
                                  variable={variable}
                                  index={index}
                                  onUpdate={(updates) =>
                                    updateVariableDefinition(
                                      variable.id,
                                      updates
                                    )
                                  }
                                  onRemove={() =>
                                    removeVariableDefinition(variable.id)
                                  }
                                  onAddMapField={(key, type) =>
                                    addMapField(variable.id, key, type)
                                  }
                                  onRemoveMapField={(key) =>
                                    removeMapField(variable.id, key)
                                  }
                                  onInsert={() => {
                                    const code = generateVariableCode(variable);
                                    insertVariable(code);
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {rightSidebarTab === "tools" && (
                  <div className="space-y-3">
                    {/* Test Data Header */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
                        Test Your Template
                      </h3>
                      <div className="text-xs text-gray-500">
                        Enter sample values to preview how your template will
                        render
                      </div>
                      {Object.keys(testData).length > 0 && (
                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                          ✓ Live Preview is showing template with test data
                          <div className="mt-1 text-gray-600">
                            {Object.entries(testData)
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}:{" "}
                                  {Array.isArray(value)
                                    ? `[${value.join(", ")}]`
                                    : String(value)}
                                </span>
                              ))}
                            {Object.keys(testData).length > 3 && (
                              <span className="text-gray-500">
                                +{Object.keys(testData).length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show missing variables warning */}
                      {(() => {
                        const allTemplateVariables =
                          extractAllTemplateVariables(htmlContent);
                        const missingVariables = allTemplateVariables.filter(
                          (varName) => !(varName in testData)
                        );

                        if (missingVariables.length > 0) {
                          return (
                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                              ⚠️ Missing variables in test data:
                              <div className="mt-1 text-amber-700">
                                {missingVariables.map((varName) => (
                                  <span key={varName} className="mr-2">
                                    {varName}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-1 text-amber-600">
                                These variables will be treated as empty strings
                                in the preview.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Test Data Form */}
                    {variableDefinitions.length > 0 ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <Label className="text-xs font-medium mb-2 block text-blue-700">
                            Sample Values
                          </Label>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {variableDefinitions.map((variable) => (
                              <div key={variable.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-gray-700">
                                    {variable.name}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      variable.type === "string"
                                        ? "bg-blue-100 text-blue-600"
                                        : variable.type === "array"
                                        ? "bg-orange-100 text-orange-600"
                                        : variable.type === "map"
                                        ? "bg-red-100 text-red-600"
                                        : variable.type === "number"
                                        ? "bg-green-100 text-green-600"
                                        : "bg-purple-100 text-purple-600"
                                    }`}
                                  >
                                    {variable.type}
                                  </span>
                                </div>

                                {variable.type === "string" && (
                                  <Input
                                    placeholder={`Enter ${variable.name}...`}
                                    className="h-6 text-xs"
                                    value={testData[variable.name] || ""}
                                    onChange={(e) => {
                                      // Store test data in state
                                      setTestData((prev) => ({
                                        ...prev,
                                        [variable.name]: e.target.value,
                                      }));
                                    }}
                                  />
                                )}

                                {variable.type === "number" && (
                                  <Input
                                    type="number"
                                    placeholder={`Enter ${variable.name}...`}
                                    className="h-6 text-xs"
                                    value={testData[variable.name] || ""}
                                    onChange={(e) => {
                                      setTestData((prev) => ({
                                        ...prev,
                                        [variable.name]: Number(e.target.value),
                                      }));
                                    }}
                                  />
                                )}

                                {variable.type === "boolean" && (
                                  <Select
                                    value={
                                      testData[variable.name] !== undefined
                                        ? String(testData[variable.name])
                                        : ""
                                    }
                                    onValueChange={(value) => {
                                      setTestData((prev) => ({
                                        ...prev,
                                        [variable.name]: value === "true",
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="h-6 text-xs">
                                      <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">True</SelectItem>
                                      <SelectItem value="false">
                                        False
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}

                                {variable.type === "array" && (
                                  <div className="space-y-1">
                                    <textarea
                                      placeholder="Enter Python array syntax, e.g., ['apple', 'banana', 'orange']"
                                      className="h-16 text-xs p-2 border rounded resize-none bg-black text-white font-mono"
                                      value={(() => {
                                        const value = testData[variable.name];
                                        if (Array.isArray(value)) {
                                          return JSON.stringify(value);
                                        } else if (
                                          typeof value === "string" &&
                                          value
                                        ) {
                                          return value;
                                        }
                                        return "";
                                      })()}
                                      onChange={(e) => {
                                        const input = e.target.value;
                                        setTestData((prev) => ({
                                          ...prev,
                                          [variable.name]: input,
                                        }));
                                      }}
                                      onBlur={(e) => {
                                        // Parse the input when user finishes typing
                                        try {
                                          const input = e.target.value.trim();
                                          if (
                                            input.startsWith("[") &&
                                            input.endsWith("]")
                                          ) {
                                            // Remove brackets and split by comma, handling quotes
                                            const content = input.slice(1, -1);
                                            const values = content
                                              .split(",")
                                              .map((v) =>
                                                v
                                                  .trim()
                                                  .replace(/^["']|["']$/g, "")
                                              )
                                              .filter((v) => v);

                                            // Validate that we have a proper array
                                            if (Array.isArray(values)) {
                                              setTestData((prev) => ({
                                                ...prev,
                                                [variable.name]: values,
                                              }));
                                            } else {
                                              throw new Error(
                                                "Invalid array format"
                                              );
                                            }
                                          }
                                        } catch (error) {
                                          // Keep the raw input if parsing fails
                                          console.log(
                                            "Array parsing failed, keeping raw input"
                                          );
                                          // Show error to user
                                          toast({
                                            title: "Invalid Array Format",
                                            description:
                                              "Please use valid Python array syntax like ['item1', 'item2']",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    />
                                    <div className="text-xs text-gray-500">
                                      Use Python syntax: start with [ and end
                                      with ]
                                    </div>
                                  </div>
                                )}

                                {variable.type === "map" && (
                                  <div className="space-y-1">
                                    <textarea
                                      placeholder="Enter Python dict syntax, e.g., {'name': 'John', 'age': 30}"
                                      className="h-16 text-xs p-2 border rounded resize-none bg-black text-white font-mono"
                                      value={(() => {
                                        const value = testData[variable.name];
                                        if (
                                          typeof value === "string" &&
                                          value
                                        ) {
                                          return value;
                                        } else if (
                                          variable.mapFields &&
                                          Object.keys(variable.mapFields)
                                            .length > 0
                                        ) {
                                          // Build object from individual field values for display
                                          const obj: any = {};
                                          Object.keys(
                                            variable.mapFields
                                          ).forEach((key) => {
                                            const fieldValue =
                                              testData[
                                                `${variable.name}.${key}`
                                              ];
                                            if (fieldValue !== undefined) {
                                              obj[key] = fieldValue;
                                            }
                                          });
                                          return Object.keys(obj).length > 0
                                            ? JSON.stringify(obj)
                                            : "";
                                        }
                                        return "";
                                      })()}
                                      onChange={(e) => {
                                        const input = e.target.value;
                                        setTestData((prev) => ({
                                          ...prev,
                                          [variable.name]: input,
                                        }));
                                      }}
                                      onBlur={(e) => {
                                        // Parse the input when user finishes typing
                                        try {
                                          const input = e.target.value.trim();
                                          if (
                                            input.startsWith("{") &&
                                            input.endsWith("}")
                                          ) {
                                            // Try to parse as JSON (Python dict syntax is similar)
                                            const content = input.replace(
                                              /'/g,
                                              '"'
                                            ); // Replace single quotes with double quotes
                                            const parsed = JSON.parse(content);

                                            // Validate that we have a proper object
                                            if (
                                              typeof parsed === "object" &&
                                              parsed !== null &&
                                              !Array.isArray(parsed)
                                            ) {
                                              // Update test data with parsed values
                                              Object.entries(parsed).forEach(
                                                ([key, value]) => {
                                                  setTestData((prev) => ({
                                                    ...prev,
                                                    [`${variable.name}.${key}`]:
                                                      value,
                                                  }));
                                                }
                                              );

                                              // Also store the original parsed object for direct access
                                              setTestData((prev) => ({
                                                ...prev,
                                                [variable.name]: parsed,
                                              }));
                                            } else {
                                              throw new Error(
                                                "Invalid map format - must be a valid object"
                                              );
                                            }
                                          }
                                        } catch (error) {
                                          // Keep the raw input if parsing fails
                                          console.log(
                                            "Map parsing failed, keeping raw input"
                                          );
                                          // Show error to user
                                          toast({
                                            title: "Invalid Map Format",
                                            description:
                                              "Please use valid Python dictionary syntax like {'key': 'value'}",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    />
                                    <div className="text-xs text-gray-500">
                                      Use Python syntax: start with {"{"} and
                                      end with {"}"}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quick Test Data */}
                        <div className="bg-gray-50 p-2 rounded-lg">
                          <Label className="text-xs font-medium mb-2 block text-gray-700">
                            Quick Test Sets
                          </Label>
                          <div className="space-y-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Get all variables referenced in the template
                                const allTemplateVariables =
                                  extractAllTemplateVariables(htmlContent);

                                // Create comprehensive sample data for all template variables
                                const quickData: { [key: string]: any } = {
                                  // Common variables with realistic sample values
                                  fullName: "David",
                                  paymentMethod: "Bank",
                                  companyName: "ImHereTravels",
                                  accountNumber: "12345678",
                                  sortCode: "12-34-56",
                                  // Sample array data
                                  terms: ["Flight", "Hotel", "Transfer"],
                                  amounts: ["500.00", "200.00", "50.00"],
                                  calendarLinks: [
                                    "https://cal.com/1",
                                    "https://cal.com/2",
                                    "",
                                  ],
                                  // Sample map data
                                  user: {
                                    firstName: "John",
                                    lastName: "Doe",
                                    email: "john@example.com",
                                  },
                                  booking: {
                                    id: "BK123",
                                    status: "confirmed",
                                    total: "750.00",
                                  },
                                };

                                // Add any other template variables with default values
                                allTemplateVariables.forEach((varName) => {
                                  if (!(varName in quickData)) {
                                    // Provide sensible defaults based on variable name patterns
                                    if (
                                      varName.toLowerCase().includes("name")
                                    ) {
                                      quickData[varName] = "Sample Name";
                                    } else if (
                                      varName.toLowerCase().includes("email")
                                    ) {
                                      quickData[varName] = "sample@example.com";
                                    } else if (
                                      varName.toLowerCase().includes("phone")
                                    ) {
                                      quickData[varName] = "+44 123 456 7890";
                                    } else if (
                                      varName.toLowerCase().includes("date")
                                    ) {
                                      quickData[varName] = "2024-12-25";
                                    } else if (
                                      varName
                                        .toLowerCase()
                                        .includes("amount") ||
                                      varName.toLowerCase().includes("price") ||
                                      varName.toLowerCase().includes("fee")
                                    ) {
                                      quickData[varName] = "100.00";
                                    } else if (
                                      varName
                                        .toLowerCase()
                                        .includes("number") ||
                                      varName.toLowerCase().includes("id")
                                    ) {
                                      quickData[varName] = "12345";
                                    } else if (
                                      varName.toLowerCase().includes("url") ||
                                      varName.toLowerCase().includes("link")
                                    ) {
                                      quickData[varName] =
                                        "https://example.com";
                                    } else {
                                      quickData[varName] = "Sample Value";
                                    }
                                  }
                                });

                                setTestData(quickData);

                                console.log(
                                  "All template variables found:",
                                  allTemplateVariables
                                );
                                console.log(
                                  "Sample data populated:",
                                  quickData
                                );

                                // Populate the input fields and textareas with sample data
                                const inputs = document.querySelectorAll(
                                  'input[placeholder*="Enter"], textarea[placeholder*="Enter"]'
                                );
                                inputs.forEach((input) => {
                                  const inputElement = input as
                                    | HTMLInputElement
                                    | HTMLTextAreaElement;
                                  const placeholder = inputElement.placeholder;

                                  // Find matching variable name from placeholder
                                  let variableName = placeholder
                                    .replace("Enter ", "")
                                    .replace("...", "");

                                  // Handle array and map placeholders
                                  if (
                                    placeholder.includes("Python array syntax")
                                  ) {
                                    variableName =
                                      placeholder.match(
                                        /Enter (.*?)\.\.\./
                                      )?.[1] || "";
                                  } else if (
                                    placeholder.includes("Python dict syntax")
                                  ) {
                                    variableName =
                                      placeholder.match(
                                        /Enter (.*?)\.\.\./
                                      )?.[1] || "";
                                  }

                                  // Check if this input is for a map field (contains dot notation)
                                  if (variableName.includes(".")) {
                                    const [parentVar, fieldName] =
                                      variableName.split(".");
                                    if (
                                      quickData[parentVar] &&
                                      quickData[parentVar][fieldName]
                                    ) {
                                      inputElement.value =
                                        quickData[parentVar][fieldName];
                                    }
                                  } else {
                                    // Direct variable match
                                    if (quickData[variableName] !== undefined) {
                                      if (
                                        Array.isArray(quickData[variableName])
                                      ) {
                                        // For arrays, use JSON.stringify to show Python-like syntax
                                        inputElement.value = JSON.stringify(
                                          quickData[variableName]
                                        );
                                      } else if (
                                        typeof quickData[variableName] ===
                                          "object" &&
                                        quickData[variableName] !== null
                                      ) {
                                        // For maps/objects, use JSON.stringify to show Python-like syntax
                                        inputElement.value = JSON.stringify(
                                          quickData[variableName]
                                        );
                                      } else {
                                        inputElement.value = String(
                                          quickData[variableName]
                                        );
                                      }
                                    }
                                  }
                                });

                                toast({
                                  title: "Test Data Loaded",
                                  description:
                                    "Quick test data has been loaded into input fields",
                                });
                              }}
                              className="w-full h-6 px-1 text-xs bg-white hover:bg-gray-100 justify-start"
                            >
                              Load Sample Data
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        No variables defined yet.
                        <br />
                        Define variables in the Variables tab first.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={
                isLoading || !formData.name || validationErrors.length > 0
              }
              className="h-9"
            >
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
