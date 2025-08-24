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
import { Save, Eye, Code, Upload, Palette } from "lucide-react";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Types
type TemplateType =
  | "reservation"
  | "payment-reminder"
  | "cancellation"
  | "adventure-kit";

type TemplateStatus = "active" | "draft" | "archived";

interface CommunicationTemplate {
  id: string;
  name: string;
  type: TemplateType;
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

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CommunicationTemplate | null;
  onSave: (template: CommunicationTemplate) => void;
  isLoading?: boolean;
}

// Template types and data
const templateTypes = [
  { value: "reservation", label: "Reservation Confirmation" },
  { value: "payment-reminder", label: "Payment Reminder" },
  { value: "cancellation", label: "Cancellation Notice" },
  { value: "adventure-kit", label: "Adventure Kit" },
];

const templateStatuses = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

// Pre-designed email templates
const emailTemplates = {
  reservation: `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;background-color:#f4f4f4}.container{max-width:600px;margin:0 auto;background-color:#ffffff}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;text-align:center}.header h1{color:#ffffff;margin:0;font-size:28px}.content{padding:40px}.button{display:inline-block;padding:14px 30px;background-color:#667eea;color:#ffffff;text-decoration:none;border-radius:5px;margin:20px 0}.footer{background-color:#f8f9fa;padding:20px;text-align:center;color:#6c757d;font-size:14px}.highlight-box{background-color:#f8f9fa;border-left:4px solid #667eea;padding:15px;margin:20px 0}</style></head><body><div class="container"><div class="header"><h1>🎉 Booking Confirmed!</h1></div><div class="content"><h2>Hello {{traveler_name}},</h2><p>Great news! Your booking for <strong>{{tour_name}}</strong> has been confirmed.</p><div class="highlight-box"><h3>Booking Details:</h3><p><strong>Tour:</strong> {{tour_name}}</p><p><strong>Date:</strong> {{tour_date}}</p><p><strong>Duration:</strong> {{duration}} days</p><p><strong>Booking ID:</strong> {{booking_id}}</p></div><p>We're excited to have you join us on this amazing adventure!</p><center><a href="{{booking_link}}" class="button">View Your Booking</a></center><p>If you have any questions, feel free to reach out to our team.</p><p>Best regards,<br>The ImHereTravels Team</p></div><div class="footer"><p>© 2024 ImHereTravels | All rights reserved</p><p>You're receiving this email because you made a booking with ImHereTravels.</p></div></div></body></html>`,
  "payment-reminder": `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;background-color:#f4f4f4}.container{max-width:600px;margin:0 auto;background-color:#ffffff}.header{background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);padding:40px;text-align:center}.header h1{color:#ffffff;margin:0;font-size:28px}.content{padding:40px}.amount-box{background-color:#fff3cd;border:2px solid #ffc107;border-radius:8px;padding:20px;margin:20px 0;text-align:center}.amount{font-size:36px;color:#856404;font-weight:bold}.button{display:inline-block;padding:14px 30px;background-color:#ffc107;color:#212529;text-decoration:none;border-radius:5px;margin:20px 0;font-weight:bold}.footer{background-color:#f8f9fa;padding:20px;text-align:center;color:#6c757d;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>⏰ Payment Reminder</h1></div><div class="content"><h2>Hello {{traveler_name}},</h2><p>This is a friendly reminder about your upcoming payment for your tour booking.</p><div class="amount-box"><p style="margin:0;color:#856404;">Amount Due:</p><div class="amount">\${{amount_due}}</div><p style="margin:10px 0 0 0;color:#856404;">Due Date: {{due_date}}</p></div><p><strong>Tour Details:</strong></p><ul><li>Tour: {{tour_name}}</li><li>Departure: {{tour_date}}</li><li>Booking ID: {{booking_id}}</li></ul><center><a href="{{payment_link}}" class="button">Make Payment</a></center><p>Thank you for choosing ImHereTravels!</p></div><div class="footer"><p>© 2024 ImHereTravels | All rights reserved</p></div></div></body></html>`,
  cancellation: `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;background-color:#f4f4f4}.container{max-width:600px;margin:0 auto;background-color:#ffffff}.header{background:linear-gradient(135deg,#fa709a 0%,#fee140 100%);padding:40px;text-align:center}.header h1{color:#ffffff;margin:0;font-size:28px}.content{padding:40px}.alert-box{background-color:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;padding:20px;margin:20px 0}.button{display:inline-block;padding:14px 30px;background-color:#dc3545;color:#ffffff;text-decoration:none;border-radius:5px;margin:20px 0}.footer{background-color:#f8f9fa;padding:20px;text-align:center;color:#6c757d;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>Booking Cancellation</h1></div><div class="content"><h2>Hello {{traveler_name}},</h2><div class="alert-box"><p><strong>Your booking has been cancelled.</strong></p><p>Booking ID: {{booking_id}}</p><p>Reason: {{cancellation_reason}}</p></div><p>We're sorry to see you go. If you have any questions about your cancellation or would like to book another tour, please don't hesitate to contact us.</p><p><strong>Refund Information:</strong></p><p>{{refund_details}}</p><center><a href="{{contact_link}}" class="button">Contact Support</a></center><p>We hope to see you on another adventure soon!</p><p>Best regards,<br>The ImHereTravels Team</p></div><div class="footer"><p>© 2024 ImHereTravels | All rights reserved</p></div></div></body></html>`,
  "adventure-kit": `<!DOCTYPE html><html><head><style>body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;background-color:#f4f4f4}.container{max-width:600px;margin:0 auto;background-color:#ffffff}.header{background:linear-gradient(135deg,#00c9ff 0%,#92fe9d 100%);padding:40px;text-align:center}.header h1{color:#ffffff;margin:0;font-size:28px;text-shadow:2px 2px 4px rgba(0,0,0,0.1)}.content{padding:40px}.kit-item{background-color:#e7f5ff;border-left:4px solid #339af0;padding:15px;margin:15px 0;border-radius:5px}.button{display:inline-block;padding:14px 30px;background:linear-gradient(135deg,#00c9ff 0%,#92fe9d 100%);color:#ffffff;text-decoration:none;border-radius:5px;margin:20px 0;font-weight:bold}.footer{background-color:#f8f9fa;padding:20px;text-align:center;color:#6c757d;font-size:14px}</style></head><body><div class="container"><div class="header"><h1>🎒 Your Adventure Kit is Ready!</h1></div><div class="content"><h2>Hello {{traveler_name}},</h2><p>Your adventure is just around the corner! We've prepared your digital adventure kit with everything you need for your upcoming tour.</p><h3>📦 What's in Your Kit:</h3><div class="kit-item"><strong>📍 Detailed Itinerary</strong><p>Day-by-day breakdown of your adventure</p></div><div class="kit-item"><strong>📋 Packing List</strong><p>Everything you need to bring for your tour</p></div><div class="kit-item"><strong>🗺️ Maps & Guides</strong><p>Local maps and insider tips</p></div><div class="kit-item"><strong>📱 Emergency Contacts</strong><p>Important numbers and local contacts</p></div><center><a href="{{kit_download_link}}" class="button">Download Your Adventure Kit</a></center><p><strong>Tour Details:</strong></p><ul><li>Tour: {{tour_name}}</li><li>Start Date: {{tour_date}}</li><li>Meeting Point: {{meeting_point}}</li><li>Guide: {{guide_name}}</li></ul><p>Get ready for an unforgettable experience!</p><p>Happy travels,<br>The ImHereTravels Team</p></div><div class="footer"><p>© 2024 ImHereTravels | All rights reserved</p><p>Follow us on social media for travel inspiration!</p></div></div></body></html>`,
};

// Available variables for templates
const templateVariables = {
  reservation: [
    "{{traveler_name}}",
    "{{tour_name}}",
    "{{tour_date}}",
    "{{duration}}",
    "{{booking_id}}",
    "{{booking_link}}",
    "{{amount}}",
  ],
  "payment-reminder": [
    "{{traveler_name}}",
    "{{tour_name}}",
    "{{tour_date}}",
    "{{booking_id}}",
    "{{amount_due}}",
    "{{due_date}}",
    "{{payment_link}}",
  ],
  cancellation: [
    "{{traveler_name}}",
    "{{booking_id}}",
    "{{tour_name}}",
    "{{cancellation_reason}}",
    "{{refund_details}}",
    "{{contact_link}}",
  ],
  "adventure-kit": [
    "{{traveler_name}}",
    "{{tour_name}}",
    "{{tour_date}}",
    "{{meeting_point}}",
    "{{guide_name}}",
    "{{kit_download_link}}",
  ],
};

// Monaco Editor Component
function MonacoEditor({
  value,
  onChange,
  language = "html",
  height = "400px",
  zoomLevel = 1,
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  zoomLevel?: number;
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
    type: "reservation" as TemplateType,
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

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        subject: template.subject,
        content: template.content,
        status: template.status,
        variables: template.variables,
      });
      setHtmlContent(template.content);
    } else {
      setFormData({
        name: "",
        type: "reservation",
        subject: "",
        content: emailTemplates.reservation,
        status: "draft",
        variables: templateVariables.reservation,
      });
      setHtmlContent(emailTemplates.reservation);
    }
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

  const handleSaveTemplate = () => {
    const templateData: CommunicationTemplate = {
      id: template?.id || Date.now().toString(),
      type: formData.type,
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
    onSave(templateData);
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map((match) => "{{" + match[1] + "}}"))];
  };

  const handleTemplateTypeChange = (type: TemplateType) => {
    setFormData((prev) => ({
      ...prev,
      type,
      content: emailTemplates[type],
      variables: templateVariables[type],
    }));
    setHtmlContent(emailTemplates[type]);
  };

  const handleBeautifyCode = () => {
    const beautified = beautifyHTML(htmlContent);
    setHtmlContent(beautified);
  };

  const insertVariable = (variable: string) => {
    setHtmlContent((prev) => prev + variable);
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
                  variables to personalize content.
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
                      htmlFor="template-type"
                      className="text-xs font-medium"
                    >
                      Template Type
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={handleTemplateTypeChange}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      Available Variables
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {templateVariables[formData.type]?.map((variable) => (
                        <Badge
                          key={variable}
                          variant="secondary"
                          className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors text-xs px-1 py-0"
                          onClick={() => insertVariable(variable)}
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
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
              disabled={isLoading || !formData.name}
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
