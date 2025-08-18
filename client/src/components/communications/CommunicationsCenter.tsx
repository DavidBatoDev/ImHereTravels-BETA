"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Send,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Copy,
  Code,
  Upload,
  Save,
  Palette,
  Sparkles,
  Clock,
  MoreVertical,
} from "lucide-react";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Mock types since we don't have the actual types
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

// Template types
const templateTypes = [
  {
    value: "reservation",
    label: "Reservation Confirmation",
    icon: CheckCircle,
    color: "bg-green-500",
  },
  {
    value: "payment-reminder",
    label: "Payment Reminder",
    icon: Clock,
    color: "bg-yellow-500",
  },
  {
    value: "cancellation",
    label: "Cancellation Notice",
    icon: AlertCircle,
    color: "bg-red-500",
  },
  {
    value: "adventure-kit",
    label: "Adventure Kit",
    icon: Sparkles,
    color: "bg-purple-500",
  },
];

const templateStatuses = [
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
  {
    value: "archived",
    label: "Archived",
    color: "bg-yellow-100 text-yellow-800",
  },
];

// Pre-designed email templates
const emailTemplates = {
  reservation: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 28px; 
        }
        .content { 
            padding: 40px; 
        }
        .button { 
            display: inline-block; 
            padding: 14px 30px; 
            background-color: #667eea; 
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
        }
        .highlight-box { 
            background-color: #f8f9fa; 
            border-left: 4px solid #667eea; 
            padding: 15px; 
            margin: 20px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
        </div>
        <div class="content">
            <h2>Hello {{traveler_name}},</h2>
            <p>Great news! Your booking for <strong>{{tour_name}}</strong> has been confirmed.</p>
            
            <div class="highlight-box">
                <h3>Booking Details:</h3>
                <p><strong>Tour:</strong> {{tour_name}}</p>
                <p><strong>Date:</strong> {{tour_date}}</p>
                <p><strong>Duration:</strong> {{duration}} days</p>
                <p><strong>Booking ID:</strong> {{booking_id}}</p>
            </div>
            
            <p>We're excited to have you join us on this amazing adventure!</p>
            
            <center>
                <a href="{{booking_link}}" class="button">View Your Booking</a>
            </center>
            
            <p>If you have any questions, feel free to reach out to our team.</p>
            
            <p>Best regards,<br>
            The ImHereTravels Team</p>
        </div>
        <div class="footer">
            <p>© 2024 ImHereTravels | All rights reserved</p>
            <p>You're receiving this email because you made a booking with ImHereTravels.</p>
        </div>
    </div>
</body>
</html>`,
  "payment-reminder": `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
        }
        .header { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 28px; 
        }
        .content { 
            padding: 40px; 
        }
        .amount-box { 
            background-color: #fff3cd; 
            border: 2px solid #ffc107; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
            text-align: center; 
        }
        .amount { 
            font-size: 36px; 
            color: #856404; 
            font-weight: bold; 
        }
        .button { 
            display: inline-block; 
            padding: 14px 30px; 
            background-color: #ffc107; 
            color: #212529; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-weight: bold; 
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Payment Reminder</h1>
        </div>
        <div class="content">
            <h2>Hello {{traveler_name}},</h2>
            <p>This is a friendly reminder about your upcoming payment for your tour booking.</p>
            
            <div class="amount-box">
                <p style="margin: 0; color: #856404;">Amount Due:</p>
                <div class="amount">\${{amount_due}}</div>
                <p style="margin: 10px 0 0 0; color: #856404;">Due Date: {{due_date}}</p>
            </div>
            
            <p><strong>Tour Details:</strong></p>
            <ul>
                <li>Tour: {{tour_name}}</li>
                <li>Departure: {{tour_date}}</li>
                <li>Booking ID: {{booking_id}}</li>
            </ul>
            
            <center>
                <a href="{{payment_link}}" class="button">Make Payment</a>
            </center>
            
            <p>Thank you for choosing ImHereTravels!</p>
        </div>
        <div class="footer">
            <p>© 2024 ImHereTravels | All rights reserved</p>
        </div>
    </div>
</body>
</html>`,
  cancellation: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
        }
        .header { 
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 28px; 
        }
        .content { 
            padding: 40px; 
        }
        .alert-box { 
            background-color: #f8d7da; 
            border: 1px solid #f5c6cb; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
        }
        .button { 
            display: inline-block; 
            padding: 14px 30px; 
            background-color: #dc3545; 
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Cancellation</h1>
        </div>
        <div class="content">
            <h2>Hello {{traveler_name}},</h2>
            
            <div class="alert-box">
                <p><strong>Your booking has been cancelled.</strong></p>
                <p>Booking ID: {{booking_id}}</p>
                <p>Reason: {{cancellation_reason}}</p>
            </div>
            
            <p>We're sorry to see you go. If you have any questions about your cancellation or would like to book another tour, please don't hesitate to contact us.</p>
            
            <p><strong>Refund Information:</strong></p>
            <p>{{refund_details}}</p>
            
            <center>
                <a href="{{contact_link}}" class="button">Contact Support</a>
            </center>
            
            <p>We hope to see you on another adventure soon!</p>
            
            <p>Best regards,<br>
            The ImHereTravels Team</p>
        </div>
        <div class="footer">
            <p>© 2024 ImHereTravels | All rights reserved</p>
        </div>
    </div>
</body>
</html>`,
  "adventure-kit": `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff; 
        }
        .header { 
            background: linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%); 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 28px; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1); 
        }
        .content { 
            padding: 40px; 
        }
        .kit-item { 
            background-color: #e7f5ff; 
            border-left: 4px solid #339af0; 
            padding: 15px; 
            margin: 15px 0; 
            border-radius: 5px; 
        }
        .button { 
            display: inline-block; 
            padding: 14px 30px; 
            background: linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%); 
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-weight: bold; 
        }
        .footer { 
            background-color: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 14px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎒 Your Adventure Kit is Ready!</h1>
        </div>
        <div class="content">
            <h2>Hello {{traveler_name}},</h2>
            <p>Your adventure is just around the corner! We've prepared your digital adventure kit with everything you need for your upcoming tour.</p>
            
            <h3>📦 What's in Your Kit:</h3>
            
            <div class="kit-item">
                <strong>📍 Detailed Itinerary</strong>
                <p>Day-by-day breakdown of your adventure</p>
            </div>
            
            <div class="kit-item">
                <strong>📋 Packing List</strong>
                <p>Everything you need to bring for your tour</p>
            </div>
            
            <div class="kit-item">
                <strong>🗺️ Maps & Guides</strong>
                <p>Local maps and insider tips</p>
            </div>
            
            <div class="kit-item">
                <strong>📱 Emergency Contacts</strong>
                <p>Important numbers and local contacts</p>
            </div>
            
            <center>
                <a href="{{kit_download_link}}" class="button">Download Your Adventure Kit</a>
            </center>
            
            <p><strong>Tour Details:</strong></p>
            <ul>
                <li>Tour: {{tour_name}}</li>
                <li>Start Date: {{tour_date}}</li>
                <li>Meeting Point: {{meeting_point}}</li>
                <li>Guide: {{guide_name}}</li>
            </ul>
            
            <p>Get ready for an unforgettable experience!</p>
            
            <p>Happy travels,<br>
            The ImHereTravels Team</p>
        </div>
        <div class="footer">
            <p>© 2024 ImHereTravels | All rights reserved</p>
            <p>Follow us on social media for travel inspiration!</p>
        </div>
    </div>
</body>
</html>`,
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
}) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Load Monaco Editor from CDN
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

  const initializeEditor = () => {
    if (containerRef.current && window.monaco) {
      editorRef.current = window.monaco.editor.create(containerRef.current, {
        value: value,
        language: language,
        theme: "vs-dark",
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        formatOnPaste: true,
        formatOnType: true,
      });

      editorRef.current.onDidChangeModelContent(() => {
        const newValue = editorRef.current.getValue();
        onChange(newValue);
      });
    }
  };

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}

// Beautify function (simplified version)
function beautifyHTML(html) {
  // Simple HTML beautification
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

function getIndentLevel(lines) {
  let level = 0;
  lines.forEach((line) => {
    const openTags = (line.match(/<[^\/][^>]*>/g) || []).length;
    const closeTags = (line.match(/<\/[^>]*>/g) || []).length;
    level += openTags - closeTags;
  });
  return Math.max(0, level);
}

export default function CommunicationsCenter() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([
    {
      id: "1",
      name: "Booking Confirmation",
      type: "reservation",
      subject: "Your Adventure Awaits - Booking Confirmed!",
      content: emailTemplates.reservation,
      status: "active",
      variables: templateVariables.reservation,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        usedCount: 42,
      },
    },
    {
      id: "2",
      name: "Payment Due Notice",
      type: "payment-reminder",
      subject: "Payment Reminder - {{tour_name}}",
      content: emailTemplates["payment-reminder"],
      status: "active",
      variables: templateVariables["payment-reminder"],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        usedCount: 28,
      },
    },
    {
      id: "3",
      name: "Adventure Kit Delivery",
      type: "adventure-kit",
      subject: "Your Adventure Kit is Ready! 🎒",
      content: emailTemplates["adventure-kit"],
      status: "draft",
      variables: templateVariables["adventure-kit"],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        usedCount: 15,
      },
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CommunicationTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    type: "reservation" as TemplateType,
    subject: "",
    content: "",
    status: "draft" as TemplateStatus,
    variables: [] as string[],
  });

  // Editor state
  const [editorView, setEditorView] = useState("split"); // split, code, preview
  const [htmlContent, setHtmlContent] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Calculate preview scale based on container size
  const calculatePreviewScale = (
    containerWidth: number,
    emailWidth: number
  ) => {
    return Math.min(containerWidth / emailWidth, 1);
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
          const emailWidth = 400; // Standard email width
          const scale = calculatePreviewScale(rect.width, emailWidth);
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

  const handleCreateTemplate = () => {
    setFormData({
      name: "",
      type: "reservation",
      subject: "",
      content: emailTemplates.reservation,
      status: "draft",
      variables: templateVariables.reservation,
    });
    setHtmlContent(emailTemplates.reservation);
    setSelectedTemplate(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      status: template.status,
      variables: template.variables,
    });
    setHtmlContent(template.content);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTemplate = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    setIsLoading(true);

    try {
      const templateData = {
        id: selectedTemplate?.id || Date.now().toString(),
        type: formData.type,
        name: formData.name,
        subject: formData.subject,
        content: htmlContent,
        variables: extractVariables(htmlContent),
        status: formData.status,
        metadata: {
          createdAt: selectedTemplate?.metadata?.createdAt || new Date(),
          updatedAt: new Date(),
          usedCount: selectedTemplate?.metadata?.usedCount || 0,
        },
      };

      if (selectedTemplate) {
        // Update existing template
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplate.id ? templateData : t))
        );
      } else {
        // Create new template
        setTemplates((prev) => [...prev, templateData]);
      }

      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);

    try {
      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting template:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map((match) => "{{" + match[1] + "}}"))];
  };

  const handleDuplicateTemplate = async (template: CommunicationTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        id: Date.now().toString(),
        name: `${template.name} (Copy)`,
        status: "draft" as TemplateStatus,
        metadata: {
          ...template.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          usedCount: 0,
        },
      };
      setTemplates((prev) => [...prev, duplicatedTemplate]);
    } catch (error) {
      console.error("Error duplicating template:", error);
    }
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

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || template.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || template.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: TemplateStatus) => {
    const statusObj = templateStatuses.find((s) => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };

  const getTypeIcon = (type: TemplateType) => {
    const typeObj = templateTypes.find((t) => t.value === type);
    return typeObj?.icon || FileText;
  };

  const getTypeColor = (type: TemplateType) => {
    const typeObj = templateTypes.find((t) => t.value === type);
    return typeObj?.color || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      {/* Load Monaco Editor CSS */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs/editor/editor.main.css"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Communications Center
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Create and manage email templates for automated communications
          </p>
        </div>
        <Button onClick={handleCreateTemplate} className="h-9">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Filter className="mr-2 h-4 w-4" />
            Filter Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Template Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {templateTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {templateStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
                setStatusFilter("all");
              }}
              className="h-9"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => {
          const Icon = getTypeIcon(template.type);
          return (
            <Card
              key={template.id}
              className="group hover:shadow-lg transition-all duration-200 border-gray-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg ${getTypeColor(
                        template.type
                      )} bg-opacity-20`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2 text-sm">
                        {template.subject}
                      </CardDescription>
                    </div>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>More actions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge
                    className={`${getStatusColor(template.status)} text-xs`}
                  >
                    {template.status}
                  </Badge>
                  <div className="flex items-center text-xs text-gray-500">
                    <Send className="mr-1 h-3 w-3" />
                    {template.metadata?.usedCount || 0} sent
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium capitalize">
                      {template.type.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Variables</span>
                    <span className="font-medium">
                      {template.variables.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Last Modified</span>
                    <span className="font-medium">
                      {template.metadata?.updatedAt?.toLocaleDateString?.() ||
                        "Today"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                    className="flex-1 h-8 text-xs"
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateTemplate(template)}
                    className="flex-1 h-8 text-xs"
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template)}
                    className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <FileText className="mx-auto h-10 w-10 text-gray-400 mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-2">
              No templates found
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Create your first email template to get started."}
            </p>
            {!searchTerm && typeFilter === "all" && statusFilter === "all" && (
              <Button onClick={handleCreateTemplate} className="h-9">
                <Plus className="mr-2 h-4 w-4" />
                Create First Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          setIsEditDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {selectedTemplate
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
            {/* Main Layout: Editor on Left, Form on Right */}
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
                      <Palette className="mr-2 h-3 w-3" />
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
                        <Upload className="mr-2 h-3 w-3" />
                        Image
                      </Button>
                    </Label>
                  </div>
                </div>

                {/* Editor */}
                <div className="border rounded-lg overflow-hidden bg-white flex-1">
                  {editorView === "split" && (
                    <div className="grid grid-cols-2 divide-x h-full">
                      <div className="flex flex-col">
                        <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b">
                          HTML Code
                        </div>
                        <div className="flex-1">
                          <MonacoEditor
                            value={htmlContent}
                            onChange={setHtmlContent}
                            language="html"
                            height="100%"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b">
                          Live Preview
                        </div>
                        <div className="flex-1 p-3 overflow-auto bg-gray-50 flex items-center justify-center">
                          <div
                            className="w-full max-w-md mx-auto"
                            data-preview-container
                          >
                            <div
                              className="relative w-full"
                              style={{ paddingBottom: "125%" }}
                            >
                              <div
                                className="absolute inset-0 bg-white rounded shadow-sm overflow-hidden"
                                style={{
                                  transform: "scale(var(--preview-scale, 1))",
                                  transformOrigin: "top left",
                                  width: "100%",
                                  height: "100%",
                                }}
                              >
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: htmlContent,
                                  }}
                                  className="w-full h-full"
                                  style={
                                    {
                                      width: "400px",
                                      height: "500px",
                                      maxWidth: "100%",
                                      maxHeight: "100%",
                                    } as React.CSSProperties
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {editorView === "code" && (
                    <div className="flex flex-col h-full">
                      <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b">
                        HTML Code Editor
                      </div>
                      <div className="flex-1">
                        <MonacoEditor
                          value={htmlContent}
                          onChange={setHtmlContent}
                          language="html"
                          height="100%"
                        />
                      </div>
                    </div>
                  )}

                  {editorView === "preview" && (
                    <div className="flex flex-col h-full">
                      <div className="bg-gray-100 px-3 py-2 text-xs font-medium border-b">
                        Live Preview
                      </div>
                      <div className="flex-1 p-4 overflow-auto bg-gray-50 flex items-center justify-center">
                        <div
                          className="w-full max-w-2xl mx-auto"
                          data-preview-container
                        >
                          <div
                            className="relative w-full"
                            style={{ paddingBottom: "125%" }}
                          >
                            <div
                              className="absolute inset-0 bg-white rounded shadow-sm overflow-hidden"
                              style={{
                                transform: "scale(var(--preview-scale, 1))",
                                transformOrigin: "top left",
                                width: "100%",
                                height: "100%",
                              }}
                            >
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: htmlContent,
                                }}
                                className="w-full h-full"
                                style={
                                  {
                                    width: "600px",
                                    height: "750px",
                                    maxWidth: "100%",
                                    maxHeight: "100%",
                                  } as React.CSSProperties
                                }
                              />
                            </div>
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

                {/* Template Statistics */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 border-b pb-2">
                    Template Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 p-2 rounded-lg text-center">
                      <div className="text-sm font-bold text-blue-600">
                        {extractVariables(htmlContent).length}
                      </div>
                      <div className="text-xs text-blue-800">Variables</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg text-center">
                      <div className="text-sm font-bold text-green-600">
                        {htmlContent.length}
                      </div>
                      <div className="text-xs text-green-800">Chars</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded-lg text-center">
                      <div className="text-sm font-bold text-purple-600">
                        {(htmlContent.match(/\n/g) || []).length + 1}
                      </div>
                      <div className="text-xs text-purple-800">Lines</div>
                    </div>
                    <div className="bg-orange-50 p-2 rounded-lg text-center">
                      <div className="text-sm font-bold text-orange-600">
                        {Math.round((htmlContent.length / 1024) * 100) / 100}
                      </div>
                      <div className="text-xs text-orange-800">KB</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
              }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
