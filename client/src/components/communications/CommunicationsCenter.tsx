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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  Plus,
  Search,
  Filter,
  Edit,
  Send,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Copy,
  MoreVertical,
  Clock,
  Sparkles,
  Archive,
  RotateCcw,
} from "lucide-react";
import TemplateDialog from "./TemplateDialog";
import EmailTemplateService from "@/services/email-template-service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/hooks/use-toast";
import { CommunicationTemplate as FirestoreTemplate } from "@/types/communications";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Use the imported type directly to avoid conflicts
type CommunicationTemplate = FirestoreTemplate;

// Template status
type TemplateStatus = "active" | "draft" | "archived";

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

export default function CommunicationsCenter() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CommunicationTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates on component mount
  useEffect(() => {
    if (user?.uid) {
      loadTemplates();
    }
  }, [user?.uid]);

  // Real-time subscription to template updates
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = EmailTemplateService.subscribeToTemplates(
      (updatedTemplates) => {
        console.log("Subscription received templates:", updatedTemplates);
        console.log("Number of templates:", updatedTemplates.length);

        // Keep templates in their original Firestore format
        const localTemplates: CommunicationTemplate[] = updatedTemplates;

        console.log("Local templates after conversion:", localTemplates);
        setTemplates(localTemplates);
      },
      {
        // Remove the createdBy filter to show all templates (user + system)
        sortBy: "metadata.updatedAt",
        sortOrder: "desc",
        limit: 100,
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const loadTemplates = async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await EmailTemplateService.getTemplates({
        // Remove the createdBy filter to show all templates (user + system)
        // filters: { createdBy: user.uid },
        sortBy: "metadata.updatedAt",
        sortOrder: "desc",
        limit: 100,
      });

      // Keep templates in their original Firestore format
      const localTemplates: CommunicationTemplate[] = result.templates;

      setTemplates(localTemplates);
    } catch (error) {
      console.error("Failed to load templates:", error);
      setError("Failed to load templates");
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsCreateDialogOpen(true);
  };

  const handleEditTemplate = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTemplate = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveTemplate = async (templateData: CommunicationTemplate) => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    // Debug logging
    console.log("Template data being saved:", templateData);

    try {
      setIsLoading(true);
      setError(null);

      // Check if this is a real existing template or a new one
      // Firestore IDs are 20 characters long, so we check for that
      const isExistingTemplate =
        templateData.id && templateData.id.length === 20;

      console.log("Template ID:", templateData.id);
      console.log("ID length:", templateData.id?.length);
      console.log("Is existing template:", isExistingTemplate);

      if (isExistingTemplate) {
        // Update existing template
        const updateData = {
          id: templateData.id,
          name: templateData.name,
          subject: templateData.subject,
          content: templateData.content,
          status: templateData.status,
          variables: templateData.variables,
          variableDefinitions: templateData.variableDefinitions,
          bccGroups: templateData.bccGroups,
        };

        console.log("Update data:", updateData);

        await EmailTemplateService.updateTemplate(updateData);

        toast({
          title: "Success",
          description: "Template updated successfully",
        });
      } else {
        // Create new template
        console.log("Creating new template with data:", {
          name: templateData.name,
          subject: templateData.subject,
          content: templateData.content,
          variables: templateData.variables,
          status: templateData.status,
        });

        const newId = await EmailTemplateService.createTemplate(
          {
            name: templateData.name,
            subject: templateData.subject,
            content: templateData.content,
            variables: templateData.variables,
            status: templateData.status,
            variableDefinitions: templateData.variableDefinitions,
            bccGroups: templateData.bccGroups,
          },
          user.uid
        );

        console.log("New template created with ID:", newId);
        templateData.id = newId;
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      }

      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to save template:", error);
      setError("Failed to save template");
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTemplate) return;

    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.deleteTemplate(selectedTemplate.id);
      setIsDeleteDialogOpen(false);

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to delete template:", error);
      setError("Failed to delete template");
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateTemplate = async (template: CommunicationTemplate) => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const newTemplateId = await EmailTemplateService.duplicateTemplate(
        template.id,
        user.uid
      );

      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to duplicate template:", error);
      setError("Failed to duplicate template");
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveTemplate = async (template: CommunicationTemplate) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.archiveTemplate(template.id);

      toast({
        title: "Success",
        description: "Template archived successfully",
      });

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to archive template:", error);
      setError("Failed to archive template");
      toast({
        title: "Error",
        description: "Failed to archive template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreTemplate = async (template: CommunicationTemplate) => {
    try {
      setIsLoading(true);
      setError(null);

      await EmailTemplateService.restoreTemplate(template.id);

      toast({
        title: "Success",
        description: "Template restored successfully",
      });

      // Templates will be updated automatically via real-time subscription
    } catch (error) {
      console.error("Failed to restore template:", error);
      setError("Failed to restore template");
      toast({
        title: "Error",
        description: "Failed to restore template",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || template.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: TemplateStatus) => {
    const statusObj = templateStatuses.find((s) => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error && templates.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <AlertCircle className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error loading templates
        </h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={loadTemplates} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

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
          return (
            <Card
              key={template.id}
              className="group hover:shadow-lg transition-all duration-200 border-gray-200"
            >
              {/* HTML Preview - At the very top */}
              <div className="bg-gray-50 rounded-t-lg border-b h-32 overflow-hidden">
                <div
                  className="text-xs text-gray-700 line-clamp-4"
                  dangerouslySetInnerHTML={{
                    __html: template.content,
                  }}
                />
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-opacity-20`}></div>
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
                    <span className="text-gray-500">Variables</span>
                    <span className="font-medium">
                      {template.variables.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Last Modified</span>
                    <span className="font-medium">
                      {template.metadata?.updatedAt
                        ?.toDate?.()
                        ?.toLocaleDateString?.() || "Today"}
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
                  {template.status === "archived" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreTemplate(template)}
                      className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                      title="Restore template"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveTemplate(template)}
                      className="text-yellow-600 hover:text-yellow-700 h-8 w-8 p-0"
                      title="Archive template"
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  )}
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
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Create your first email template to get started."}
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button onClick={handleCreateTemplate} className="h-9">
                <Plus className="mr-2 h-4 w-4" />
                Create First Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Template Dialog */}
      <TemplateDialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // When closing, reset both states and clear selected template
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedTemplate(null);
          }
        }}
        template={selectedTemplate}
        onSave={handleSaveTemplate}
        isLoading={isLoading}
      />

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
