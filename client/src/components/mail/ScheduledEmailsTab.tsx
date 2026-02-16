"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import DOMPurify from "dompurify";
import EmailTemplateService from "@/services/email-template-service";
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdUndo,
  MdRedo,
} from "react-icons/md";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Search,
  Edit,
  Trash2,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ScheduledEmailService, {
  ScheduledEmail,
  ScheduledEmailData,
} from "@/services/scheduled-email-service";

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  sent: "bg-green-100 text-green-800 border border-green-200",
  failed: "bg-red-100 text-red-800 border border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border border-gray-200",
  skipped: "bg-blue-100 text-blue-800 border border-blue-200",
};

const statusIcons = {
  pending: <Clock className="w-4 h-4" />,
  sent: <CheckCircle className="w-4 h-4" />,
  failed: <AlertCircle className="w-4 h-4" />,
  cancelled: <X className="w-4 h-4" />,
  skipped: <Pause className="w-4 h-4" />,
};

export default function ScheduledEmailsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isSkipDialogOpen, setIsSkipDialogOpen] = useState(false);
  const [isSkippingEmail, setIsSkippingEmail] = useState(false);
  const [isUnskippingEmail, setIsUnskippingEmail] = useState(false);
  const [isViewEmailDialogOpen, setIsViewEmailDialogOpen] = useState(false);
  const [isProcessNowConfirmOpen, setIsProcessNowConfirmOpen] = useState(false);
  const [isProcessingNow, setIsProcessingNow] = useState(false);
  const [
    isDeletePaymentRemindersDialogOpen,
    setIsDeletePaymentRemindersDialogOpen,
  ] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | null>(
    null,
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  const [isDeletingPaymentReminders, setIsDeletingPaymentReminders] =
    useState(false);
  const [newEmailData, setNewEmailData] = useState<Partial<ScheduledEmailData>>(
    {
      maxAttempts: 3,
    },
  );
  const [newScheduleDate, setNewScheduleDate] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [viewEmailData, setViewEmailData] = useState<{
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    htmlContent: string;
    actualBookingId?: string;
  } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Real-time Firestore subscription for scheduled emails
  useEffect(() => {
    setIsLoading(true);

    // Build query
    const scheduledEmailsRef = collection(db, "scheduledEmails");
    let q = query(scheduledEmailsRef, orderBy("scheduledFor", "asc"));

    // Add status filter if not "all"
    if (statusFilter !== "all") {
      q = query(
        scheduledEmailsRef,
        where("status", "==", statusFilter),
        orderBy("scheduledFor", "asc"),
      );
    }

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const emails: ScheduledEmail[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scheduledFor:
              data.scheduledFor instanceof Timestamp
                ? data.scheduledFor.toDate().toISOString()
                : data.scheduledFor,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
            updatedAt:
              data.updatedAt instanceof Timestamp
                ? data.updatedAt.toDate().toISOString()
                : data.updatedAt,
            sentAt:
              data.sentAt && data.sentAt instanceof Timestamp
                ? data.sentAt.toDate().toISOString()
                : data.sentAt,
          } as ScheduledEmail;
        });

        setScheduledEmails(emails);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error subscribing to scheduled emails:", error);
        toast({
          title: "Error",
          description: "Failed to load scheduled emails",
          variant: "destructive",
        });
        setIsLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [statusFilter]);

  // Handle emailId URL parameter to auto-open email view
  useEffect(() => {
    const emailId = searchParams?.get("emailId");

    if (emailId && scheduledEmails.length > 0 && !isViewEmailDialogOpen) {
      const email = scheduledEmails.find((e) => e.id === emailId);
      if (email && (!selectedEmail || selectedEmail.id !== emailId)) {
        handleViewEmail(email);
      }
    }
  }, [searchParams, scheduledEmails]);

  // Create new scheduled email
  const handleCreateScheduledEmail = async () => {
    if (
      !newEmailData.to ||
      !newEmailData.subject ||
      !newEmailData.htmlContent ||
      !newEmailData.scheduledFor
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert date to datetime with 9:00 AM time
      const scheduledDate = new Date(newEmailData.scheduledFor);
      scheduledDate.setHours(9, 0, 0, 0);

      await ScheduledEmailService.scheduleEmail({
        ...newEmailData,
        scheduledFor: scheduledDate.toISOString(),
      } as ScheduledEmailData);

      toast({
        title: "Success",
        description: "Email scheduled successfully",
      });

      setIsCreateDialogOpen(false);
      setNewEmailData({ maxAttempts: 3 });
      // Real-time listener will auto-update
    } catch (error) {
      console.error("Error scheduling email:", error);
      toast({
        title: "Error",
        description: "Failed to schedule email",
        variant: "destructive",
      });
    }
  };

  // Reschedule email
  const handleRescheduleEmail = async () => {
    if (!selectedEmail || !newScheduleDate) {
      return;
    }

    try {
      // Convert date to datetime with 9:00 AM time
      const scheduledDate = new Date(newScheduleDate);
      scheduledDate.setHours(9, 0, 0, 0);

      await ScheduledEmailService.rescheduleEmail(
        selectedEmail.id,
        scheduledDate.toISOString(),
      );

      toast({
        title: "Success",
        description: "Email rescheduled successfully (9:00 AM)",
      });

      setIsRescheduleDialogOpen(false);
      setNewScheduleDate("");
      // Real-time listener will auto-update
    } catch (error) {
      console.error("Error rescheduling email:", error);
      toast({
        title: "Error",
        description: "Failed to reschedule email",
        variant: "destructive",
      });
    }
  };

  // Cancel email
  const handleCancelEmail = async () => {
    if (!selectedEmail) return;

    try {
      await ScheduledEmailService.cancelScheduledEmail(selectedEmail.id);

      toast({
        title: "Success",
        description: "Email cancelled successfully",
      });

      setIsCancelDialogOpen(false);
      // Real-time listener will auto-update
    } catch (error) {
      console.error("Error cancelling email:", error);
      toast({
        title: "Error",
        description: "Failed to cancel email",
        variant: "destructive",
      });
    }
  };

  // Skip email
  const handleSkipEmail = async () => {
    if (!selectedEmail) return;

    setIsSkippingEmail(true);
    try {
      await ScheduledEmailService.skipScheduledEmail(selectedEmail.id);

      toast({
        title: "Success",
        description: "Email skipped successfully",
      });

      setIsSkipDialogOpen(false);
      // Real-time listener will auto-update
    } catch (error) {
      console.error("Error skipping email:", error);
      toast({
        title: "Error",
        description: "Failed to skip email",
        variant: "destructive",
      });
    } finally {
      setIsSkippingEmail(false);
    }
  };

  // Unskip email
  const handleUnskipEmail = async (emailId: string) => {
    setIsUnskippingEmail(true);
    try {
      await ScheduledEmailService.unskipScheduledEmail(emailId);

      toast({
        title: "Success",
        description: "Email unskipped successfully - status changed to pending",
      });

      // Real-time listener will auto-update
    } catch (error) {
      console.error("Error unskipping email:", error);
      toast({
        title: "Error",
        description: "Failed to unskip email",
        variant: "destructive",
      });
    } finally {
      setIsUnskippingEmail(false);
    }
  };

  // Retry failed email
  const handleRetryEmail = async (emailId: string) => {
    try {
      await ScheduledEmailService.retryFailedEmail(emailId);

      toast({
        title: "Success",
        description: "Email retry scheduled successfully",
      });

      // Real-time listener will auto-update
    } catch (error) {
      console.error("Error retrying email:", error);
      toast({
        title: "Error",
        description: "Failed to retry email",
        variant: "destructive",
      });
    }
  };

  // Trigger manual processing (for testing) - opens confirmation
  const handleTriggerProcessing = async () => {
    setIsProcessNowConfirmOpen(true);
  };

  // Perform the actual trigger with loading modal
  const doTriggerProcessing = async () => {
    setIsProcessingNow(true);
    try {
      setIsProcessNowConfirmOpen(false);
      await ScheduledEmailService.triggerProcessing();
      toast({
        title: "Success",
        description: "Email processing triggered",
      });
    } catch (error) {
      console.error("Error triggering processing:", error);
      toast({
        title: "Error",
        description: "Failed to trigger processing",
        variant: "destructive",
      });
    } finally {
      setIsProcessingNow(false);
    }
  };

  // Delete all payment reminders for a booking
  const handleDeletePaymentReminders = async () => {
    if (!selectedBookingId) return;

    try {
      setIsDeletingPaymentReminders(true);
      setIsDeletePaymentRemindersDialogOpen(false);

      const result =
        await ScheduledEmailService.deletePaymentReminders(selectedBookingId);

      toast({
        title: "Success",
        description: `Deleted ${result.deletedCount} payment reminder${
          result.deletedCount !== 1 ? "s" : ""
        } and disabled payment reminders for this booking`,
      });

      setSelectedBookingId(null);
      // Real-time listener will auto-update
    } catch (error) {
      console.error("Error deleting payment reminders:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment reminders",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPaymentReminders(false);
    }
  };

  // Schedule quick reminder helper
  const scheduleQuickReminder = (daysFromNow: number, type: string) => {
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + daysFromNow);

    setNewEmailData({
      ...newEmailData,
      scheduledFor: scheduledFor.toISOString(),
      emailType: type,
      subject: `${type.charAt(0).toUpperCase() + type.slice(1)} Reminder`,
    });
    setIsCreateDialogOpen(true);
  };

  // Handle view email
  const handleViewEmail = async (email: ScheduledEmail) => {
    setSelectedEmail(email);

    // Add emailId to URL
    const params = new URLSearchParams(searchParams?.toString?.() ?? "");
    params.set("emailId", email.id);
    router.push(`/mail/payment-reminders?${params.toString()}`, {
      scroll: false,
    });

    let htmlContent = email.htmlContent;
    let subject = email.subject;
    let actualBookingId: string | undefined = undefined;

    console.log("handleViewEmail called for email:", email.id);
    console.log("Email type:", email.emailType);
    console.log("Email status:", email.status);
    console.log("Booking ID:", email.bookingId);
    console.log("Template ID:", email.templateId);
    console.log("Has template variables:", !!email.templateVariables);

    // Re-render template for payment reminders with current template design
    // Always fetch fresh booking data to show current state (including date paid)
    if (
      email.emailType === "payment-reminder" &&
      email.bookingId &&
      email.templateId &&
      email.templateVariables
    ) {
      console.log(
        `Starting template re-render for ${email.status} email with fresh booking data...`,
      );
      try {
        // Always fetch fresh booking data from Firestore
        console.log("Fetching fresh booking data from Firestore...");
        const bookingRef = doc(db, "bookings", email.bookingId);
        const bookingDoc = await getDoc(bookingRef);

        console.log("Booking doc exists:", bookingDoc.exists());

        if (!bookingDoc.exists()) {
          throw new Error(`Booking ${email.bookingId} not found in database`);
        }

        const bookingData = bookingDoc.data()!;
        console.log("Fetched booking data:", bookingData);

        // Store the actual bookingId from the booking document
        actualBookingId = bookingData.bookingId;

        // Update template variables with fresh data
        const freshVariables: Record<string, any> = {
          ...email.templateVariables,
          // Update key fields with fresh data
          fullName: bookingData.fullName,
          emailAddress: bookingData.emailAddress,
          tourPackageName: bookingData.tourPackageName,
          bookingId: bookingData.bookingId,
          tourDate: bookingData.tourDate,
          paid: bookingData.paid,
          remainingBalance: bookingData.remainingBalance,
          originalTourCost: bookingData.originalTourCost,
          discountedTourCost: bookingData.discountedTourCost,
          // Use the paymentMethod field from booking data
          paymentMethod: bookingData.paymentMethod || "Other",
          paymentPlan: bookingData.availablePaymentTerms || "",
          accessToken: bookingData.access_token || "",
        };

        // Helper function to parse due date for a specific term
        const parseDueDateForTerm = (
          dueDateRaw: any,
          termIndex: number,
        ): string => {
          if (!dueDateRaw) return "";

          if (typeof dueDateRaw === "string" && dueDateRaw.includes(",")) {
            const parts = dueDateRaw.split(",").map((p) => p.trim());
            // Dates are in format: "Month Day", "Year", "Month Day", "Year"
            // For term index n, we need parts[n*2] + ", " + parts[n*2+1]
            if (parts.length > termIndex * 2 + 1) {
              return `${parts[termIndex * 2]}, ${parts[termIndex * 2 + 1]}`;
            }
          }

          return dueDateRaw;
        };

        // Helper function to format currency
        const formatGBP = (value: any): string => {
          if (!value) return "£0.00";
          return `£${Number(value).toFixed(2)}`;
        };

        // Helper function to format date
        const formatDate = (dateValue: any): string => {
          if (!dateValue) return "";

          try {
            let date: Date | null = null;

            // Handle Firestore Timestamp objects
            if (dateValue && typeof dateValue === "object") {
              if (dateValue.seconds) {
                date = new Date(dateValue.seconds * 1000);
              } else if (
                dateValue.type === "firestore/timestamp/1.0" &&
                dateValue.seconds
              ) {
                date = new Date(dateValue.seconds * 1000);
              }
            }
            // Handle string dates
            else if (typeof dateValue === "string" && dateValue.trim() !== "") {
              date = new Date(dateValue);
            }
            // Handle Date objects
            else if (dateValue instanceof Date) {
              date = dateValue;
            }

            // Validate and format
            if (date && !isNaN(date.getTime())) {
              return date.toISOString().split("T")[0];
            }

            return "";
          } catch (error) {
            console.warn("Error formatting date:", error, "Value:", dateValue);
            return "";
          }
        };

        // Update payment term data if applicable
        if (email.templateVariables.paymentTerm) {
          const term = email.templateVariables.paymentTerm as string;
          const termLower = term.toLowerCase();
          const termIndex = parseInt(term.replace("P", "")) - 1;

          // Parse due date for this specific term
          const dueDateRaw = (bookingData as any)[`${termLower}DueDate`];
          const parsedDueDate = parseDueDateForTerm(dueDateRaw, termIndex);

          freshVariables[`${termLower}Amount`] = (bookingData as any)[
            `${termLower}Amount`
          ];
          freshVariables[`${termLower}DueDate`] = parsedDueDate;
          freshVariables[`${termLower}DatePaid`] = (bookingData as any)[
            `${termLower}DatePaid`
          ];

          // Update the main dueDate and amount with parsed values
          freshVariables.dueDate = formatDate(parsedDueDate);
          freshVariables.amount = formatGBP(
            (bookingData as any)[`${termLower}Amount`],
          );
        }

        // Update term data array if showTable is true
        if (
          email.templateVariables.showTable &&
          email.templateVariables.termData
        ) {
          const allTerms = ["P1", "P2", "P3", "P4"];

          // Determine which terms to show based on payment plan
          // If availablePaymentTerms is "P3", we should show P1, P2, P3
          const paymentPlanValue =
            bookingData.availablePaymentTerms || bookingData.paymentPlan || "";
          let maxTermIndex = 0;

          // Extract the highest payment term number
          if (paymentPlanValue.includes("P4")) {
            maxTermIndex = 4;
          } else if (paymentPlanValue.includes("P3")) {
            maxTermIndex = 3;
          } else if (paymentPlanValue.includes("P2")) {
            maxTermIndex = 2;
          } else if (paymentPlanValue.includes("P1")) {
            maxTermIndex = 1;
          }

          // Get all terms up to the max payment plan
          const availableTerms = allTerms.slice(0, maxTermIndex);

          // Only show terms up to current payment term
          const currentTerm = email.templateVariables.paymentTerm as string;
          const currentTermIndex = allTerms.indexOf(currentTerm);
          const visibleTerms = availableTerms.slice(0, currentTermIndex + 1);

          console.log("Payment plan value:", paymentPlanValue);
          console.log("Max term index:", maxTermIndex);
          console.log("Available terms:", availableTerms);
          console.log("Current term:", currentTerm);
          console.log("Visible terms:", visibleTerms);

          freshVariables.termData = visibleTerms.map((t) => {
            const tIndex = parseInt(t.replace("P", "")) - 1;
            const tLower = t.toLowerCase();
            const dueDateRaw = (bookingData as any)[`${tLower}DueDate`];
            const parsedDueDate = parseDueDateForTerm(dueDateRaw, tIndex);

            return {
              term: t,
              amount: formatGBP((bookingData as any)[`${tLower}Amount`]),
              dueDate: formatDate(parsedDueDate),
              datePaid: formatDate((bookingData as any)[`${tLower}DatePaid`]),
            };
          });

          // Update totals
          freshVariables.totalAmount = formatGBP(
            bookingData.useDiscountedTourCost
              ? bookingData.discountedTourCost
              : bookingData.originalTourCost,
          );
          freshVariables.paid = formatGBP(bookingData.paid);
          freshVariables.remainingBalance = formatGBP(
            bookingData.remainingBalance,
          );
        }

        console.log("Fresh variables prepared:", freshVariables);
        console.log("Term data:", freshVariables.termData);
        console.log("Payment Method:", freshVariables.paymentMethod);
        console.log("Due Date:", freshVariables.dueDate);
        console.log("Amount:", freshVariables.amount);

        // Fetch the template from the database to ensure we're using the latest version
        console.log("Fetching template from database:", email.templateId);
        const templateRef = doc(db, "emailTemplates", email.templateId);
        const templateDoc = await getDoc(templateRef);

        if (!templateDoc.exists()) {
          throw new Error(`Template ${email.templateId} not found in database`);
        }

        const templateData = templateDoc.data();
        const rawTemplateHtml = templateData.content || "";

        if (!rawTemplateHtml) {
          throw new Error(`Template ${email.templateId} has no content`);
        }

        console.log("Successfully fetched template from database");

        // Re-render the template using EmailTemplateService
        htmlContent = EmailTemplateService.processTemplate(
          rawTemplateHtml,
          freshVariables,
        );

        console.log("Rendered HTML length:", htmlContent.length);
        console.log("Rendered HTML preview:", htmlContent.substring(0, 500));

        // Update subject with fresh data
        subject = `Payment Reminder - ${freshVariables.fullName} - ${
          email.templateVariables.paymentTerm || "Payment"
        } Due`;

        console.log(
          `Successfully re-rendered template with fresh booking data`,
        );
      } catch (error) {
        console.error("Error re-rendering template:", error);
        // Fall back to original content if re-rendering fails
      }
    }

    setViewEmailData({
      to: email.to,
      cc: email.cc?.join(", ") || "",
      bcc: email.bcc?.join(", ") || "",
      subject: subject,
      htmlContent: htmlContent,
      actualBookingId: actualBookingId,
    });
    setIsViewEmailDialogOpen(true);
  };

  // Rich text editor commands
  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    handleInput();
  };

  // Handle editor input
  const handleInput = () => {
    if (editorRef.current && viewEmailData) {
      const sanitized = DOMPurify.sanitize(editorRef.current.innerHTML, {
        ALLOWED_TAGS: [
          "div",
          "span",
          "p",
          "b",
          "i",
          "u",
          "br",
          "strong",
          "em",
          "a",
          "img",
          "table",
          "tr",
          "td",
          "tbody",
          "thead",
          "h1",
          "h2",
          "h3",
          "ul",
          "ol",
          "li",
        ],
        ALLOWED_ATTR: [
          "style",
          "class",
          "href",
          "src",
          "alt",
          "width",
          "height",
        ],
      });
      setViewEmailData({
        ...viewEmailData,
        htmlContent: sanitized,
      });
    }
  };

  // Update editor content when dialog opens
  useEffect(() => {
    if (isViewEmailDialogOpen && viewEmailData && editorRef.current) {
      // Set the content when dialog opens or email changes
      const content = viewEmailData.htmlContent || "";
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content;
      }
    } else if (!isViewEmailDialogOpen && editorRef.current) {
      // Clear editor when dialog closes
      editorRef.current.innerHTML = "";
    }
  }, [isViewEmailDialogOpen, viewEmailData]);

  // Handle update email content
  const handleUpdateEmail = async () => {
    if (!selectedEmail || !viewEmailData) return;

    try {
      await ScheduledEmailService.updateScheduledEmail(selectedEmail.id, {
        to: viewEmailData.to,
        cc: viewEmailData.cc
          ? viewEmailData.cc.split(",").map((e) => e.trim())
          : undefined,
        bcc: viewEmailData.bcc
          ? viewEmailData.bcc.split(",").map((e) => e.trim())
          : undefined,
        subject: viewEmailData.subject,
        htmlContent: viewEmailData.htmlContent,
      });

      toast({
        title: "Success",
        description: "Email updated successfully",
      });

      setIsViewEmailDialogOpen(false);
      handleCloseViewDialog();
    } catch (error) {
      console.error("Error updating email:", error);
      toast({
        title: "Error",
        description: "Failed to update email",
        variant: "destructive",
      });
    }
  };

  // Handle closing view dialog and clearing URL parameter
  const handleCloseViewDialog = () => {
    setIsViewEmailDialogOpen(false);
    setSelectedEmail(null);
    setViewEmailData(null);

    // Clear emailId from URL
    const params = new URLSearchParams(searchParams?.toString?.() ?? "");
    params.delete("emailId");
    router.push(`/mail/payment-reminders?${params.toString()}`, {
      scroll: false,
    });
  };

  // Format date for display
  const formatDate = (dateValue: Date | string | null | undefined) => {
    if (!dateValue) {
      return "";
    }

    let date: Date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if ((dateValue as any)?.toDate) {
      date = (dateValue as any).toDate();
    } else {
      date = new Date(dateValue);
    }

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Create Fuse instance for fuzzy search on scheduled emails
  const fuse = useMemo(() => {
    if (scheduledEmails.length === 0) return null;

    return new Fuse(scheduledEmails, {
      keys: [
        { name: "subject", weight: 1.0 },
        { name: "to", weight: 0.9 },
        {
          name: "cc",
          getFn: (email: ScheduledEmail) => {
            return (email.cc || []).join(", ");
          },
          weight: 0.7,
        },
        {
          name: "bcc",
          getFn: (email: ScheduledEmail) => {
            return (email.bcc || []).join(", ");
          },
          weight: 0.7,
        },
        { name: "emailType", weight: 0.8 },
        { name: "bookingId", weight: 0.9 },
        {
          name: "templateVariablesBookingId",
          getFn: (email: ScheduledEmail) => {
            return (email.templateVariables as any)?.bookingId || "";
          },
          weight: 1.0, // High priority for booking reference
        },
      ],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [scheduledEmails]);

  // Filter emails based on search and status using Fuse for better search
  const filteredEmails = useMemo(() => {
    let results = scheduledEmails;

    // Apply Fuse search if search term is provided
    if (searchTerm !== "" && fuse) {
      const fuseResults = fuse.search(searchTerm);
      results = fuseResults.map((result) => result.item);
    } else if (searchTerm === "") {
      results = scheduledEmails;
    } else {
      // Fallback to basic filtering if Fuse fails
      results = scheduledEmails.filter((email) => {
        const lowerSearch = searchTerm.toLowerCase();
        return (
          email.subject.toLowerCase().includes(lowerSearch) ||
          email.to.toLowerCase().includes(lowerSearch) ||
          (email.cc &&
            email.cc.join(", ").toLowerCase().includes(lowerSearch)) ||
          (email.bcc &&
            email.bcc.join(", ").toLowerCase().includes(lowerSearch)) ||
          (email.emailType &&
            email.emailType.toLowerCase().includes(lowerSearch)) ||
          (email.bookingId &&
            email.bookingId.toLowerCase().includes(lowerSearch)) ||
          ((email.templateVariables as any)?.bookingId &&
            String((email.templateVariables as any).bookingId)
              .toLowerCase()
              .includes(lowerSearch))
        );
      });
    }

    // Apply status filter
    results = results.filter(
      (email) => statusFilter === "all" || email.status === statusFilter,
    );

    // Apply date range filter
    if (dateFrom || dateTo) {
      results = results.filter((email) => {
        const emailDate = new Date(email.scheduledFor);
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (emailDate < fromDate) return false;
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (emailDate > toDate) return false;
        }
        return true;
      });
    }

    return results;
  }, [scheduledEmails, searchTerm, statusFilter, dateFrom, dateTo, fuse]);

  // Group emails by bookingId and extract row from first email in each group
  const groupEmailsByBookingId = (emails: ScheduledEmail[]) => {
    const grouped: Record<string, ScheduledEmail[]> = {};
    const ungrouped: ScheduledEmail[] = [];

    emails.forEach((email) => {
      if (email.bookingId) {
        if (!grouped[email.bookingId]) {
          grouped[email.bookingId] = [];
        }
        grouped[email.bookingId].push(email);
      } else {
        ungrouped.push(email);
      }
    });

    return { grouped, ungrouped };
  };

  const { grouped: groupedEmails, ungrouped: ungroupedEmails } =
    groupEmailsByBookingId(filteredEmails);

  // Track scroll position for scroll buttons
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      const isAtTop = scrollTop <= 10;
      const isAtBottom = scrollTop >= documentHeight - windowHeight - 10;

      // Set data attributes for CSS
      document.body.setAttribute(
        "data-scroll",
        isAtTop ? "top" : isAtBottom ? "bottom" : "middle",
      );
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll functions
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  // Navigate to booking detail
  const handleNavigateToBooking = (bookingId: string) => {
    window.open(`/bookings?tab=bookings&bookingId=${bookingId}`, "_blank");
  };

  // Toggle group open/closed
  const toggleGroup = (bookingId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Scheduled Emails
          </h2>
          <p className="text-muted-foreground">
            Manage and schedule emails to be sent at specific times
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Email
          </Button>
          <Button
            onClick={() => setIsProcessNowConfirmOpen(true)}
            variant="outline"
            size="sm"
            disabled={isProcessingNow}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isProcessingNow ? "Processing..." : "Process Now"}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Schedule</CardTitle>
          <CardDescription>Common scheduling shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scheduleQuickReminder(1, "follow-up")}
            >
              Follow-up (1 day)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scheduleQuickReminder(3, "reminder")}
            >
              Reminder (3 days)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scheduleQuickReminder(7, "weekly-check")}
            >
              Weekly Check (7 days)
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by booking ID, recipient, subject, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 items-center">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                Date Range:
              </Label>
              <div className="flex-1 flex gap-2 items-center">
                <Input
                  type="date"
                  placeholder="From"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  placeholder="To"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading scheduled emails...</p>
          </CardContent>
        </Card>
      )}

      {/* Loading Modal for Triggering Processing */}
      {isProcessingNow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Triggering Email Processing
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Processing pending scheduled emails. This may take a few
                    moments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Emails List */}
      <div className="space-y-3">
        {/* Grouped Emails by Booking */}
        {Object.entries(groupedEmails)
          .sort(([, emailsA], [, emailsB]) => {
            // Get row from first email in each group
            const rowA = emailsA[0]?.row ?? 999999;
            const rowB = emailsB[0]?.row ?? 999999;
            return rowA - rowB; // Ascending order
          })
          .map(([bookingId, emails]) => {
            const isOpen = openGroups[bookingId] ?? true;
            const allStatuses = emails.map((e) => e.status);
            const hasPending = allStatuses.includes("pending");
            const hasFailed = allStatuses.includes("failed");
            const allSent = allStatuses.every((s) => s === "sent");
            // Get the actual bookingId from templateVariables if available
            const actualBookingId =
              emails[0]?.templateVariables?.bookingId || bookingId;

            return (
              <Card
                key={bookingId}
                className="border-l-4 border-l-crimson-red hover:shadow-lg transition-shadow"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <CardTitle className="text-lg">
                          {emails[0]?.row && (
                            <span className="text-muted-foreground font-normal mr-2">
                              Row {emails[0].row}:
                            </span>
                          )}
                          Booking: {actualBookingId}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-red-50 text-crimson-red border-crimson-red"
                        >
                          {emails.length} email{emails.length > 1 ? "s" : ""}
                        </Badge>
                        {allSent && (
                          <Badge className="bg-green-100 text-green-800 border border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            All Sent
                          </Badge>
                        )}
                        {hasPending && (
                          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {hasFailed && (
                          <Badge className="bg-red-100 text-red-800 border border-red-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {emails[0].to} • Payment reminder emails
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigateToBooking(bookingId)}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Booking
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedBookingId(bookingId);
                          setIsDeletePaymentRemindersDialogOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroup(bookingId)}
                      >
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleGroup(bookingId)}
                >
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-2">
                      {emails.map((email) => (
                        <div
                          key={email.id}
                          className="border border-field-border rounded-lg p-3 bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={statusStyles[email.status]}>
                                  {statusIcons[email.status]}
                                  <span className="ml-1 capitalize">
                                    {email.status}
                                  </span>
                                </Badge>
                                {email.emailType && (
                                  <Badge variant="outline">
                                    {email.emailType}
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  Attempt {email.attempts}/{email.maxAttempts}
                                </span>
                              </div>

                              <h4 className="font-medium text-foreground mb-0.5 truncate">
                                {email.subject}
                              </h4>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  Scheduled: {formatDate(email.scheduledFor)}
                                </span>
                              </div>

                              {email.errorMessage && (
                                <p className="text-sm text-red-600 mt-2">
                                  Error: {email.errorMessage}
                                </p>
                              )}

                              {email.sentAt && (
                                <p className="text-sm text-green-600 mt-2">
                                  Sent: {formatDate(email.sentAt)}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewEmail(email)}
                                title="View Email"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {email.status === "pending" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEmail(email);
                                      const isoString =
                                        typeof email.scheduledFor === "string"
                                          ? email.scheduledFor
                                          : (email.scheduledFor as any)?.toDate
                                            ? (email.scheduledFor as any)
                                                .toDate()
                                                .toISOString()
                                            : new Date(
                                                email.scheduledFor as unknown as
                                                  | string
                                                  | number
                                                  | Date,
                                              ).toISOString();
                                      setNewScheduleDate(
                                        isoString.slice(0, 10),
                                      );
                                      setIsRescheduleDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEmail(email);
                                      setIsSkipDialogOpen(true);
                                    }}
                                    title="Skip this email"
                                  >
                                    <Pause className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              {email.status === "skipped" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnskipEmail(email.id)}
                                  title="Unskip this email"
                                  disabled={isUnskippingEmail}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                              {email.status === "failed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetryEmail(email.id)}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}

        {/* Ungrouped Emails (no bookingId) */}
        {ungroupedEmails.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Other Scheduled Emails
            </h3>
            {ungroupedEmails.map((email) => (
              <Card
                key={email.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusStyles[email.status]}>
                          {statusIcons[email.status]}
                          <span className="ml-1 capitalize">
                            {email.status}
                          </span>
                        </Badge>
                        {email.emailType && (
                          <Badge variant="outline">{email.emailType}</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Attempt {email.attempts}/{email.maxAttempts}
                        </span>
                      </div>

                      <h3 className="font-medium text-foreground mb-1 truncate">
                        {email.subject}
                      </h3>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          To: {email.to}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Scheduled: {formatDate(email.scheduledFor)}
                        </span>
                      </div>

                      {email.errorMessage && (
                        <p className="text-sm text-red-600 mt-2">
                          Error: {email.errorMessage}
                        </p>
                      )}

                      {email.sentAt && (
                        <p className="text-sm text-green-600 mt-2">
                          Sent: {formatDate(email.sentAt)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewEmail(email)}
                        title="View Email"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {email.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEmail(email);
                              const isoString =
                                typeof email.scheduledFor === "string"
                                  ? email.scheduledFor
                                  : (email.scheduledFor as any)?.toDate
                                    ? (email.scheduledFor as any)
                                        .toDate()
                                        .toISOString()
                                    : new Date(
                                        email.scheduledFor as unknown as
                                          | string
                                          | number
                                          | Date,
                                      ).toISOString();
                              setNewScheduleDate(isoString.slice(0, 10));
                              setIsRescheduleDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEmail(email);
                              setIsSkipDialogOpen(true);
                            }}
                            title="Skip this email"
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {email.status === "skipped" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnskipEmail(email.id)}
                          title="Unskip this email"
                          disabled={isUnskippingEmail}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {email.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryEmail(email.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredEmails.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No scheduled emails found
              </h3>
              <p className="text-gray-600">Schedule an email to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Email Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule New Email</DialogTitle>
            <DialogDescription>
              Create an email to be sent at a specific time
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="to">To Email *</Label>
                <Input
                  id="to"
                  value={newEmailData.to || ""}
                  onChange={(e) =>
                    setNewEmailData({ ...newEmailData, to: e.target.value })
                  }
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <Label htmlFor="scheduledFor">Scheduled Date * (9:00 AM)</Label>
                <Input
                  id="scheduledFor"
                  type="date"
                  value={
                    newEmailData.scheduledFor
                      ? new Date(newEmailData.scheduledFor)
                          .toISOString()
                          .slice(0, 10)
                      : ""
                  }
                  onChange={(e) =>
                    setNewEmailData({
                      ...newEmailData,
                      scheduledFor: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={newEmailData.subject || ""}
                onChange={(e) =>
                  setNewEmailData({ ...newEmailData, subject: e.target.value })
                }
                placeholder="Email subject"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emailType">Email Type</Label>
                <Select
                  value={newEmailData.emailType || ""}
                  onValueChange={(value) =>
                    setNewEmailData({ ...newEmailData, emailType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booking-confirmation">
                      Booking Confirmation
                    </SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="notification">Notification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="maxAttempts">Max Attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min="1"
                  max="5"
                  value={newEmailData.maxAttempts || 3}
                  onChange={(e) =>
                    setNewEmailData({
                      ...newEmailData,
                      maxAttempts: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="htmlContent">Email Content *</Label>
              <Textarea
                id="htmlContent"
                rows={8}
                value={newEmailData.htmlContent || ""}
                onChange={(e) =>
                  setNewEmailData({
                    ...newEmailData,
                    htmlContent: e.target.value,
                  })
                }
                placeholder="Enter HTML content or plain text..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateScheduledEmail}>Schedule Email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={isRescheduleDialogOpen}
        onOpenChange={setIsRescheduleDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Email</DialogTitle>
            <DialogDescription>
              Choose a new time for this email to be sent
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="newScheduleDate">
              New Scheduled Date (9:00 AM)
            </Label>
            <Input
              id="newScheduleDate"
              type="date"
              value={newScheduleDate}
              onChange={(e) => setNewScheduleDate(e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Emails are processed daily at 9:00 AM Philippine time
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRescheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRescheduleEmail}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this scheduled email? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Email</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelEmail}>
              Cancel Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Process Now Confirmation Dialog */}
      <AlertDialog
        open={isProcessNowConfirmOpen}
        onOpenChange={setIsProcessNowConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger Email Processing Now</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to trigger email processing now? This will
              process pending scheduled emails (up to 50) immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingNow}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={doTriggerProcessing}
              disabled={isProcessingNow}
            >
              {isProcessingNow ? "Processing..." : "Trigger Processing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={isSkipDialogOpen} onOpenChange={setIsSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip Scheduled Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to skip this scheduled email? The email will
              be marked as skipped and will not be sent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSkippingEmail}>
              Keep Email
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSkipEmail}
              disabled={isSkippingEmail}
            >
              {isSkippingEmail ? "Skipping..." : "Skip Email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment Reminders Confirmation Dialog */}
      <AlertDialog
        open={isDeletePaymentRemindersDialogOpen}
        onOpenChange={setIsDeletePaymentRemindersDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Payment Reminders</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all payment reminder emails for
              this booking?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              This will also:
            </p>
            <ul className="list-disc ml-6 space-y-1 text-sm text-muted-foreground">
              <li>Set "Enable Payment Reminder" to OFF</li>
              <li>Clear all P1-P4 Scheduled Email Links</li>
              <li>
                Delete all pending, sent, and failed payment reminder emails
              </li>
            </ul>
            <p className="mt-4 font-semibold text-red-600 text-sm">
              This action cannot be undone.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePaymentReminders}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete All Reminders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loading Modal for Deleting Payment Reminders */}
      {isDeletingPaymentReminders && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Deleting Payment Reminders
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Removing scheduled emails and updating booking...
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Deleting scheduled payment reminder emails</p>
                <p>• Disabling payment reminders on booking</p>
                <p>• Clearing P1-P4 scheduled email links</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Email Dialog */}
      <Dialog
        open={isViewEmailDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseViewDialog();
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>View Scheduled Email</DialogTitle>
            <DialogDescription>
              View the scheduled email details and content.
            </DialogDescription>
          </DialogHeader>

          {viewEmailData && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Email Recipients - Compact View */}
              <div className="border border-field-border rounded-lg p-3 bg-muted/20 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-medium min-w-[60px]">
                    To:
                  </span>
                  <span className="flex-1 break-words text-foreground">
                    {viewEmailData.to}
                  </span>
                </div>
                {viewEmailData.cc && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-medium min-w-[60px]">
                      CC:
                    </span>
                    <span className="flex-1 break-words text-foreground">
                      {viewEmailData.cc}
                    </span>
                  </div>
                )}
                {viewEmailData.bcc && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-medium min-w-[60px]">
                      BCC:
                    </span>
                    <span className="flex-1 break-words text-foreground">
                      {viewEmailData.bcc}
                    </span>
                  </div>
                )}
                <div className="flex items-start gap-2 pt-1 border-t border-field-border">
                  <span className="text-muted-foreground font-medium min-w-[60px]">
                    Subject:
                  </span>
                  <span className="flex-1 break-words font-medium text-foreground">
                    {viewEmailData.subject}
                  </span>
                </div>
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <Label>Email Content</Label>

                {/* Email Preview */}
                <div
                  key={selectedEmail?.id}
                  className="border border-field-border rounded-md p-4 bg-background dark:bg-muted/10 min-h-[300px] max-h-[500px] overflow-y-auto"
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: "14px",
                  }}
                  dangerouslySetInnerHTML={{
                    __html: viewEmailData.htmlContent,
                  }}
                />
              </div>

              {/* Email Metadata */}
              {selectedEmail && (
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-semibold text-sm">Email Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        className={`ml-2 ${statusStyles[selectedEmail.status]}`}
                      >
                        {selectedEmail.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 text-foreground">
                        {selectedEmail.emailType || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Scheduled For:
                      </span>
                      <span className="ml-2 text-foreground">
                        {formatDate(selectedEmail.scheduledFor)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Attempts:</span>
                      <span className="ml-2 text-foreground">
                        {selectedEmail.attempts}/{selectedEmail.maxAttempts}
                      </span>
                    </div>
                    {selectedEmail.bookingId && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Booking ID:
                        </span>
                        <span className="ml-2 font-mono text-xs text-foreground">
                          {viewEmailData?.actualBookingId ||
                            selectedEmail.bookingId}
                        </span>
                      </div>
                    )}
                    {selectedEmail.sentAt && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Sent At:</span>
                        <span className="ml-2 text-green-600">
                          {formatDate(selectedEmail.sentAt)}
                        </span>
                      </div>
                    )}
                    {selectedEmail.messageId && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">
                          Gmail Link:
                        </span>
                        <a
                          href={`https://mail.google.com/mail/u/0/#sent/${selectedEmail.messageId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View in Gmail
                        </a>
                      </div>
                    )}
                    {selectedEmail.errorMessage && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Error:</span>
                        <span className="ml-2 text-red-600">
                          {selectedEmail.errorMessage}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseViewDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Scroll Buttons - CSS-only visibility */}
      <Button
        onClick={scrollToTop}
        size="sm"
        className="fixed right-6 bottom-20 z-50 h-10 w-10 rounded-full bg-crimson-red hover:bg-crimson-red/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 scroll-to-top-btn"
        title="Scroll to top"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        onClick={scrollToBottom}
        size="sm"
        className="fixed right-6 bottom-6 z-50 h-10 w-10 rounded-full bg-crimson-red hover:bg-crimson-red/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 scroll-to-bottom-btn"
        title="Scroll to bottom"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
