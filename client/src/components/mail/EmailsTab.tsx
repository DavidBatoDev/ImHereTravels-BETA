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
  fromAvatarUrl?: string; // Avatar URL for sender
  toAvatarUrl?: string; // Avatar URL for recipient
  isDraft?: boolean; // Whether this is a draft email
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

// Shared cache that persists across component unmounts
const emailCacheRef = { categoryEmails: new Map<string, GmailEmail[]>() };

export default function EmailsTab() {
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [emailCache, setEmailCache] = useState<Map<string, GmailEmail>>(
    new Map()
  );
  const [categoryEmails, setCategoryEmailsState] = useState<
    Map<string, GmailEmail[]>
  >(() => emailCacheRef.categoryEmails); // Initialize from persistent cache

  // Initialize activeCategory from URL hash
  const getInitialCategory = () => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1); // Remove '#'
      if (hash && gmailCategories.some((cat) => cat.id === hash)) {
        return hash;
      }
    }
    return "inbox";
  };

  // Wrapper to keep ref in sync with state
  const setCategoryEmails = (
    updater: (prev: Map<string, GmailEmail[]>) => Map<string, GmailEmail[]>
  ) => {
    setCategoryEmailsState((prev) => {
      const newMap = updater(prev);
      // Update persistent cache
      emailCacheRef.categoryEmails = newMap;
      return newMap;
    });
  };

  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingFullContent, setIsLoadingFullContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(getInitialCategory);
  const [isCategoryChanging, setIsCategoryChanging] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "sender" | "subject">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [lastFetchTime, setLastFetchTime] = useState<Map<string, number>>(
    new Map()
  );
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Compose email state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<"new" | "reply" | "forward">(
    "new"
  );
  const [composeData, setComposeData] = useState<{
    to?: string;
    cc?: string;
    bcc?: string;
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
    const isCacheValid = Date.now() - lastFetch < cacheTimeout;

    // Check if we have emails for the current category in our category cache
    const categoryKey = activeCategory;
    const hasEmailsForCategory =
      categoryEmails.has(categoryKey) &&
      (categoryEmails.get(categoryKey)?.length || 0) > 0;

    return isCacheValid && hasEmailsForCategory;
  };

  // Refresh drafts list (called when a new draft is saved)
  const refreshDrafts = () => {
    if (activeCategory === "drafts") {
      // Clear category cache for drafts to force fresh fetch
      setCategoryEmails((prev) => {
        const newMap = new Map(prev);
        newMap.delete("drafts");
        return newMap;
      });
      fetchEmails(undefined, undefined, true); // Force refresh
    }
  };

  // Fetch emails from Gmail (optimized with caching)
  const fetchEmails = async (
    searchQuery?: string,
    pageToken?: string,
    forceRefresh = false
  ) => {
    // Cancel any ongoing request
    if (abortController) {
      abortController.abort();
    }

    // Create new abort controller for this request
    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    const cacheKey = `${activeCategory}-${searchQuery || ""}-${
      pageToken || ""
    }`;

    // Check cache first (unless force refresh)
    if (!forceRefresh && shouldUseCachedData(cacheKey)) {
      console.log("Using cached data for", cacheKey);
      // Restore emails for this category from cache
      const categoryKey = activeCategory;
      const cachedEmails = categoryEmails.get(categoryKey) || [];
      setEmails(cachedEmails);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let fetchedEmails: GmailEmail[] = [];

      // Handle drafts separately
      if (activeCategory === "drafts") {
        const response = await fetch("/api/gmail/drafts/list", {
          signal: newAbortController.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result?.success) {
          fetchedEmails = result.drafts.map((draft: any) => ({
            ...draft,
            date: new Date(draft.date),
          }));
        } else {
          throw new Error(result.error || "Failed to fetch drafts");
        }
      } else {
        // Get query for active category
        const category = gmailCategories.find(
          (cat) => cat.id === activeCategory
        );
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
          signal: newAbortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result?.success) {
          fetchedEmails = result.data.emails.map((email: any) => {
            return {
              ...email,
              // Convert ISO string back to Date object
              date: new Date(email.date),
            };
          });
          setNextPageToken(result.data.nextPageToken || null);
        } else {
          throw new Error(result.error || "Failed to fetch emails");
        }
      }

      // Check if request was aborted before updating state
      if (newAbortController.signal.aborted) {
        console.log("Request aborted, not updating state");
        return;
      }

      // Update cache
      const newCache = new Map(emailCache);
      fetchedEmails.forEach((email: GmailEmail) => {
        newCache.set(email.id, email);
      });
      setEmailCache(newCache);

      if (pageToken) {
        // Append to existing emails for pagination
        const newEmails = [...emails, ...fetchedEmails];
        setEmails(newEmails);
        // Update category cache
        setCategoryEmails((prev) =>
          new Map(prev).set(activeCategory, newEmails)
        );
      } else {
        // Replace emails for new search/filter
        setEmails(fetchedEmails);
        // Update category cache
        setCategoryEmails((prev) =>
          new Map(prev).set(activeCategory, fetchedEmails)
        );
      }

      // Update last fetch time
      const newFetchTimes = new Map(lastFetchTime);
      newFetchTimes.set(cacheKey, Date.now());
      setLastFetchTime(newFetchTimes);

      // Show success toast for manual refreshes
      if (forceRefresh && !pageToken && !searchQuery) {
        toast({
          title: "Success",
          description: `Loaded ${fetchedEmails.length} ${
            activeCategory === "drafts" ? "drafts" : "emails"
          }`,
          variant: "default",
        });
      }
    } catch (error: any) {
      // Don't show error if request was aborted (user switched categories)
      if (error.name === "AbortError") {
        console.log("Request aborted for category switch");
        return;
      }

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

  // Track pending category change when loading
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    // If currently loading, queue the category change
    if (isLoading) {
      setPendingCategory(categoryId);
      return;
    }

    // Only show loading if changing to a different category
    if (categoryId !== activeCategory) {
      setIsCategoryChanging(true);
    }
    setActiveCategory(categoryId);
    // Update URL hash
    if (typeof window !== "undefined") {
      window.location.hash = categoryId;
    }
    // Don't clear emails immediately - let useEffect load cached data
    // setEmails([]); // Clear current emails
    setNextPageToken(null); // Reset pagination
    setSelectedEmails(new Set()); // Clear selections
  };

  // Load more emails (pagination)
  const loadMoreEmails = async () => {
    if (nextPageToken && !isLoadingMore) {
      setIsLoadingMore(true);
      try {
        await fetchEmails(searchTerm || undefined, nextPageToken);
      } finally {
        setIsLoadingMore(false);
      }
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
    if (email.isDraft) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
          Draft
        </Badge>
      );
    }
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
    if (email.isSent) {
      // For sent emails, show "To: <email>, <number of other emails and bcc>"
      const toEmails = email.to ? email.to.split(",").map((e) => e.trim()) : [];
      const ccEmails = email.cc ? email.cc.split(",").map((e) => e.trim()) : [];
      const bccEmails = email.bcc
        ? email.bcc.split(",").map((e) => e.trim())
        : [];

      const totalOtherEmails = ccEmails.length + bccEmails.length;

      if (toEmails.length === 0) {
        return "To: (no recipients)";
      }

      const firstEmail = toEmails[0];
      const otherCount = toEmails.length - 1 + totalOtherEmails;

      if (otherCount === 0) {
        return `To: ${firstEmail}`;
      } else {
        return `To: ${firstEmail}, +${otherCount}`;
      }
    } else {
      // For received emails, show sender name
      return extractNameFromEmail(email.from);
    }
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

  const handleOpenDraft = (email: GmailEmail) => {
    setIsComposeOpen(true);
    setComposeType("new");
    setComposeData({
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      body: email.htmlContent || email.textContent,
      replyToEmail: email,
    });
  };

  const handleCloseCompose = () => {
    setIsComposeOpen(false);
    setComposeType("new");
    setComposeData({});
  };

  useEffect(() => {
    // Check both state and persistent ref for cached emails
    const cachedEmailsFromState = categoryEmails.get(activeCategory) || [];
    const cachedEmailsFromRef =
      emailCacheRef.categoryEmails.get(activeCategory) || [];

    // Use whichever has the data
    const hasCachedEmails =
      cachedEmailsFromState.length > 0 || cachedEmailsFromRef.length > 0;
    const cachedEmails =
      cachedEmailsFromState.length > 0
        ? cachedEmailsFromState
        : cachedEmailsFromRef;

    if (!hasCachedEmails) {
      console.log("No cached data, fetching emails for:", activeCategory);
      fetchEmails();
    } else {
      // Use cached emails immediately without loading state
      console.log("Using cached emails for category:", activeCategory);
      setIsLoading(false); // Ensure loading state is cleared
      setEmails(cachedEmails);
      // Hide category changing indicator when using cached data
      if (isCategoryChanging) {
        setTimeout(() => setIsCategoryChanging(false), 150);
      }
      // Also restore to state if we got it from ref
      if (
        cachedEmailsFromState.length === 0 &&
        cachedEmailsFromRef.length > 0
      ) {
        setCategoryEmailsState(new Map(emailCacheRef.categoryEmails));
      }
    }

    // Only fetch labels once
    if (labels.length === 0) {
      fetchLabels();
    }
  }, [activeCategory, isCategoryChanging]);

  // Hide category changing indicator when loading completes
  useEffect(() => {
    if (!isLoading && isCategoryChanging) {
      const timer = setTimeout(() => {
        setIsCategoryChanging(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isCategoryChanging]);

  // Execute pending category change when loading completes
  useEffect(() => {
    if (!isLoading && pendingCategory && pendingCategory !== activeCategory) {
      console.log("Executing pending category change:", pendingCategory);
      // Only show loading if changing to a different category
      setIsCategoryChanging(true);
      setActiveCategory(pendingCategory);
      // Update URL hash
      if (typeof window !== "undefined") {
        window.location.hash = pendingCategory;
      }
      setNextPageToken(null);
      setSelectedEmails(new Set());
      setPendingCategory(null);
    }
  }, [isLoading, pendingCategory, activeCategory]);

  // Cleanup effect to abort ongoing requests
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // Initialize hash on mount if not present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      // If no hash or invalid hash, set to current category
      if (!hash || !gmailCategories.some((cat) => cat.id === hash)) {
        window.location.hash = activeCategory;
      }
    }
  }, []);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.slice(1);
        if (hash && gmailCategories.some((cat) => cat.id === hash)) {
          setActiveCategory(hash);
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
      className="flex bg-background overflow-hidden"
      style={{ height: "calc(100vh - 25vh)", minHeight: "600px" }}
    >
      {/* Gmail-style Loading Indicator for Category Changes */}
      {isCategoryChanging && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="bg-primary text-white px-4 py-2 rounded-b-lg shadow-lg flex items-center gap-2 animate-slide-down">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm font-medium">Loading...</span>
          </div>
        </div>
      )}

      {/* Gmail Sidebar */}
      <div
        className="w-64 border-r border-border flex-shrink-0 overflow-y-auto h-full"
        style={{ backgroundColor: "hsl(var(--card-surface))" }}
      >
        <div className="p-4">
          <h2 className="text-xl font-semibold text-foreground mb-4">Gmail</h2>

          {/* Compose Button */}
          <Button
            onClick={handleCompose}
            className="w-full mb-6 bg-background border-border hover:bg-muted text-foreground rounded-xl"
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
                      ? "bg-primary/10 text-primary border-r-4 border-primary"
                      : "text-muted-foreground hover:bg-muted"
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
      <div
        className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0"
        style={{ backgroundColor: "hsl(var(--card-surface))" }}
      >
        {/* Top Toolbar */}
        <div className="border-b border-border bg-card">
          {/* Search Bar */}
          <div className="p-4 border-b border-border/50">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search mail"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 h-12 text-base border-border rounded-full"
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
              <span className="text-sm text-muted-foreground">
                {isLoading
                  ? `Loading...`
                  : `${filteredEmails.length} of ${emails.length} emails`}
              </span>
              <Button
                onClick={() => {
                  setIsLoading(true);
                  setError(null);
                  fetchEmails(searchTerm || undefined, undefined, true);
                }}
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
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center min-h-0">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            /* Emails List Container with Fixed Height and Scroll */
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-muted border-t border-border/50 email-list-container min-h-0 min-w-0">
              {filteredEmails.map((email, index) => {
                const isSelected = selectedEmails.has(email.id);

                return (
                  <div
                    key={email.id}
                    className={cn(
                      "email-list-item group border-b border-border/50 cursor-pointer",
                      !email.isRead && "bg-card font-medium",
                      email.isRead && "bg-muted/30",
                      isSelected && "bg-primary/5 border-primary/20"
                    )}
                    onClick={() => {
                      // Handle draft emails differently - open in compose
                      if (email.isDraft) {
                        handleOpenDraft(email);
                      } else {
                        // Use cached version if available for instant loading
                        const cachedEmail = emailCache.get(email.id);
                        viewEmail(cachedEmail || email);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 px-4 py-1 email-list-item-content">
                      {/* Checkbox */}
                      <div className="flex-shrink-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEmailSelection(email.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {/* Star */}

                      {/* Sender */}
                      <div
                        className="flex items-center min-w-0 flex-shrink-0"
                        style={{ width: "180px" }}
                      >
                        {email.isDraft ? (
                          <span className="text-sm text-red-600 dark:text-red-400">
                            Draft
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "truncate text-xs min-w-0 text-foreground",
                              !email.isRead ? "font-semibold" : "font-normal"
                            )}
                          >
                            {getCorrespondent(email)}
                          </span>
                        )}
                      </div>

                      {/* Subject and Snippet */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                          <span
                            className={cn(
                              "text-xs flex-shrink-0 truncate whitespace-nowrap text-foreground",
                              !email.isRead ? "font-semibold" : "font-normal"
                            )}
                            style={{ maxWidth: "250px" }}
                          >
                            {email.subject || "(no subject)"}
                          </span>
                          <span className="text-muted-foreground font-normal truncate min-w-0 text-xs">
                            — {email.snippet}
                          </span>
                        </div>
                      </div>

                      {/* Labels/Badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {email.hasAttachments && (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                        {getConversationCount(email) > 1 && (
                          <Badge
                            variant="outline"
                            className="text-xs text-foreground border-border bg-muted"
                          >
                            {getConversationCount(email)}
                          </Badge>
                        )}
                        {!email.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>

                      {/* Date */}
                      <div
                        className="flex-shrink-0 text-muted-foreground text-right"
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
                            <DropdownMenuItem className="text-red-600 dark:text-red-400">
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
                <div className="p-4 text-center border-t border-border/50">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">
                        Loading more emails...
                      </span>
                    </div>
                  ) : (
                    <Button
                      onClick={loadMoreEmails}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      Load More Emails
                    </Button>
                  )}
                </div>
              )}

              {/* No Emails State - Display nothing instead of "No emails found" */}
              {!isLoading && filteredEmails.length === 0 && null}
            </div>
          )}
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
          initialCc={composeData.cc || ""}
          initialBcc={composeData.bcc || ""}
          initialSubject={composeData.subject || ""}
          initialBody={composeData.body || ""}
          replyToEmail={composeData.replyToEmail}
          onDraftSaved={refreshDrafts}
        />
      )}
    </div>
  );
}
