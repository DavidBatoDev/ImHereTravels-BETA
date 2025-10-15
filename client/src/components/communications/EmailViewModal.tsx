"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "lucide-react";

// Gmail Email type
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
  isImportant?: boolean;
}

interface EmailViewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmail: GmailEmail | null;
  isLoadingFullContent: boolean;
}

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

export function EmailViewModal({
  isOpen,
  onOpenChange,
  selectedEmail,
  isLoadingFullContent,
}: EmailViewModalProps) {
  const [threadEmails, setThreadEmails] = useState<GmailEmail[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [expandedQuotes, setExpandedQuotes] = useState<Set<string>>(new Set());

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

  // Process HTML content to handle gmail_quote expansion
  const processEmailContent = (htmlContent: string, emailId: string) => {
    const isQuoteExpanded = expandedQuotes.has(emailId);

    // Debug: Log the content to see what we're working with
    console.log("Processing email content for ID:", emailId);
    console.log("Is quote expanded:", isQuoteExpanded);

    // Check if content has various quote patterns
    const hasGmailQuote =
      htmlContent.includes("gmail_quote") ||
      htmlContent.includes('class="gmail_quote"') ||
      htmlContent.includes("class='gmail_quote'") ||
      htmlContent.includes('div class="gmail_quote"') ||
      htmlContent.includes("div class='gmail_quote'");

    const hasZmailQuote =
      htmlContent.includes("blockquote_zmail") ||
      htmlContent.includes("zmail_extra") ||
      htmlContent.includes('id="blockquote_zmail"');

    const hasGenericBlockquote = htmlContent.includes("<blockquote");

    console.log("Gmail quote found:", hasGmailQuote);
    console.log("Zmail quote found:", hasZmailQuote);
    console.log("Generic blockquote found:", hasGenericBlockquote);

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
      if (htmlContent.includes('<div class="gmail_quote">')) {
        parts = htmlContent.split('<div class="gmail_quote">');
        splitPattern = '<div class="gmail_quote">';
        quoteMark = "gmail";
      } else if (htmlContent.includes("<div class='gmail_quote'>")) {
        parts = htmlContent.split("<div class='gmail_quote'>");
        splitPattern = "<div class='gmail_quote'>";
        quoteMark = "gmail";
      } else if (htmlContent.includes("gmail_quote")) {
        // More flexible Gmail quote detection
        const gmailQuoteMatch = htmlContent.match(
          /<div[^>]*class[^>]*gmail_quote[^>]*>/
        );
        if (gmailQuoteMatch) {
          parts = htmlContent.split(gmailQuoteMatch[0]);
          splitPattern = gmailQuoteMatch[0];
          quoteMark = "gmail";
        }
      }
    } else if (hasZmailQuote) {
      // Handle Zoho Mail quotes (zmail_extra is usually the separator)
      if (htmlContent.includes('class="zmail_extra"')) {
        parts = htmlContent.split('<div class="zmail_extra"');
        splitPattern = '<div class="zmail_extra"';
        quoteMark = "zmail";
      } else if (htmlContent.includes('id="blockquote_zmail"')) {
        parts = htmlContent.split('<blockquote id="blockquote_zmail"');
        splitPattern = '<blockquote id="blockquote_zmail"';
        quoteMark = "zmail";
      }
    } else if (hasGenericBlockquote) {
      // Handle generic blockquotes (fallback)
      const blockquoteMatch = htmlContent.match(/<blockquote[^>]*>/);
      if (blockquoteMatch) {
        parts = htmlContent.split(blockquoteMatch[0]);
        splitPattern = blockquoteMatch[0];
        quoteMark = "generic";
      }
    }

    if (parts.length <= 1) {
      console.log("Could not split content into parts with any pattern");
      return htmlContent;
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
    }
  }, [isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
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
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600 text-sm">
                Loading conversation...
              </span>
            </div>
          ) : (
            <div className="flex-1 overflow-auto h-full w-full">
              <div className="px-6 py-4 space-y-6 w-full">
                {threadEmails.map((email, index) => {
                  const isExpanded = expandedEmails.has(email.id);
                  const isLatest = index === threadEmails.length - 1;

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
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs">
                                {getAvatarInitials(email.from)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {email.from?.match(/^([^<]+)/)?.[1]?.trim() ||
                                    email.from}
                                </span>
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
                                    email.date.getFullYear() !==
                                    new Date().getFullYear()
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
                                <DropdownMenuContent
                                  align="end"
                                  className="text-xs"
                                >
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
                                (label) =>
                                  !["INBOX", "SENT", "UNREAD"].includes(label)
                              )
                              .map((label) => (
                                <Badge
                                  key={label}
                                  variant="outline"
                                  className="text-xs"
                                >
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
                                key={`${email.id}-${expandedQuotes.has(
                                  email.id
                                )}`}
                                className="gmail-email-content prose-sm max-w-full text-sm overflow-hidden"
                                dangerouslySetInnerHTML={{
                                  __html: processEmailContent(
                                    email.htmlContent,
                                    email.id
                                  ),
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
                                    target.classList.contains(
                                      "gmail-quote-toggle-btn"
                                    ) ||
                                    target.closest(".gmail-quote-toggle-btn")
                                  ) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const btn = target.closest(
                                      ".gmail-quote-toggle-btn"
                                    ) as HTMLElement;
                                    const emailId =
                                      btn?.getAttribute("data-email-id");
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

                          {/* Reply/Forward Buttons for Latest Email */}
                          {isLatest && (
                            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                              <Button
                                variant="outline"
                                className="rounded-full border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-1 text-xs"
                              >
                                <Reply className="w-3 h-3 mr-1" />
                                Reply
                              </Button>
                              <Button
                                variant="outline"
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
                })}

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
