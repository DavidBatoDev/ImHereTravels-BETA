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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmailViewModal } from "./EmailViewModal";
import { ComposeEmail } from "./ComposeEmail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
  StarOff,
  Trash2,
  Edit,
  Reply,
  Forward,
  ChevronDown,
  Filter,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "../ui/separator";

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
  threadMessageCount?: number; // Number of messages in this conversation thread
}

// Gmail Label type
interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

const gmailCategories = [
  {
    id: "inbox",
    label: "Inbox",
    icon: Inbox,
    query: "in:inbox",
    count: 0,
    unreadCount: 0,
  },
  {
    id: "sent",
    label: "Sent",
    icon: SendIcon,
    query: "in:sent",
    count: 0,
    unreadCount: 0,
  },
  {
    id: "drafts",
    label: "Drafts",
    icon: Edit,
    query: "in:drafts",
    count: 0,
    unreadCount: 0,
  },
  {
    id: "starred",
    label: "Starred",
    icon: Star,
    query: "is:starred",
    count: 0,
    unreadCount: 0,
  },
  {
    id: "important",
    label: "Important",
    icon: AlertCircle,
    query: "is:important",
    count: 0,
    unreadCount: 0,
  },
  {
    id: "all",
    label: "All Mail",
    icon: Mail,
    query: "in:sent OR in:inbox",
    count: 0,
    unreadCount: 0,
  },
  {
    id: "spam",
    label: "Spam",
    icon: AlertCircle,
    query: "in:spam",
    count: 0,
    unreadCount: 0,
  },
  {
    id: "trash",
    label: "Trash",
    icon: Trash2,
    query: "in:trash",
    count: 0,
    unreadCount: 0,
  },
];

export default function EmailsTab() {
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [emailCache, setEmailCache] = useState<Map<string, GmailEmail>>(
    new Map()
  );
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFullContent, setIsLoadingFullContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("inbox");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "sender" | "subject">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [lastFetchTime, setLastFetchTime] = useState<Map<string, number>>(
    new Map()
  );

  // Compose email state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<"new" | "reply" | "forward">(
    "new"
  );
  const [composeData, setComposeData] = useState<{
    to?: string;
    subject?: string;
    body?: string;
    replyToEmail?: GmailEmail;
  }>({});

  // Check if we should use cached data
  const shouldUseCachedData = (cacheKey: string) => {
    const lastFetch = lastFetchTime.get(cacheKey);
    if (!lastFetch) return false;

    // Use cache for 30 seconds to avoid unnecessary API calls
    const cacheTimeout = 30 * 1000;
    return Date.now() - lastFetch < cacheTimeout;
  };

  // Fetch emails from Gmail (optimized with caching)
  const fetchEmails = async (
    searchQuery?: string,
    pageToken?: string,
    forceRefresh = false
  ) => {
    const cacheKey = `${activeCategory}-${searchQuery || ""}-${
      pageToken || ""
    }`;

    // Check cache first (unless force refresh)
    if (!forceRefresh && shouldUseCachedData(cacheKey)) {
      console.log("Using cached data for", cacheKey);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get query for active category
      const category = gmailCategories.find((cat) => cat.id === activeCategory);
      let query = category?.query || "in:sent OR in:inbox";

      if (searchQuery) {
        query = `${query} ${searchQuery}`;
      }

      // Call Next.js API route instead of Firebase Functions
      const response = await fetch("/api/gmail/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxResults: 25, // Reduced for faster loading
          query,
          pageToken,
          searchQuery: searchQuery || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result?.success) {
        const fetchedEmails = result.data.emails.map((email: any) => {
          return {
            ...email,
            // Convert ISO string back to Date object
            date: new Date(email.date),
          };
        }); // Update cache
        const newCache = new Map(emailCache);
        fetchedEmails.forEach((email: GmailEmail) => {
          newCache.set(email.id, email);
        });
        setEmailCache(newCache);

        if (pageToken) {
          // Append to existing emails for pagination
          setEmails((prev) => [...prev, ...fetchedEmails]);
        } else {
          // Replace emails for new search/filter
          setEmails(fetchedEmails);
        }

        setNextPageToken(result.data.nextPageToken || null);

        // Update last fetch time
        const newFetchTimes = new Map(lastFetchTime);
        newFetchTimes.set(cacheKey, Date.now());
        setLastFetchTime(newFetchTimes);

        // Show success toast for manual refreshes
        if (forceRefresh && !pageToken && !searchQuery) {
          toast({
            title: "Success",
            description: `Loaded ${fetchedEmails.length} emails`,
            variant: "default",
          });
        }
      } else {
        throw new Error(result.error || "Failed to fetch emails");
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

  // Sanitize Gmail HTML content
  const sanitizeGmailHtml = (html: string): string => {
    if (!html) return html;

    // Remove Gmail-specific interactive elements and buttons
    let sanitized = html;

    // Remove Gmail download buttons and overlays
    sanitized = sanitized.replace(/<div class="a6S"[^>]*>.*?<\/div>/gs, "");

    // Remove Gmail button elements
    sanitized = sanitized.replace(
      /<button[^>]*class="[^"]*VYBDae[^"]*"[^>]*>.*?<\/button>/gs,
      ""
    );

    // Remove tooltip elements
    sanitized = sanitized.replace(
      /<div[^>]*id="tt-c[^"]*"[^>]*>.*?<\/div>/gs,
      ""
    );

    // Remove SVG icons from Gmail UI
    sanitized = sanitized.replace(
      /<svg[^>]*class="[^"]*aoH[^"]*"[^>]*>.*?<\/svg>/gs,
      ""
    );

    // Remove span elements with Gmail UI classes
    sanitized = sanitized.replace(
      /<span[^>]*class="[^"]*(?:OiePBf-zPjgPe|bHC-Q|VYBDae-JX-ank-Rtc0Jf)[^"]*"[^>]*>.*?<\/span>/gs,
      ""
    );

    // Clean up empty elements
    sanitized = sanitized.replace(/<([^>]+)>\s*<\/\1>/g, "");

    // Remove data attributes that are Gmail-specific
    sanitized = sanitized.replace(/\s+data-[^=]*="[^"]*"/g, "");

    // Remove jsaction and jscontroller attributes
    sanitized = sanitized.replace(
      /\s+js(?:action|controller|name|log)="[^"]*"/g,
      ""
    );

    // Remove tabindex from images (Gmail adds these)
    sanitized = sanitized.replace(/\s+tabindex="[^"]*"/g, "");

    return sanitized;
  };

  // Fetch full email content on demand
  const fetchFullEmailContent = async (messageId: string) => {
    // Check cache first
    const cachedEmail = emailCache.get(messageId);
    if (cachedEmail?.htmlContent || cachedEmail?.textContent) {
      return cachedEmail;
    }

    setIsLoadingFullContent(true);
    try {
      // Call Next.js API route instead of Firebase Functions
      const response = await fetch(`/api/gmail/emails/${messageId}`, {
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
        const fullEmail = {
          ...result.data,
          // Convert ISO string back to Date object
          date: new Date(result.data.date),
          // Sanitize HTML content
          htmlContent: result.data.htmlContent
            ? sanitizeGmailHtml(result.data.htmlContent)
            : result.data.htmlContent,
        };

        // Update cache with full content
        const newCache = new Map(emailCache);
        newCache.set(messageId, fullEmail);
        setEmailCache(newCache);

        return fullEmail;
      } else {
        throw new Error(result.error || "Failed to fetch full email content");
      }
    } catch (error: any) {
      console.error("Error fetching full email content:", error);
      toast({
        title: "Error",
        description: "Failed to load email content",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoadingFullContent(false);
    }
  };

  // Fetch Gmail labels
  const fetchLabels = async () => {
    try {
      // Call Next.js API route instead of Firebase Functions
      const response = await fetch("/api/gmail/labels", {
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
        setLabels(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch labels");
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

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setEmails([]); // Clear current emails
    setNextPageToken(null); // Reset pagination
    setSelectedEmails(new Set()); // Clear selections
  };

  // Load more emails (pagination)
  const loadMoreEmails = () => {
    if (nextPageToken) {
      fetchEmails(searchTerm || undefined, nextPageToken);
    }
  };

  // View email details (with on-demand content loading)
  const viewEmail = async (email: GmailEmail) => {
    setSelectedEmail(email);
    setIsViewDialogOpen(true);

    // Load full content if not already cached
    if (!email.htmlContent && !email.textContent) {
      const fullEmail = await fetchFullEmailContent(email.id);
      if (fullEmail) {
        setSelectedEmail(fullEmail);
      }
    }
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

  // Extract name from email string (removes email address part)
  const extractNameFromEmail = (emailString: string) => {
    if (!emailString) return "Unknown";

    // Handle format "Name <email@domain.com>"
    const match = emailString.match(/^(.+?)\s*<.+@.+>$/);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, ""); // Remove quotes if present
    }

    // Handle format "email@domain.com" (just email, no name)
    if (emailString.includes("@")) {
      const emailPart = emailString.split("@")[0];
      return emailPart
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Return as-is if no email format detected
    return emailString;
  };

  // Get sender/recipient display
  const getCorrespondent = (email: GmailEmail) => {
    const emailString = email.isSent ? email.to : email.from;
    return extractNameFromEmail(emailString);
  };

  // Format date
  const formatDate = (date: Date) => {
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return "Unknown";
    }

    try {
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24 && diffInHours >= 0) {
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
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown";
    }
  };

  // Toggle email selection
  const toggleEmailSelection = (emailId: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedEmails(newSelection);
  };

  // Select all emails
  const selectAllEmails = () => {
    if (selectedEmails.size === filteredEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredEmails.map((email) => email.id)));
    }
  };

  // Get avatar initials
  const getAvatarInitials = (email: string) => {
    const name = email.split("@")[0];
    return name.charAt(0).toUpperCase();
  };

  // Get conversation count for a thread
  const getConversationCount = (email: GmailEmail) => {
    // Use the thread message count from Gmail API if available
    return email.threadMessageCount || 1;
  };

  // Compose functions
  const handleCompose = () => {
    setIsComposeOpen(true);
    setComposeType("new");
    setComposeData({});
  };

  const handleReply = (email: GmailEmail) => {
    setIsComposeOpen(true);
    setComposeType("reply");
    setComposeData({
      to: email.from,
      subject: email.subject.startsWith("Re:")
        ? email.subject
        : `Re: ${email.subject}`,
      replyToEmail: email,
    });
  };

  const handleForward = (email: GmailEmail) => {
    setIsComposeOpen(true);
    setComposeType("forward");
    setComposeData({
      subject: email.subject.startsWith("Fwd:")
        ? email.subject
        : `Fwd: ${email.subject}`,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${
        email.from
      }\nDate: ${new Date(email.date).toLocaleString()}\nSubject: ${
        email.subject
      }\nTo: ${email.to}\n\n${email.snippet}`,
      replyToEmail: email,
    });
  };

  const handleCloseCompose = () => {
    setIsComposeOpen(false);
    setComposeType("new");
    setComposeData({});
  };

  useEffect(() => {
    fetchEmails();
    fetchLabels();
  }, [activeCategory]);

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
    <div
      className="flex bg-white overflow-hidden"
      style={{ height: "calc(100vh - 25vh)", minHeight: "600px" }}
    >
      {/* Gmail Sidebar */}
      <div className="w-64 border-r border-gray-200 flex-shrink-0 overflow-y-auto h-full">
        <div className="p-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Gmail</h2>

          {/* Compose Button */}
          <Button
            onClick={handleCompose}
            className="w-full mb-6 bg-white border hover:bg-gray-50 text-black rounded-xl"
          >
            <Edit className="w-4 h-4 mr-2" />
            Compose
          </Button>

          {/* Categories */}
          <nav className="space-y-1">
            {gmailCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-red-100 text-red-700 border-r-4 border-red-500"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center">
                    <Icon className="w-5 h-5 mr-3" />
                    {category.label}
                  </div>
                  {category.unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-red-500 text-white text-xs"
                    >
                      {category.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
        {/* Top Toolbar */}
        <div className="border-b border-gray-200 bg-white">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search mail"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 text-base border-gray-300 rounded-full"
              />
            </div>
          </div>

          {/* Email Actions Toolbar */}
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedEmails.size === filteredEmails.length &&
                  filteredEmails.length > 0
                }
                onCheckedChange={selectAllEmails}
                className="mr-2"
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>All</DropdownMenuItem>
                  <DropdownMenuItem>Unread</DropdownMenuItem>
                  <DropdownMenuItem>Read</DropdownMenuItem>
                  <DropdownMenuItem>Starred</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {sortOrder === "desc" ? (
                      <SortDesc className="w-4 h-4 mr-1" />
                    ) : (
                      <SortAsc className="w-4 h-4 mr-1" />
                    )}
                    Sort
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("date");
                      setSortOrder("desc");
                    }}
                  >
                    Newest first
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSortBy("date");
                      setSortOrder("asc");
                    }}
                  >
                    Oldest first
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("sender")}>
                    By sender
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("subject")}>
                    By subject
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedEmails.size > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-6" />
                  <Button variant="ghost" size="sm">
                    <Archive className="w-4 h-4 mr-1" />
                    Archive
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Star className="w-4 h-4 mr-1" />
                    Star
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {isLoading
                  ? `Loading...`
                  : `${filteredEmails.length} of ${emails.length} emails`}
              </span>
              <Button
                onClick={() =>
                  fetchEmails(searchTerm || undefined, undefined, true)
                }
                disabled={isLoading}
                variant="ghost"
                size="sm"
                title="Refresh emails"
              >
                <RotateCcw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Error Display */}
          {error && (
            <div className="mx-4 mt-4 flex-shrink-0">
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64 flex-shrink-0">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Emails List Container with Fixed Height and Scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 border-t border-gray-100 email-list-container min-h-0 min-w-0">
            {filteredEmails.map((email, index) => {
              const isSelected = selectedEmails.has(email.id);

              return (
                <div
                  key={email.id}
                  className={cn(
                    "email-list-item group border-b border-gray-100 cursor-pointer",
                    !email.isRead && "bg-white font-medium",
                    email.isRead && "bg-gray-50/50",
                    isSelected && "bg-blue-50 border-blue-200"
                  )}
                  onClick={() => {
                    // Use cached version if available for instant loading
                    const cachedEmail = emailCache.get(email.id);
                    viewEmail(cachedEmail || email);
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3 email-list-item-content">
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleEmailSelection(email.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Star */}

                    {/* Avatar/Sender */}
                    <div
                      className="flex items-center min-w-0 flex-shrink-0"
                      style={{ width: "180px" }}
                    >
                      <Avatar className="w-8 h-8 mr-3 flex-shrink-0">
                        <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                          {getAvatarInitials(getCorrespondent(email))}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "truncate text-xs min-w-0 text-black",
                          !email.isRead ? "font-semibold" : "font-normal"
                        )}
                      >
                        {getCorrespondent(email)}
                      </span>
                    </div>

                    {/* Subject and Snippet */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <span
                          className={cn(
                            "text-xs flex-shrink-0 truncate whitespace-nowrap text-black",
                            !email.isRead ? "font-semibold" : "font-normal"
                          )}
                          style={{ maxWidth: "250px" }}
                        >
                          {email.subject || "(no subject)"}
                        </span>
                        <span className="text-gray-500 font-normal truncate min-w-0 text-xs">
                          — {email.snippet}
                        </span>
                      </div>
                    </div>

                    {/* Labels/Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {email.hasAttachments && (
                        <FileText className="w-4 h-4 text-gray-400" />
                      )}
                      {getConversationCount(email) > 1 && (
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-600 border-gray-300 bg-gray-50"
                        >
                          {getConversationCount(email)}
                        </Badge>
                      )}
                      {!email.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>

                    {/* Date */}
                    <div
                      className="flex-shrink-0 text-gray-500 text-right"
                      style={{ fontSize: "14px", width: "80px" }}
                    >
                      {formatDate(email.date)}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="email-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                </div>
              );
            })}

            {/* Load More Button */}
            {nextPageToken && (
              <div className="p-4 text-center border-t">
                <Button
                  onClick={loadMoreEmails}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  Load More Emails
                </Button>
              </div>
            )}

            {/* No Emails State */}
            {!isLoading && filteredEmails.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Mail className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  No emails found
                </h3>
                <p className="text-gray-400 text-center">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : `No emails in ${
                        gmailCategories.find((c) => c.id === activeCategory)
                          ?.label
                      }`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email View Modal */}
      <EmailViewModal
        isOpen={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        selectedEmail={selectedEmail}
        isLoadingFullContent={isLoadingFullContent}
        onReply={handleReply}
        onForward={handleForward}
      />

      {/* Compose Email Component */}
      {isComposeOpen && (
        <ComposeEmail
          isOpen={isComposeOpen}
          onClose={handleCloseCompose}
          initialTo={composeData.to || ""}
          initialSubject={composeData.subject || ""}
          initialBody={composeData.body || ""}
          replyToEmail={composeData.replyToEmail}
        />
      )}
    </div>
  );
}
