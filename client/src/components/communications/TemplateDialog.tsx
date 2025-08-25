"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Save, Eye, Code, Upload, Palette, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import EmailTemplateService from "@/services/email-template-service";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Types
type TemplateStatus = "active" | "draft" | "archived";

interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: TemplateStatus;
  variables: string[];
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    usedCount?: number;
  };
}

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
    if (editorRef.current && value !== editorRef.current.getValue()) {
      editorRef.current.setValue(value);
    }
  }, [value]);

  // Update zoom level when it changes
  useEffect(() => {
    if (editorRef.current) {
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
  }, [zoomLevel]);

  // Handle container resize
  useEffect(() => {
    if (containerRef.current && editorRef.current) {
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
  }, [editorRef.current]);

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
      });

      editorRef.current.onDidChangeModelContent(() => {
        const newValue = editorRef.current.getValue();
        onChange(newValue);
      });

      // Notify parent component that editor is ready
      if (onEditorReady) {
        onEditorReady(editorRef.current);
      }
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
    />
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
  const [showConditionalHelper, setShowConditionalHelper] = useState(false);
  const editorRef = useRef<any>(null);

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
        <h2 style="color: #333; margin-top: 0;">Hello {{customer_name}},</h2>
        
        <p>This is your email content. You can customize this template by:</p>
        
        <ul>
            <li>Editing the HTML structure</li>
            <li>Adding your own styling</li>
            <li>Including dynamic variables like {{variable_name}}</li>
            <li>Adding images and links</li>
        </ul>
        
        <p>Feel free to modify this template to match your needs!</p>
        
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
  }, [htmlContent]);

  // Function to parse conditional blocks in the template
  const parseConditionalBlocks = (content: string): ConditionalBlock[] => {
    const blocks: ConditionalBlock[] = [];
    const conditionalRegex = /<\? if \(([^)]+)\) \{ \?>/g;
    const endRegex = /<\? \}/g;
    
    let match;
    let currentBlock: Partial<ConditionalBlock> | null = null;
    
    // Find all conditional blocks
    while ((match = conditionalRegex.exec(content)) !== null) {
      if (currentBlock) {
        // If we find a new opening tag before closing the previous one, it's nested
        // For simplicity, we'll just close the previous block at the next end tag
      }
      
      currentBlock = {
        condition: match[1].trim(),
        startIndex: match.index,
        content: "",
      };
    }
    
    // Find end tags and complete blocks
    let endMatch;
    while ((endMatch = endRegex.exec(content)) !== null) {
      if (currentBlock) {
        currentBlock.endIndex = endMatch.index;
        currentBlock.content = content.substring(
          currentBlock.startIndex! + match![0].length,
          endMatch.index
        );
        blocks.push(currentBlock as ConditionalBlock);
        currentBlock = null;
      }
    }
    
    return blocks;
  };

  // Function to validate conditional syntax
  const validateConditionalSyntax = (content: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const openTags = (content.match(/<\? if \(/g) || []).length;
    const closeTags = (content.match(/<\? \}/g) || []).length;
    
    if (openTags !== closeTags) {
      errors.push(`Mismatched conditional tags: ${openTags} opening tags, ${closeTags} closing tags`);
    }
    
    // Check for proper conditional syntax
    const conditionalRegex = /<\? if \(([^)]+)\) \{ \?>/g;
    let match;
    while ((match = conditionalRegex.exec(content)) !== null) {
      const condition = match[1].trim();
      if (!condition) {
        errors.push("Empty conditional expression found");
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Function to insert conditional block template
  const insertConditionalBlock = () => {
    const conditionalTemplate = `<? if (availablePaymentTerms === "P1") { ?>
  <!-- Content for P1 payment terms -->
  <p>This content will only show when availablePaymentTerms equals "P1"</p>
<? } ?>`;
    
    setHtmlContent((prev) => prev + "\n" + conditionalTemplate);
  };

  // Function to insert variable-based conditional
  const insertVariableConditional = (variable: string) => {
    const conditionalTemplate = `<? if (${variable} === "value") { ?>
  <!-- Content when ${variable} equals "value" -->
  <p>This content will only show when ${variable} equals "value"</p>
<? } ?>`;
    
    setHtmlContent((prev) => prev + "\n" + conditionalTemplate);
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
        conditionalValidation.errors.forEach(error => errors.push(`Conditional syntax: ${error}`));
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
      status: formData.status,
      metadata: {
        createdAt: template?.metadata?.createdAt || new Date(),
        updatedAt: new Date(),
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
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map((match) => "{{" + match[1] + "}}"))];
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
                  variables to personalize content and conditional rendering for dynamic content.
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
              {validationWarnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 text-yellow-600 text-sm"
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>{warning}</span>
                </div>
              ))}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConditionalHelper(!showConditionalHelper)}
                      className="h-8 px-3"
                    >
                      <Code className="mr-2 h-4 w-4" />
                      Conditional
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

                {/* Conditional Rendering Helper */}
                {showConditionalHelper && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium text-blue-800">Conditional Rendering Helper</h4>
                    <div className="text-xs text-blue-700 space-y-2">
                      <p>Use conditional blocks to show different content based on variable values:</p>
                      <div className="bg-white p-2 rounded border font-mono text-xs">
                        {`<? if (variable === "value") { ?>
  <!-- Content to show when condition is true -->
<? } ?>`}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={insertConditionalBlock}
                          className="h-6 px-2 text-xs"
                        >
                          Insert Basic Conditional
                        </Button>
                        {extractVariables(htmlContent).slice(0, 5).map((variable) => (
                          <Button
                            key={variable}
                            variant="outline"
                            size="sm"
                            onClick={() => insertVariableConditional(variable)}
                            className="h-6 px-2 text-xs"
                          >
                            {variable}
                          </Button>
                        ))}
                      </div>
                      <div className="text-xs text-blue-600">
                        <strong>Common conditions:</strong> availablePaymentTerms === "P1", bookingType === "Group Booking", etc.
                      </div>
                    </div>
                  </div>
                )}

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
                            <span>Live Preview</span>
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
                                  __html: htmlContent,
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
                          <span>Live Preview</span>
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
                            <div
                              dangerouslySetInnerHTML={{
                                __html: htmlContent,
                              }}
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Form Fields (30%) */}
              <div className="col-span-3 space-y-3">
                {/* Basic Info */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
                    Template Information
                  </h3>

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
                      className="mt-1 h-8 text-xs"
                    />
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
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templateStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
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
                      className="mt-1 h-8 text-xs"
                    />
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

                {/* Conditional Blocks Info */}
                {htmlContent.includes("<? if") && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
                      Conditional Blocks
                    </h3>
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <Label className="text-xs font-medium mb-2 block text-blue-700">
                        Conditional Blocks Found
                      </Label>
                      <div className="text-xs text-blue-600 space-y-1">
                        {parseConditionalBlocks(htmlContent).map((block, index) => (
                          <div key={index} className="p-1 bg-white rounded border">
                            <div className="font-medium">{block.condition}</div>
                            <div className="text-gray-600 truncate">
                              {block.content.substring(0, 50)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
