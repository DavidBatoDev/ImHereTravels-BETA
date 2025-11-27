"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TestTube,
  Mail,
} from "lucide-react";
import TemplateDialog from "./TemplateDialog";
import TestTab from "./TestTab";
import EmailsTab from "./EmailsTab";
import ScheduledEmailsTab from "./ScheduledEmailsTab";
import EmailTemplateService from "@/services/email-template-service";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "@/hooks/use-toast";
import { MailTemplate as FirestoreTemplate } from "@/types/mail";
import TabPermissionGuard from "@/components/auth/TabPermissionGuard";
import { ShieldX } from "lucide-react";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    monaco: any;
    require: any;
  }
}

// Use the imported type directly to avoid conflicts
type MailTemplate = FirestoreTemplate;

// Template status
type TemplateStatus = "active" | "draft" | "archived";

const templateStatuses = [
  {
    value: "active",
    label: "Active",
    color: "bg-spring-green/20 text-spring-green border border-spring-green/30",
  },
  {
    value: "draft",
    label: "Draft",
    color:
      "bg-sunglow-yellow/20 text-vivid-orange border border-sunglow-yellow/30",
  },
  {
    value: "archived",
    label: "Archived",
    color: "bg-grey/20 text-muted-foreground border border-grey/30",
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

export default function MailCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile } = useAuthStore();

  // Check if user has at least one required permission
  const hasEmailsPermission =
    userProfile?.permissions?.canManageEmails || false;
  const hasTemplatesPermission =
    userProfile?.permissions?.canManageTemplates || false;
  const hasAnyPermission = hasEmailsPermission || hasTemplatesPermission;

  // Tab to index mapping (Gmail-style)
  const tabIndexMap: { [key: string]: number } = {
    drafts: 0, // Emails tab - always /mail/u/0
  };

  // Index to tab mapping
  const indexToTab: { [key: number]: string } = {
    0: "drafts",
  };

  // Get active tab from URL
  const getActiveTabFromUrl = useCallback(() => {
    // Check for custom routes
    if (pathname === "/mail/payment-reminders") {
      return "scheduled";
    }
    if (pathname === "/mail/email-templates") {
      return "templates";
    }
    if (pathname === "/mail/email-templates-test") {
      return "test";
    }

    // Extract tabId from URL path like /mail/u/0 (guard pathname which may be null)
        const match = pathname ? pathname.match(/\/mail\/u\/(\d+)/) : null;
        if (match) {
      const index = parseInt(match[1], 10);
      return indexToTab[index] || "drafts";
    }
    // Default to scheduled (payment reminders) if no tab in URL
    return hasEmailsPermission ? "scheduled" : "templates";
  }, [pathname, hasEmailsPermission]);

  const [activeTab, setActiveTab] = useState(() => {
    // Check for custom routes
    if (pathname === "/mail/payment-reminders") {
      return "scheduled";
    }
    if (pathname === "/mail/email-templates") {
      return "templates";
    }
    if (pathname === "/mail/email-templates-test") {
      return "test";
    }

    // Initialize from URL - this is only called once (guard pathname which may be null)
        const match = pathname ? pathname.match(/\/mail\/u\/(\d+)/) : null;
        if (match) {
      const index = parseInt(match[1], 10);
      return indexToTab[index] || "drafts";
    }
    return hasEmailsPermission ? "scheduled" : "templates";
  }); // Track the requested tab (what user wants to switch to)
  const [requestedTab, setRequestedTab] = useState<string | null>(null);

  // Update active tab when URL changes (only if different)
  useEffect(() => {
    const tabFromUrl = getActiveTabFromUrl();
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);

      // Hide loading when URL has changed and matches the requested tab
      if (requestedTab && tabFromUrl === requestedTab) {
        setIsTabChanging(false);
        setRequestedTab(null);
      }
    }
  }, [getActiveTabFromUrl, activeTab, requestedTab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    // Show loading indicator only if changing to a different tab
    if (value !== activeTab) {
      setIsTabChanging(true);
      setRequestedTab(value);
    }

    // Update tab state immediately (for instant button feedback)
    setActiveTab(value);

    // Update URL in a transition (non-blocking)
    startTransition(() => {
      if (value === "scheduled") {
        router.push("/mail/payment-reminders", { scroll: false });
      } else if (value === "templates") {
        router.push("/mail/email-templates", { scroll: false });
      } else if (value === "test") {
        router.push("/mail/email-templates-test", { scroll: false });
      } else if (value === "drafts") {
        router.push("/mail/u/0", { scroll: false });
      }
    });
  };

  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MailTemplate | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTabChanging, setIsTabChanging] = useState(false);

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
        const localTemplates: MailTemplate[] = updatedTemplates;

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
      const localTemplates: MailTemplate[] = result.templates;

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

  const handleEditTemplate = (template: MailTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTemplate = (template: MailTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveTemplate = async (templateData: MailTemplate) => {
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

  const handleDuplicateTemplate = async (template: MailTemplate) => {
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

  const handleArchiveTemplate = async (template: MailTemplate) => {
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

  const handleRestoreTemplate = async (template: MailTemplate) => {
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
    return (
      statusObj?.color ||
      "bg-grey/20 text-muted-foreground border border-grey/30"
    );
  };

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error && templates.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-crimson-red mb-4">
          <AlertCircle className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Error loading templates
        </h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button
          onClick={loadTemplates}
          variant="outline"
          className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple"
        >
          Retry
        </Button>
      </div>
    );
  }

  // If no permissions at all, show page-level block
  if (!hasAnyPermission) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-8">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12">
                <img
                  src="/logos/Logo_Red.svg"
                  alt="I'm Here Travels Logo"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Access Denied Icon */}
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-8 h-8 text-red-600" />
            </div>

            {/* Heading */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              You don&apos;t have permission to access the Mail Center. You need
              at least one of the required permissions.
            </p>

            {/* Info Box */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">
                <strong>Required Permissions (at least one):</strong>
                <br />
                • Can Manage Emails
                <br />
                • Can Manage Templates
                <br />
                <br />
                <span className="text-xs">
                  Contact an administrator to grant these permissions
                </span>
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Refresh Page
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gmail-style Loading Indicator */}
      {isTabChanging && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="bg-primary text-white px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2 animate-slide-down">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-hk-grotesk">
            Mail Center
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Create and manage email templates for automated communications
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 bg-muted border border-royal-purple/20 dark:border-border">
          <TabsTrigger
            value="scheduled"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <Clock className="mr-2 h-4 w-4" />
            Payment Reminders
          </TabsTrigger>
          <TabsTrigger
            value="drafts"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <Mail className="mr-2 h-4 w-4" />
            Emails
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="test"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow transition-all duration-200"
          >
            <TestTube className="mr-2 h-4 w-4" />
            Test Tab
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drafts" className="mt-6">
          <TabPermissionGuard permission="canManageEmails" tabName="Emails">
            <EmailsTab />
          </TabPermissionGuard>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <TabPermissionGuard
            permission="canManageEmails"
            tabName="Payment Reminders"
          >
            <ScheduledEmailsTab />
          </TabPermissionGuard>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TabPermissionGuard
            permission="canManageTemplates"
            tabName="Templates"
          >
            <div className="space-y-6">
              {/* Create Template Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateTemplate}
                  className="h-9 bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </div>

              {/* Filters */}
              <Card className="mb-6 border border-royal-purple/20 dark:border-border shadow">
                <CardHeader className="pb-3 bg-muted/50 border-b border-royal-purple/20 dark:border-border">
                  <CardTitle className="flex items-center text-base text-foreground">
                    <Filter className="mr-2 h-4 w-4 text-royal-purple" />
                    Filter Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-royal-purple/60" />
                      <Input
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9 border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger className="h-9 border-royal-purple/20 dark:border-border focus:border-royal-purple focus:ring-royal-purple/20">
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
                      className="h-9 border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template) => {
                  return (
                    <Card
                      key={template.id}
                      className="group hover:shadow-lg transition-all duration-200 border border-royal-purple/20 dark:border-border shadow hover:border-royal-purple/40"
                    >
                      {/* HTML Preview - At the very top */}
                      <div className="bg-muted/30 rounded-t-lg border-b border-royal-purple/20 dark:border-border h-32 overflow-hidden">
                        <div
                          className="text-xs text-foreground line-clamp-4"
                          dangerouslySetInnerHTML={{
                            __html: template.content,
                          }}
                        />
                      </div>

                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div
                              className={`p-2 rounded-lg bg-royal-purple/20`}
                            ></div>
                            <div className="flex-1">
                              <CardTitle className="text-base font-semibold text-foreground">
                                {template.name}
                              </CardTitle>
                              <CardDescription className="mt-1 line-clamp-2 text-sm text-muted-foreground">
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
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-royal-purple hover:bg-royal-purple/10 hover:text-royal-purple"
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
                            className={`${getStatusColor(
                              template.status
                            )} text-xs`}
                          >
                            {template.status}
                          </Badge>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Send className="mr-1 h-3 w-3 text-royal-purple" />
                            {template.metadata?.usedCount || 0} sent
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Variables
                            </span>
                            <span className="font-medium text-foreground">
                              {template.variables.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Last Modified
                            </span>
                            <span className="font-medium text-foreground">
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
                            className="flex-1 h-8 text-xs border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateTemplate(template)}
                            className="flex-1 h-8 text-xs border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple transition-all duration-200"
                          >
                            <Copy className="mr-1 h-3 w-3" />
                            Duplicate
                          </Button>
                          {template.status === "archived" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestoreTemplate(template)}
                              className="text-royal-purple hover:text-royal-purple hover:bg-royal-purple/10 h-8 w-8 p-0 border-royal-purple/20 dark:border-border transition-all duration-200"
                              title="Restore template"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleArchiveTemplate(template)}
                              className="text-sunglow-yellow hover:text-vivid-orange hover:bg-sunglow-yellow/10 h-8 w-8 p-0 border-sunglow-yellow/20 transition-all duration-200"
                              title="Archive template"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template)}
                            className="text-crimson-red hover:text-crimson-red hover:bg-crimson-red/10 h-8 w-8 p-0 border-crimson-red/20 transition-all duration-200"
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
                <Card className="text-center py-8 border border-royal-purple/20 dark:border-border shadow">
                  <CardContent>
                    <div className="p-3 bg-royal-purple/20 rounded-xl inline-block mb-3">
                      <FileText className="h-10 w-10 text-royal-purple" />
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-2">
                      No templates found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your filters or search terms."
                        : "Create your first email template to get started."}
                    </p>
                    {!searchTerm && statusFilter === "all" && (
                      <Button
                        onClick={handleCreateTemplate}
                        className="h-9 bg-primary hover:bg-primary/90 text-white shadow shadow-primary/25 transition-all duration-200"
                      >
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
                <AlertDialogContent className="border border-royal-purple/20 dark:border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">
                      Delete Template
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Are you sure you want to delete "{selectedTemplate?.name}
                      "? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-royal-purple/20 dark:border-border text-royal-purple hover:bg-royal-purple/10 hover:border-royal-purple">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmDelete}
                      className="bg-crimson-red hover:bg-crimson-red/90 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabPermissionGuard>
        </TabsContent>

        <TabsContent value="test" className="mt-6">
          <TabPermissionGuard
            permission="canManageTemplates"
            tabName="Test Tab"
          >
            <TestTab />
          </TabPermissionGuard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
