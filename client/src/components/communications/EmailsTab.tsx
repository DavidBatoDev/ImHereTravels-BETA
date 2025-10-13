"use client";

import { useState, useEffect } from "react";
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
  Search,
  Mail,
  CheckCircle,
  AlertCircle,
  Eye,
  Calendar,
  User,
  FileText,
  MoreVertical,
  RotateCcw,
  Inbox,
  Send as SendIcon,
  Archive,
  Star,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

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
}

// Gmail Label type
interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

const emailTypes = [
  {
    value: "all",
    label: "All Emails",
    color: "bg-blue-100 text-blue-800 border border-blue-200",
  },
  {
    value: "sent",
    label: "Sent",
    color: "bg-green-100 text-green-800 border border-green-200",
  },
  {
    value: "received",
    label: "Received",
    color: "bg-purple-100 text-purple-800 border border-purple-200",
  },
  {
    value: "unread",
    label: "Unread",
    color: "bg-orange-100 text-orange-800 border border-orange-200",
  },
];

export default function EmailsTab() {
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTypeFilter, setEmailTypeFilter] = useState("all");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Fetch emails from Gmail
  const fetchEmails = async (searchQuery?: string, pageToken?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchGmailEmailsFunc = httpsCallable(functions, "fetchGmailEmails");

      let query = "in:sent OR in:inbox";

      // Build search query based on filters
      if (emailTypeFilter === "sent") {
        query = "in:sent";
      } else if (emailTypeFilter === "received") {
        query = "in:inbox";
      } else if (emailTypeFilter === "unread") {
        query = "is:unread";
      }

      if (searchQuery) {
        query = `${query} ${searchQuery}`;
      }

      const result = await fetchGmailEmailsFunc({
        maxResults: 50,
        query,
        pageToken,
        searchQuery: searchQuery || undefined,
      });

      const data = result.data as any;
      if (data?.success) {
        const fetchedEmails = data.emails.map((email: any) => ({
          ...email,
          date: new Date(email.date),
        }));

        if (pageToken) {
          // Append to existing emails for pagination
          setEmails((prev) => [...prev, ...fetchedEmails]);
        } else {
          // Replace emails for new search/filter
          setEmails(fetchedEmails);
        }

        setNextPageToken(data.nextPageToken || null);
      } else {
        throw new Error("Failed to fetch emails");
      }
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      setError(error.message || "Failed to fetch emails");
      toast({
        title: "Error",
        description: "Failed to fetch emails from Gmail",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Gmail labels
  const fetchLabels = async () => {
    try {
      const getGmailLabelsFunc = httpsCallable(functions, "getGmailLabels");
      const result = await getGmailLabelsFunc({});

      const data = result.data as any;
      if (data?.success) {
        setLabels(data.labels);
      }
    } catch (error: any) {
      console.error("Error fetching labels:", error);
    }
  };

  // Search emails
  const handleSearch = () => {
    if (searchTerm.trim()) {
      fetchEmails(searchTerm.trim());
    } else {
      fetchEmails();
    }
  };

  // Handle email type filter change
  const handleEmailTypeFilter = (type: string) => {
    setEmailTypeFilter(type);
    setEmails([]); // Clear current emails
    setNextPageToken(null); // Reset pagination
  };

  // Load more emails (pagination)
  const loadMoreEmails = () => {
    if (nextPageToken) {
      fetchEmails(searchTerm || undefined, nextPageToken);
    }
  };

  // View email details
  const viewEmail = (email: GmailEmail) => {
    setSelectedEmail(email);
    setIsViewDialogOpen(true);
  };

  // Get email type badge
  const getEmailTypeBadge = (email: GmailEmail) => {
    if (email.isSent) {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-200">
          Sent
        </Badge>
      );
    }
    if (email.isReceived && !email.isRead) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
          Unread
        </Badge>
      );
    }
    if (email.isReceived) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
          Received
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 border border-gray-200">
        Unknown
      </Badge>
    );
  };

  // Get sender/recipient display
  const getCorrespondent = (email: GmailEmail) => {
    if (email.isSent) {
      return email.to;
    }
    return email.from;
  };

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: diffInHours > 8760 ? "numeric" : undefined,
    });
  };

  useEffect(() => {
    fetchEmails();
    fetchLabels();
  }, [emailTypeFilter]);

  // Filter emails based on search term
  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      searchTerm === "" ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.snippet.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gmail Emails</h2>
          <p className="text-gray-600">
            View and manage emails from your Gmail account
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fetchEmails()}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              Search
            </Button>
            <Select
              value={emailTypeFilter}
              onValueChange={handleEmailTypeFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Email Type" />
              </SelectTrigger>
              <SelectContent>
                {emailTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading emails...</p>
          </CardContent>
        </Card>
      )}

      {/* Emails List */}
      <div className="grid gap-4">
        {filteredEmails.map((email) => (
          <Card
            key={email.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              !email.isRead ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {email.isSent ? (
                    <SendIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <Inbox className="w-5 h-5 text-blue-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getEmailTypeBadge(email)}
                    <span className="text-sm text-gray-500">
                      {formatDate(email.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {getCorrespondent(email)}
                    </span>
                  </div>

                  <h3
                    className={`font-medium mb-1 truncate ${
                      !email.isRead ? "font-bold" : ""
                    }`}
                  >
                    {email.subject}
                  </h3>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {email.snippet}
                  </p>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewEmail(email);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {nextPageToken && (
        <div className="text-center">
          <Button
            onClick={loadMoreEmails}
            disabled={isLoading}
            variant="outline"
          >
            Load More Emails
          </Button>
        </div>
      )}

      {/* No Emails State */}
      {!isLoading && filteredEmails.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No emails found
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? "Try adjusting your search terms or filters"
                : "No emails available in the selected category"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Email View Dialog */}
      <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              {selectedEmail?.subject}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>
                    <strong>From:</strong> {selectedEmail?.from}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>
                    <strong>To:</strong> {selectedEmail?.to}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    <strong>Date:</strong>{" "}
                    {selectedEmail?.date.toLocaleString()}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex-1 overflow-auto border rounded-lg p-4 bg-gray-50">
            {selectedEmail?.htmlContent && (
              <div
                dangerouslySetInnerHTML={{
                  __html: selectedEmail.htmlContent,
                }}
                className="prose prose-sm max-w-none"
              />
            )}
            {!selectedEmail?.htmlContent && selectedEmail?.textContent && (
              <div className="whitespace-pre-wrap font-mono text-sm">
                {selectedEmail.textContent}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
