"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface EmailAvatarProps {
  email: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showFallback?: boolean;
  avatarUrl?: string; // Allow parent to pass avatar URL directly
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-12 h-12 text-base",
};

export function EmailAvatar({
  email,
  name,
  size = "md",
  className,
  showFallback = true,
  avatarUrl: propAvatarUrl,
}: EmailAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    propAvatarUrl || null
  );
  const [isLoading, setIsLoading] = useState(!propAvatarUrl);
  const [error, setError] = useState(false);

  // Get initials for fallback
  const getInitials = (email: string, displayName?: string) => {
    if (displayName) {
      const parts = displayName.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }

    // Extract from email
    const name = email.split("@")[0];

    if (name.includes(".")) {
      const parts = name.split(".");
      return parts
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }

    return name.substring(0, 2).toUpperCase();
  };

  // Update avatar URL when prop changes
  useEffect(() => {
    if (propAvatarUrl) {
      setAvatarUrl(propAvatarUrl);
      setIsLoading(false);
      setError(false);
    }
  }, [propAvatarUrl]);

  // Extract email address from display name format
  const extractEmail = (emailString: string): string => {
    // Handle format like "Name <email@domain.com>"
    const emailMatch = emailString.match(/<([^>]+)>/);
    if (emailMatch) {
      return emailMatch[1];
    }
    // If no angle brackets, assume it's already an email
    return emailString;
  };

  // Fetch avatar URL only if not provided by parent
  useEffect(() => {
    if (!email || propAvatarUrl) {
      setIsLoading(false);
      return;
    }

    const fetchAvatar = async () => {
      try {
        const cleanEmail = extractEmail(email);
        console.log(
          `🔍 EmailAvatar: Fetching avatar for ${email} -> ${cleanEmail}`
        );
        setIsLoading(true);
        setError(false);

        const response = await fetch(
          `/api/avatars?email=${encodeURIComponent(cleanEmail)}`
        );
        const result = await response.json();

        console.log(`📊 EmailAvatar: API response for ${cleanEmail}:`, result);

        if (result.success) {
          console.log(
            `✅ EmailAvatar: Avatar found for ${cleanEmail}: ${result.data.avatarUrl}`
          );
          setAvatarUrl(result.data.avatarUrl);
        } else {
          console.log(
            `❌ EmailAvatar: Avatar fetch failed for ${cleanEmail}:`,
            result
          );
          setError(true);
        }
      } catch (err) {
        console.error(
          `❌ EmailAvatar: Error fetching avatar for ${email}:`,
          err
        );
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatar();
  }, [email, propAvatarUrl]);

  const initials = getInitials(email, name);
  const sizeClass = sizeClasses[size];

  return (
    <Avatar className={cn(sizeClass, className)}>
      {avatarUrl && !error && (
        <AvatarImage
          src={avatarUrl}
          alt={name || email}
          className="object-cover"
          onError={() => setError(true)}
        />
      )}
      {showFallback && (!avatarUrl || error || isLoading) && (
        <AvatarFallback
          className={cn(
            "bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium",
            isLoading && "animate-pulse"
          )}
        >
          {isLoading ? "..." : initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

// Batch Avatar component for multiple emails
interface BatchEmailAvatarProps {
  emails: string[];
  onAvatarsLoaded?: (avatarMap: Map<string, string>) => void;
}

export function BatchEmailAvatar({
  emails,
  onAvatarsLoaded,
}: BatchEmailAvatarProps) {
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (emails.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchBatchAvatars = async () => {
      try {
        setIsLoading(true);

        const response = await fetch("/api/avatars", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails }),
        });

        const result = await response.json();

        if (result.success) {
          const newAvatarMap = new Map(
            Object.entries(result.data.avatars) as [string, string][]
          );
          setAvatarMap(newAvatarMap);
          onAvatarsLoaded?.(newAvatarMap);
        }
      } catch (err) {
        console.error("Error fetching batch avatars:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchAvatars();
  }, [emails, onAvatarsLoaded]);

  return { avatarMap, isLoading };
}

// Hook for using avatar data
export function useEmailAvatars(emails: string[]) {
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (emails.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchAvatars = async () => {
      try {
        setIsLoading(true);

        const response = await fetch("/api/avatars", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ emails }),
        });

        const result = await response.json();

        if (result.success) {
          const newAvatarMap = new Map(
            Object.entries(result.data.avatars) as [string, string][]
          );
          setAvatarMap(newAvatarMap);
        }
      } catch (err) {
        console.error("Error fetching avatars:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatars();
  }, [emails]);

  const getAvatarUrl = (email: string) => avatarMap.get(email) || null;
  const getInitials = (email: string) => {
    const name = email.split("@")[0];
    if (name.includes(".")) {
      const parts = name.split(".");
      return parts
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return name.substring(0, 2).toUpperCase();
  };

  return {
    avatarMap,
    isLoading,
    getAvatarUrl,
    getInitials,
  };
}
