"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmailAvatar } from "@/components/ui/email-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Calendar,
  Star,
  StarOff,
  MoreVertical,
  Reply,
  Forward,
  Archive,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Download,
} from "lucide-react";

// Gmail Email type
interface GmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string; // For inline attachments
}

interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  htmlContent: string;
  textContent: string;
  labels: string[];
  snippet: string;
  isRead: boolean;
  isSent: boolean;
  isReceived: boolean;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  bcc?: string;
  cc?: string;
  isStarred?: boolean;
  hasAttachments?: boolean;
  attachments?: GmailAttachment[];
  isImportant?: boolean;
}

interface EmailViewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmail: GmailEmail | null;
  isLoadingFullContent: boolean;
  onReply?: (email: GmailEmail) => void;
  onForward?: (email: GmailEmail) => void;
  onGmailOpen?: () => void;
}

// Global flag to track if we should prevent modal close
let shouldPreventClose = false;

// Helper function to get avatar initials
function getAvatarInitials(email: string): string {
  const name = email?.match(/^([^<]+)/)?.[1]?.trim() || email;
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Helper function to format sender name with email
function formatSenderWithEmail(fromString: string): React.ReactNode {
  if (!fromString) return "Unknown";

  // Handle format "Name <email@domain.com>"
  const match = fromString.match(/^(.+?)\s*<(.+@.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, ""); // Remove quotes if present
    const email = match[2].trim();
    return (
      <>
        <span className="text-sm font-medium text-gray-900">{name}</span>
        <span className="text-xs text-gray-500 ml-1">&lt;{email}&gt;</span>
      </>
    );
  }

  // Handle format "email@domain.com" (just email, no name)
  if (fromString.includes("@")) {
    const emailPart = fromString.split("@")[0];
    const name = emailPart
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    return (
      <>
        <span className="text-sm font-medium text-gray-900">{name}</span>
        <span className="text-xs text-gray-500 ml-1">&lt;{fromString}&gt;</span>
      </>
    );
  }

  // Return as-is if no email format detected
  return (
    <span className="text-sm font-medium text-gray-900">{fromString}</span>
  );
}

export function EmailViewModal({
  isOpen,
  onOpenChange,
  selectedEmail,
  isLoadingFullContent,
  onReply,
  onForward,
  onGmailOpen,
}: EmailViewModalProps) {
  const [threadEmails, setThreadEmails] = useState<GmailEmail[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());
  const [showAllEmails, setShowAllEmails] = useState(false); // New state for collapsing middle emails

  // Fetch thread emails when selectedEmail changes
  useEffect(() => {
    if (selectedEmail?.threadId && isOpen) {
      fetchThreadEmails(selectedEmail.threadId);
    }
  }, [selectedEmail?.threadId, isOpen]);

  // Fetch all emails in the thread
  const fetchThreadEmails = async (threadId: string) => {
    setIsLoadingThread(true);
    try {
      const response = await fetch(`/api/gmail/threads/${threadId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result?.success) {
        const emails = result.data.emails.map((email: any) => ({
          ...email,
          date: new Date(email.date),
        }));

        setThreadEmails(emails);

        // Auto-expand the latest email
        if (emails.length > 0) {
          const latestEmail = emails[emails.length - 1];
          setExpandedEmails(new Set([latestEmail.id]));
        }
      } else {
        throw new Error(result.error || "Failed to fetch thread emails");
      }
    } catch (error) {
      console.error("Error fetching thread emails:", error);
      // Fallback to single email if thread fetch fails
      if (selectedEmail) {
        setThreadEmails([selectedEmail]);
        setExpandedEmails(new Set([selectedEmail.id]));
      }
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Toggle email expansion
  const toggleEmailExpansion = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  // Toggle quote expansion for specific email
  const toggleQuoteExpansion = (emailId: string) => {
    console.log("toggleQuoteExpansion called for email:", emailId);
    const newExpandedQuotes = new Set(expandedQuotes);
    if (newExpandedQuotes.has(emailId)) {
      console.log("Removing email from expanded quotes");
      newExpandedQuotes.delete(emailId);
    } else {
      console.log("Adding email to expanded quotes");
      newExpandedQuotes.add(emailId);
    }
    console.log("New expanded quotes set:", newExpandedQuotes);
    setExpandedQuotes(newExpandedQuotes);
  };

  // Handle reply and forward - delegate to parent
  const handleReply = (email: GmailEmail) => {
    if (onReply) {
      onReply(email);
    }
  };

  const handleForward = (email: GmailEmail) => {
    if (onForward) {
      onForward(email);
    }
  };

  // Handle attachment download
  const handleAttachmentDownload = async (
    messageId: string,
    attachment: GmailAttachment
  ) => {
    try {
      console.log("Downloading attachment:", attachment.filename);

      const response = await fetch(
        `/api/gmail/attachments/${messageId}/${attachment.attachmentId}`
      );

      if (!response.ok) {
        throw new Error("Failed to download attachment");
      }

      const data = await response.json();

      if (data.success) {
        // Convert base64 to blob and download
        const base64Data = data.data.data.replace(/-/g, "+").replace(/_/g, "/");
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: attachment.mimeType });
        const url = URL.createObjectURL(blob);

        // Create download link
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("Download completed:", attachment.filename);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error downloading attachment:", error);
      // You could add a toast notification here
    }
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Get file icon/preview based on MIME type
  const getFileIcon = (
    mimeType: string,
    filename: string,
    messageId: string,
    attachmentId: string
  ) => {
    const extension = filename.split(".").pop()?.toLowerCase() || "";

    // Image files - show actual preview
    if (mimeType.startsWith("image/")) {
      return (
        <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100">
          <img
            src={`/api/gmail/attachments/${messageId}/${attachmentId}?preview=true`}
            alt={filename}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to generic icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                    <div class="text-green-700 font-bold text-xs">IMG</div>
                  </div>
                `;
              }
            }}
          />
        </div>
      );
    }

    // PDF files
    if (mimeType === "application/pdf" || extension === "pdf") {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center relative">
          <div className="text-red-700 font-bold text-xs">PDF</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">📄</span>
          </div>
        </div>
      );
    }

    // Word documents
    if (mimeType.includes("word") || ["doc", "docx"].includes(extension)) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center relative">
          <div className="text-blue-700 font-bold text-xs">DOC</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">📝</span>
          </div>
        </div>
      );
    }

    // Excel files
    if (mimeType.includes("sheet") || ["xls", "xlsx"].includes(extension)) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center relative">
          <div className="text-green-700 font-bold text-xs">XLS</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">📊</span>
          </div>
        </div>
      );
    }

    // PowerPoint files
    if (
      mimeType.includes("presentation") ||
      ["ppt", "pptx"].includes(extension)
    ) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center relative">
          <div className="text-orange-700 font-bold text-xs">PPT</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">📊</span>
          </div>
        </div>
      );
    }

    // ZIP/Archive files
    if (
      mimeType.includes("zip") ||
      mimeType.includes("archive") ||
      ["zip", "rar", "7z"].includes(extension)
    ) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center relative">
          <div className="text-purple-700 font-bold text-xs">ZIP</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">🗜️</span>
          </div>
        </div>
      );
    }

    // Text files
    if (mimeType.startsWith("text/") || ["txt", "csv"].includes(extension)) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center relative">
          <div className="text-gray-700 font-bold text-xs">TXT</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">📄</span>
          </div>
        </div>
      );
    }

    // Video files
    if (mimeType.startsWith("video/")) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center relative">
          <div className="text-indigo-700 font-bold text-xs">VID</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">🎥</span>
          </div>
        </div>
      );
    }

    // Audio files
    if (mimeType.startsWith("audio/")) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg flex items-center justify-center relative">
          <div className="text-pink-700 font-bold text-xs">AUD</div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs leading-none">🎵</span>
          </div>
        </div>
      );
    }

    // Default file icon
    return (
      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
        <Paperclip className="w-6 h-6 text-gray-600" />
      </div>
    );
  };

  // Get human-readable file type
  const getFileTypeDisplay = (mimeType: string): string => {
    const typeMap: Record<string, string> = {
      "application/pdf": "PDF Document",
      "application/msword": "Word Document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "Word Document",
      "application/vnd.ms-excel": "Excel Spreadsheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "Excel Spreadsheet",
      "application/vnd.ms-powerpoint": "PowerPoint Presentation",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "PowerPoint Presentation",
      "application/zip": "ZIP Archive",
      "text/plain": "Text File",
      "text/csv": "CSV File",
    };

    if (typeMap[mimeType]) {
      return typeMap[mimeType];
    }

    if (mimeType.startsWith("image/")) return "Image";
    if (mimeType.startsWith("video/")) return "Video";
    if (mimeType.startsWith("audio/")) return "Audio";
    if (mimeType.startsWith("text/")) return "Text File";

    return "File";
  };

  // Helper function to replace cid: references with attachment URLs
  const sanitizeCidReferences = (html: string, email: GmailEmail): string => {
    if (!html || !email.attachments || email.attachments.length === 0) {
      return html;
    }

    let sanitized = html;

    // Escape regex special characters
    const escapeRegExp = (string: string): string => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    email.attachments.forEach((attachment) => {
      if (attachment.contentId) {
        // Remove angle brackets from contentId if present
        const cleanContentId = attachment.contentId.replace(/[<>]/g, "");
        // Replace cid: references in various formats
        sanitized = sanitized.replace(
          new RegExp(`cid:${escapeRegExp(cleanContentId)}`, "gi"),
          `/api/gmail/attachments/${email.id}/${attachment.attachmentId}`
        );
        // Also replace quoted cid: references in src attributes
        sanitized = sanitized.replace(
          new RegExp(`src=["']cid:${escapeRegExp(cleanContentId)}["']`, "gi"),
          `src="/api/gmail/attachments/${email.id}/${attachment.attachmentId}"`
        );
      }
    });

    return sanitized;
  };

  // Process HTML content to handle gmail_quote expansion
  const processEmailContent = (htmlContent: string, emailId: string) => {
    const isQuoteExpanded = expandedQuotes.has(emailId);

    // Find the email data for this emailId (from threadEmails or selectedEmail)
    const email = threadEmails.find((e) => e.id === emailId) || selectedEmail;

    // Sanitize cid: references first
    let sanitizedContent = sanitizeCidReferences(htmlContent, email);

    // Debug: Log the content to see what we're working with
    console.log("Processing email content for ID:", emailId);
    console.log("Is quote expanded:", isQuoteExpanded);

    // Check if content has various quote patterns
    const hasGmailQuote =
      sanitizedContent.includes("gmail_quote") ||
      /class[^>]*=["'][^"']*gmail_quote[^"']*["']/i.test(sanitizedContent) ||
      /<div[^>]*class[^>]*gmail_quote[^>]*>/i.test(sanitizedContent);

    const hasZmailQuote =
      sanitizedContent.includes("blockquote_zmail") ||
      sanitizedContent.includes("zmail_extra") ||
      sanitizedContent.includes('id="blockquote_zmail"');

    const hasGenericBlockquote = sanitizedContent.includes("<blockquote");

    console.log("Gmail quote found:", hasGmailQuote);
    console.log("Zmail quote found:", hasZmailQuote);
    console.log("Generic blockquote found:", hasGenericBlockquote);

    // Additional debug for Gmail quote patterns
    if (hasGmailQuote) {
      const gmailQuoteMatch = htmlContent.match(
        /<div[^>]*class[^>]*gmail_quote[^>]*>/i
      );
      if (gmailQuoteMatch) {
        console.log("Gmail quote element found:", gmailQuoteMatch[0]);
      }
    }

    if (!hasGmailQuote && !hasZmailQuote && !hasGenericBlockquote) {
      console.log("No quote patterns found in content");
      return htmlContent;
    }

    // Try different splitting patterns based on what we found
    // Priority: Gmail first, then Zmail, then generic blockquotes
    let parts: string[] = [];
    let splitPattern = "";
    let quoteMark = "";

    if (hasGmailQuote) {
      // Handle Gmail quotes first (highest priority)
      // Try to find the exact Gmail quote div with flexible class matching
      const gmailQuoteMatch = sanitizedContent.match(
        /<div[^>]*class[^>]*gmail_quote[^>]*>/i
      );

      if (gmailQuoteMatch) {
        parts = sanitizedContent.split(gmailQuoteMatch[0]);
        splitPattern = gmailQuoteMatch[0];
        quoteMark = "gmail";
        console.log("Found Gmail quote with pattern:", gmailQuoteMatch[0]);
      } else if (sanitizedContent.includes('<div class="gmail_quote">')) {
        parts = sanitizedContent.split('<div class="gmail_quote">');
        splitPattern = '<div class="gmail_quote">';
        quoteMark = "gmail";
      } else if (sanitizedContent.includes("<div class='gmail_quote'>")) {
        parts = sanitizedContent.split("<div class='gmail_quote'>");
        splitPattern = "<div class='gmail_quote'>";
        quoteMark = "gmail";
      }
    } else if (hasZmailQuote) {
      // Handle Zoho Mail quotes (zmail_extra is usually the separator)
      if (sanitizedContent.includes('class="zmail_extra"')) {
        parts = sanitizedContent.split('<div class="zmail_extra"');
        splitPattern = '<div class="zmail_extra"';
        quoteMark = "zmail";
      } else if (sanitizedContent.includes('id="blockquote_zmail"')) {
        parts = sanitizedContent.split('<blockquote id="blockquote_zmail"');
        splitPattern = '<blockquote id="blockquote_zmail"';
        quoteMark = "zmail";
      }
    } else if (hasGenericBlockquote) {
      // Handle generic blockquotes (fallback)
      const blockquoteMatch = sanitizedContent.match(/<blockquote[^>]*>/);
      if (blockquoteMatch) {
        parts = sanitizedContent.split(blockquoteMatch[0]);
        splitPattern = blockquoteMatch[0];
        quoteMark = "generic";
      }
    }

    if (parts.length <= 1) {
      console.log("Could not split content into parts with any pattern");
      return sanitizedContent;
    }

    console.log(
      "Successfully split content into",
      parts.length,
      "parts using",
      quoteMark,
      "pattern"
    );

    const beforeQuote = parts[0];
    const afterQuote = splitPattern + parts.slice(1).join(splitPattern);

    if (isQuoteExpanded) {
      // Show full content with hide button in the same position
      return `
        ${beforeQuote}
        <div class="gmail-quote-toggle-container" style="margin: 16px 0;">
          <button 
            class="gmail-quote-toggle-btn" 
            data-email-id="${emailId}"
            style="
              background: none;
              border: none;
              color: #1a73e8;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              padding: 4px 0;
              font-family: Arial, sans-serif;
            "
          >
            <span style="display: inline-block; width: 16px; text-align: center;">⋯</span>
            Hide expanded content
          </button>
        </div>
        ${afterQuote}
      `;
    } else {
      // Show only content before quotes + show button
      return (
        beforeQuote +
        `
        <div class="gmail-quote-toggle-container" style="margin: 16px 0;">
          <button 
            class="gmail-quote-toggle-btn" 
            data-email-id="${emailId}"
            style="
              background: none;
              border: none;
              color: #1a73e8;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              padding: 4px 0;
              font-family: Arial, sans-serif;
            "
          >
            <span style="display: inline-block; width: 16px; text-align: center;">⋯</span>
            Show trimmed content
          </button>
        </div>
        <div class="gmail-quote-hidden" style="display: none;">
          ${afterQuote}
        </div>
      `
      );
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setThreadEmails([]);
      setExpandedEmails(new Set());
      setExpandedQuotes(new Set());
      setShowAllEmails(false);
    }
  }, [isOpen]);

  // Constants for email collapsing logic
  const COLLAPSE_THRESHOLD = 5; // Start collapsing when more than 5 emails
  const SHOW_FROM_START = 2; // Always show first 2 emails
  const SHOW_FROM_END = 2; // Always show last 2 emails

  // Calculate which emails to display
  const getVisibleEmails = () => {
    if (threadEmails.length <= COLLAPSE_THRESHOLD || showAllEmails) {
      return threadEmails;
    }

    const startEmails = threadEmails.slice(0, SHOW_FROM_START);
    const endEmails = threadEmails.slice(-SHOW_FROM_END);
    const collapsedCount =
      threadEmails.length - SHOW_FROM_START - SHOW_FROM_END;

    return { startEmails, endEmails, collapsedCount };
  };

  const toggleShowAllEmails = () => {
    setShowAllEmails(!showAllEmails);
  };

  // Function to render individual email item
  const renderEmailItem = (
    email: GmailEmail,
    index: number,
    isExpanded: boolean,
    isLatest: boolean
  ) => {
    return (
      <div
        key={email.id}
        className={`w-full ${isLatest ? "bg-blue-50/30" : ""}`}
      >
        {/* Email Header - Always Visible */}
        <div
          className={`py-3 cursor-pointer hover:bg-gray-50 ${
            isExpanded ? "border-b border-gray-200 pb-4" : ""
          }`}
          onClick={() => toggleEmailExpansion(email.id)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <EmailAvatar
                email={email.from}
                name={email.from}
                size="md"
                className="flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate">
                    {formatSenderWithEmail(email.from)}
                  </div>
                  {email.hasAttachments && (
                    <Paperclip className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  )}
                  {!email.isRead && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                  )}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  to {email.to}
                  {email.cc && <span>, cc: {email.cc}</span>}
                </div>
                {!isExpanded && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {email.snippet}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right min-w-0">
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {email.date?.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year:
                      email.date.getFullYear() !== new Date().getFullYear()
                        ? "numeric"
                        : undefined,
                  })}{" "}
                  {email.date?.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {/* Actions for expanded emails */}
              {isExpanded && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem>
                      <Reply className="w-3 h-3 mr-2" />
                      Reply
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Forward className="w-3 h-3 mr-2" />
                      Forward
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Archive className="w-3 h-3 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Labels for expanded emails */}
          {isExpanded && (
            <div className="flex items-center gap-2 mt-3">
              {email.isImportant && (
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-600 text-xs"
                >
                  Important
                </Badge>
              )}
              {email.labels
                ?.filter(
                  (label) => !["INBOX", "SENT", "UNREAD"].includes(label)
                )
                .map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label.toLowerCase()}
                  </Badge>
                ))}
            </div>
          )}
        </div>

        {/* Email Content - Only Visible When Expanded */}
        {isExpanded && (
          <div className="p-4 pt-0 max-w-full">
            <div className="mt-4 max-w-full">
              {email.htmlContent ? (
                <div
                  key={`${email.id}-${expandedQuotes.has(email.id)}`}
                  className="gmail-email-content prose-sm max-w-full text-sm overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html: processEmailContent(email.htmlContent, email.id),
                  }}
                  style={{
                    // Gmail-specific styles for proper quote rendering
                    lineHeight: "1.5",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "13px",
                    color: "#222",
                  }}
                  onClick={(e) => {
                    // Handle quote toggle button clicks
                    const target = e.target as HTMLElement;
                    if (
                      target.classList.contains("gmail-quote-toggle-btn") ||
                      target.closest(".gmail-quote-toggle-btn")
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      const btn = target.closest(
                        ".gmail-quote-toggle-btn"
                      ) as HTMLElement;
                      const emailId = btn?.getAttribute("data-email-id");
                      if (emailId) {
                        console.log(
                          "Toggling quote expansion for email:",
                          emailId
                        );
                        toggleQuoteExpansion(emailId);
                      }
                    }
                  }}
                />
              ) : email.textContent ? (
                <div className="gmail-email-content max-w-full">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm overflow-hidden break-words">
                    {email.textContent}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs">No content available</p>
                </div>
              )}
            </div>

            {/* Attachments Section */}
            {email.attachments && email.attachments.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {email.attachments.length} attachment
                    {email.attachments.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {email.attachments.map((attachment, index) => (
                    <div
                      key={`${email.id}-attachment-${index}`}
                      className="gmail-attachment-card group relative w-32 h-32 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm cursor-pointer"
                      onClick={() =>
                        handleAttachmentDownload(email.id, attachment)
                      }
                    >
                      {/* Preview/Icon Area */}
                      <div className="w-full h-20 flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                        <div className="file-type-icon">
                          {getFileIcon(
                            attachment.mimeType,
                            attachment.filename,
                            email.id,
                            attachment.attachmentId
                          )}
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="p-2 h-12 flex flex-col justify-center bg-white">
                        <div className="text-xs text-gray-900 font-medium truncate leading-tight">
                          {attachment.filename}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {formatFileSize(attachment.size)}
                        </div>
                      </div>

                      {/* Hover Overlay */}
                      <div className="attachment-overlay absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white rounded-full p-2 shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200 border border-gray-200">
                          <Download className="w-4 h-4 text-gray-700" />
                        </div>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className="gmail-attachment-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        <div className="font-medium">{attachment.filename}</div>
                        <div className="text-gray-300 mt-0.5">
                          {formatFileSize(attachment.size)} •{" "}
                          {getFileTypeDisplay(attachment.mimeType)}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          Click to download
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply/Forward Buttons for Latest Email */}
            {isLatest && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => handleReply(email)}
                  className="rounded-full border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-1 text-xs"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleForward(email)}
                  className="rounded-full border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-1 text-xs"
                >
                  <Forward className="w-3 h-3 mr-1" />
                  Forward
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Check if we should prevent closing due to Gmail/Theme button click
        const windowFlag = (window as any).shouldPreventCloseGmail;
        console.log(
          "Dialog onOpenChange called, open:",
          open,
          "window flag:",
          windowFlag
        );
        if (!open && windowFlag) {
          console.log("Preventing dialog close due to Gmail button click");
          return; // Don't close
        }

        onOpenChange(open);
      }}
      onInteractOutside={(e) => {
        // Check if the click was on the Gmail button or theme toggle
        const target = e.target as HTMLElement;
        console.log("onInteractOutside called, target:", target);
        const button = target?.closest("button");
        const isButtonClick =
          button?.title === "Open Gmail in new tab" ||
          target?.closest("[data-gmail-button]") ||
          target?.closest("[data-theme-toggle]");
        console.log("Is button click:", isButtonClick, button?.title);
        if (isButtonClick) {
          console.log("Preventing dialog close due to button click");
          e.preventDefault();
        } else {
          console.log("Allowing dialog to close");
        }
      }}
    >
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>{selectedEmail?.subject || "(no subject)"}</DialogTitle>
        </DialogHeader>

        {/* Simplified Header with Actions and Subject Only */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          {/* Top action bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" title="Mark as unread">
                <Mail className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" title="Add to Tasks">
                <Calendar className="w-3 h-3" />
              </Button>
              <Separator orientation="vertical" className="mx-2 h-6" />
              <Button variant="ghost" size="sm" title="Star">
                {selectedEmail?.isStarred ? (
                  <Star className="w-3 h-3 fill-current text-yellow-500" />
                ) : (
                  <StarOff className="w-3 h-3" />
                )}
              </Button>

              {/* Gmail button inside modal header */}
              <Button
                variant="outline"
                size="sm"
                title="Open Gmail in new tab"
                onClick={() => {
                  if (onGmailOpen) {
                    onGmailOpen();
                  } else {
                    window.open("https://mail.google.com", "_blank");
                  }
                }}
                className="ml-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4">
                  <path
                    fill="currentColor"
                    d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                  />
                </svg>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem
                    onClick={() => selectedEmail && handleReply(selectedEmail)}
                  >
                    <Reply className="w-3 h-3 mr-2" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      selectedEmail && handleForward(selectedEmail)
                    }
                  >
                    <Forward className="w-3 h-3 mr-2" />
                    Forward
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="w-3 h-3 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Subject */}
            <h1 className="text-lg font-medium text-gray-900 leading-tight">
              {selectedEmail?.subject || "(no subject)"}
            </h1>
          </div>
        </div>

        {/* Thread Conversation View */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[90vh]">
          {isLoadingThread ? (
            <div className="flex items-center justify-center flex-1 min-h-0">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 text-sm">
                  Loading conversation...
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto h-full w-full">
              <div className="px-6 py-4 space-y-6 w-full">
                {(() => {
                  const visibleEmails = getVisibleEmails();

                  // If emails should be collapsed
                  if (
                    typeof visibleEmails === "object" &&
                    "startEmails" in visibleEmails
                  ) {
                    const { startEmails, endEmails, collapsedCount } =
                      visibleEmails;

                    return (
                      <>
                        {/* First batch of emails */}
                        {startEmails.map((email, index) => {
                          const isExpanded = expandedEmails.has(email.id);
                          const isLatest = false; // None of the start emails are latest
                          return renderEmailItem(
                            email,
                            index,
                            isExpanded,
                            isLatest
                          );
                        })}

                        {/* Collapsed emails indicator */}
                        <div className="flex items-center justify-center py-4">
                          <Button
                            variant="ghost"
                            onClick={toggleShowAllEmails}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            <ChevronDown className="w-4 h-4" />
                            <span>
                              Show {collapsedCount} hidden{" "}
                              {collapsedCount === 1 ? "message" : "messages"}
                            </span>
                          </Button>
                        </div>

                        {/* Last batch of emails */}
                        {endEmails.map((email, index) => {
                          const isExpanded = expandedEmails.has(email.id);
                          const isLatest = index === endEmails.length - 1; // Last email in endEmails is the latest
                          const actualIndex =
                            threadEmails.length - endEmails.length + index;
                          return renderEmailItem(
                            email,
                            actualIndex,
                            isExpanded,
                            isLatest
                          );
                        })}
                      </>
                    );
                  }

                  // Show all emails (either small thread or expanded view)
                  return (visibleEmails as GmailEmail[]).map((email, index) => {
                    const isExpanded = expandedEmails.has(email.id);
                    const isLatest = index === threadEmails.length - 1;
                    return renderEmailItem(email, index, isExpanded, isLatest);
                  });
                })()}

                {/* Show collapse button when all emails are visible and thread is large */}
                {showAllEmails && threadEmails.length > COLLAPSE_THRESHOLD && (
                  <div className="flex items-center justify-center py-4">
                    <Button
                      variant="ghost"
                      onClick={toggleShowAllEmails}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
                    >
                      <ChevronUp className="w-4 h-4" />
                      <span>Hide messages</span>
                    </Button>
                  </div>
                )}

                {threadEmails.length === 0 && !isLoadingThread && (
                  <div className="text-center py-12 text-gray-500">
                    <Mail className="w-8 h-8 text-gray-300 mx-auto mb-4" />
                    <p className="text-xs">No emails in this conversation</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
