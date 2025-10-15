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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>{selectedEmail?.subject || "(no subject)"}</DialogTitle>
        </DialogHeader>

        {/* Gmail-style Header */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          {/* Top action bar */}
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" title="Mark as unread">
                <Mail className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Add to Tasks">
                <Calendar className="w-4 h-4" />
              </Button>
              <Separator orientation="vertical" className="mx-2 h-6" />
              <Button variant="ghost" size="sm" title="Star">
                {selectedEmail?.isStarred ? (
                  <Star className="w-4 h-4 fill-current text-yellow-500" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Forward className="w-4 h-4 mr-2" />
                    Forward
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Email Header Information */}
          <div className="space-y-3">
            {/* Subject */}
            <h1 className="text-2xl font-normal text-gray-900 leading-tight">
              {selectedEmail?.subject || "(no subject)"}
            </h1>

            {/* Labels and importance */}
            <div className="flex items-center gap-2">
              {selectedEmail?.isImportant && (
                <Badge
                  variant="outline"
                  className="text-yellow-600 border-yellow-600"
                >
                  Important
                </Badge>
              )}
              {selectedEmail?.labels
                ?.filter(
                  (label) => !["INBOX", "SENT", "UNREAD"].includes(label)
                )
                .map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label.toLowerCase()}
                  </Badge>
                ))}
            </div>

            {/* Sender info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                    {selectedEmail && getAvatarInitials(selectedEmail.from)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {selectedEmail?.from?.match(/^([^<]+)/)?.[1]?.trim() ||
                        selectedEmail?.from}
                    </span>
                    <span className="text-gray-500 text-sm">
                      &lt;
                      {selectedEmail?.from?.match(/<([^>]+)>/)?.[1] ||
                        selectedEmail?.from}
                      &gt;
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    to {selectedEmail?.to}
                    {selectedEmail?.cc && <span>, cc: {selectedEmail.cc}</span>}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-600">
                  {selectedEmail?.date?.toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedEmail?.date?.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-[60vh]">
          {isLoadingFullContent ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Loading email content...</span>
            </div>
          ) : (
            <div className="flex-1 overflow-auto h-full">
              {/* Email body container with Gmail-like styling */}
              <div className="px-6 py-4">
                {selectedEmail?.htmlContent ? (
                  <div
                    className="gmail-email-content"
                    dangerouslySetInnerHTML={{
                      __html: selectedEmail.htmlContent,
                    }}
                  />
                ) : selectedEmail?.textContent ? (
                  <div className="gmail-email-content">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {selectedEmail.textContent}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    {selectedEmail?.snippet ? (
                      <div className="max-w-md mx-auto">
                        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-medium text-gray-700 mb-2">
                          Preview
                        </h3>
                        <p className="text-gray-600 italic leading-relaxed">
                          {selectedEmail.snippet}
                        </p>
                        <p className="text-sm mt-4 text-gray-500">
                          Loading full content...
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto">
                        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No content available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons at Bottom of Email Content */}
                <div className="px-6 py-6 border-t border-gray-200 mt-6">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="rounded-full border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2"
                    >
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2"
                    >
                      <Forward className="w-4 h-4 mr-2" />
                      Forward
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
