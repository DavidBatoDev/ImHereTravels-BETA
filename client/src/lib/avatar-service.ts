import { google } from "googleapis";
import crypto from "crypto";

// Avatar service for fetching user avatars from multiple sources
export class AvatarService {
  private people: any;
  private oauth2Client: any;
  private avatarCache: Map<string, string> = new Map();
  private cacheTimeout: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Initialize OAuth2 client - use dedicated People API credentials
    this.oauth2Client = new google.auth.OAuth2(
      process.env.PEOPLE_CLIENT_ID ||
        process.env.GMAIL_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_ID,
      process.env.PEOPLE_CLIENT_SECRET ||
        process.env.GMAIL_CLIENT_SECRET ||
        process.env.GOOGLE_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob" // For server-side apps
    );

    // Set credentials from environment variables
    this.oauth2Client.setCredentials({
      refresh_token:
        process.env.PEOPLE_REFRESH_TOKEN ||
        process.env.GMAIL_REFRESH_TOKEN ||
        process.env.GOOGLE_REFRESH_TOKEN,
    });

    // Initialize People API
    this.people = google.people({ version: "v1", auth: this.oauth2Client });
  }

  /**
   * Get avatar URL for an email address using multiple sources
   * @param email - Email address to get avatar for
   * @returns Promise<string> - Avatar URL or fallback
   */
  async getAvatarUrl(email: string): Promise<string> {
    if (!email) return this.getDefaultAvatarUrl(email);

    // Check cache first
    const cached = this.avatarCache.get(email);
    if (cached) {
      console.log(`📦 Using cached avatar for ${email}: ${cached}`);
      return cached;
    }

    try {
      console.log(`🔍 AvatarService: Fetching avatar for ${email}...`);

      // Try UserInfo API first (only works for authenticated user)
      const userInfoAvatar = await this.getUserInfoAvatar(email);
      if (userInfoAvatar) {
        console.log(
          `✅ AvatarService: UserInfo avatar found for ${email}: ${userInfoAvatar}`
        );
        this.avatarCache.set(email, userInfoAvatar);
        return userInfoAvatar;
      }

      // Try People API as fallback
      const peopleAvatar = await this.getPeopleApiAvatar(email);
      if (peopleAvatar) {
        // Check if it's a canonical URL (a-/...) or cached URL (cm/...)
        const isCanonical = peopleAvatar.includes("/a-/");
        console.log(
          `✅ AvatarService: People API avatar found for ${email}: ${peopleAvatar} (${
            isCanonical ? "canonical" : "cached"
          })`
        );

        // If it's not canonical, try to get a better version
        let finalUrl = peopleAvatar;
        if (!isCanonical) {
          console.log(
            `🔄 AvatarService: Attempting to get canonical URL for ${email}...`
          );
          const canonicalUrl = await this.tryGetCanonicalUrl(
            email,
            peopleAvatar
          );
          if (canonicalUrl) {
            console.log(
              `✅ AvatarService: Found canonical URL for ${email}: ${canonicalUrl}`
            );
            finalUrl = canonicalUrl;
          } else {
            console.log(
              `❌ AvatarService: No canonical URL found for ${email}, using enhanced cached URL`
            );
            finalUrl = this.enhanceAvatarUrl(peopleAvatar);
          }
        }

        this.avatarCache.set(email, finalUrl);
        return finalUrl;
      }

      // No fallback - return default avatar
      console.log(
        `🔄 AvatarService: No avatar found for ${email}, using default`
      );
      const defaultUrl = this.getDefaultAvatarUrl(email);
      this.avatarCache.set(email, defaultUrl);
      return defaultUrl;
    } catch (error) {
      console.error(
        `❌ AvatarService: Error fetching avatar for ${email}:`,
        error
      );
      // Return default avatar as fallback
      const defaultUrl = this.getDefaultAvatarUrl(email);
      this.avatarCache.set(email, defaultUrl);
      return defaultUrl;
    }
  }

  /**
   * Get avatar URL from OAuth2 UserInfo endpoint (canonical Google Account photo)
   * This only works for the authenticated user's own email
   */
  private async getUserInfoAvatar(email: string): Promise<string | null> {
    try {
      console.log(`🔍 AvatarService: Trying OAuth2 UserInfo for ${email}...`);

      // Get access token
      const { token } = await this.oauth2Client.getAccessToken();
      if (!token) {
        console.log(`❌ No access token available for UserInfo API`);
        return null;
      }

      // Call OAuth2 UserInfo endpoint
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.log(
          `❌ UserInfo API failed: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const userInfo = await response.json();
      console.log(`📊 UserInfo API response:`, {
        email: userInfo.email,
        hasPicture: !!userInfo.picture,
        picture: userInfo.picture,
        isCanonicalUrl: userInfo.picture?.includes("/a-/"),
      });

      // Check if this is the user we're looking for
      if (userInfo.email === email && userInfo.picture) {
        console.log(
          `✅ UserInfo avatar found for ${email}: ${userInfo.picture}`
        );
        return userInfo.picture;
      }

      console.log(
        `❌ UserInfo email mismatch: expected ${email}, got ${userInfo.email} (UserInfo only works for authenticated user)`
      );
      return null;
    } catch (error: any) {
      console.error(`🚨 UserInfo API error for ${email}:`, {
        error: error.message,
        code: error.code,
        status: error.status,
      });
      return null;
    }
  }

  /**
   * Try to get avatar from Google People API
   * @param email - Email address
   * @returns Promise<string | null> - Avatar URL or null
   */
  private async getPeopleApiAvatar(email: string): Promise<string | null> {
    try {
      console.log(`🔍 AvatarService: Searching People API for: ${email}`);

      // Search for the contact in both contacts and directory
      const searchResponse = await this.people.people.searchContacts({
        query: email,
        readMask: "photos,names,emailAddresses",
        pageSize: 10, // Increased to get more results
      });

      console.log(`📊 AvatarService: People API response for ${email}:`, {
        hasResults: !!searchResponse.data.results,
        resultCount: searchResponse.data.results?.length || 0,
        results: searchResponse.data.results,
      });

      const results = searchResponse.data.results;
      if (results && results.length > 0) {
        console.log(`👤 Found ${results.length} results for ${email}`);

        // Collect all photos from all results
        const allPhotos: any[] = [];
        results.forEach((result: any, index: number) => {
          const person = result.person;
          console.log(`  Result ${index + 1}:`, {
            name: person.names?.[0]?.displayName || "Unknown",
            email: person.emailAddresses?.[0]?.value || "Unknown",
            hasPhotos: !!person.photos,
            photoCount: person.photos?.length || 0,
            sourceType: person.metadata?.source?.type || "Unknown",
          });

          if (person.photos && person.photos.length > 0) {
            person.photos.forEach((photo: any) => {
              allPhotos.push({
                ...photo,
                resultIndex: index,
                personName: person.names?.[0]?.displayName || "Unknown",
              });
            });
          }
        });

        if (allPhotos.length > 0) {
          console.log(
            `📸 All photos for ${email} (${allPhotos.length} total):`
          );
          allPhotos.forEach((photo: any, index: number) => {
            console.log(`  Photo ${index + 1}:`, {
              url: photo.url,
              isPrimary: photo.metadata?.primary,
              sourceType: photo.metadata?.source?.type,
              sourceId: photo.metadata?.source?.id,
              resultIndex: photo.resultIndex,
              personName: photo.personName,
              metadata: photo.metadata,
            });
          });

          // Get the best photo from all results
          // Priority: PROFILE > primary > first available
          const bestPhoto = allPhotos.reduce((best: any, current: any) => {
            const isCurrentProfile =
              current.metadata?.source?.type === "PROFILE";
            const isCurrentPrimary = current.metadata?.primary;
            const isBestProfile = best?.metadata?.source?.type === "PROFILE";
            const isBestPrimary = best?.metadata?.primary;

            // PROFILE photos have highest priority
            if (isCurrentProfile && !isBestProfile) return current;
            if (!isCurrentProfile && isBestProfile) return best;

            // Then primary photos
            if (isCurrentPrimary && !isBestPrimary) return current;
            if (!isCurrentPrimary && isBestPrimary) return best;

            // Then first available
            if (!best) return current;

            return best;
          });

          console.log(`✅ Selected best photo for ${email}:`, {
            url: bestPhoto.url,
            isPrimary: bestPhoto.metadata?.primary,
            sourceType: bestPhoto.metadata?.source?.type,
            sourceId: bestPhoto.metadata?.source?.id,
            resultIndex: bestPhoto.resultIndex,
            personName: bestPhoto.personName,
          });

          // Try to get higher quality version of the URL
          const enhancedUrl = this.enhanceAvatarUrl(bestPhoto.url);
          console.log(`🔧 Enhanced URL for ${email}: ${enhancedUrl}`);
          return enhancedUrl;
        } else {
          console.log(`❌ No photos found in any results for ${email}`);
        }
      } else {
        console.log(`❌ No results found for ${email}`);
      }

      return null;
    } catch (error) {
      console.error(`🚨 People API error for ${email}:`, {
        error: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
      });
      return null;
    }
  }

  /**
   * Generate Gravatar URL for email
   * @param email - Email address
   * @returns string - Gravatar URL
   */
  private getGravatarUrl(email: string): string {
    if (!email) return this.getDefaultAvatarUrl(email);

    // Create MD5 hash of email
    const hash = crypto
      .createHash("md5")
      .update(email.trim().toLowerCase())
      .digest("hex");

    // Return Gravatar URL with professional fallback
    // d=mp: Mystery person (silhouette) - most professional
    // s=128: Size 128px
    // r=pg: Rating PG (safe for all audiences)
    // f=y: Force default (don't use auto-generated)
    return `https://www.gravatar.com/avatar/${hash}?d=mp&s=128&r=pg&f=y`;
  }

  /**
   * Get alternative Gravatar fallback options
   * @param email - Email address
   * @param fallbackType - Type of fallback to use
   * @returns string - Gravatar URL with specific fallback
   */
  private getGravatarUrlWithFallback(
    email: string,
    fallbackType:
      | "mp"
      | "identicon"
      | "monsterid"
      | "wavatar"
      | "retro"
      | "robohash" = "mp"
  ): string {
    if (!email) return this.getDefaultAvatarUrl(email);

    const hash = crypto
      .createHash("md5")
      .update(email.trim().toLowerCase())
      .digest("hex");

    return `https://www.gravatar.com/avatar/${hash}?d=${fallbackType}&s=128&r=pg&f=y`;
  }

  /**
   * Get default avatar URL for unknown users
   * @param email - Email address to generate initials from
   * @returns string - Default avatar URL
   */
  private getDefaultAvatarUrl(email?: string): string {
    // Generate initials from email if provided
    const name = email ? this.getAvatarInitials(email) : "User";
    // Use a professional default avatar service
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=6b7280&color=fff&size=128&bold=true`;
  }

  /**
   * Try to get canonical a-/ URL using various strategies
   */
  private async tryGetCanonicalUrl(
    email: string,
    cachedUrl: string
  ): Promise<string | null> {
    try {
      console.log(
        `🔍 AvatarService: Trying to get canonical URL for ${email}...`
      );

      // Strategy 1: Try different sizes of the same URL
      const baseUrl = cachedUrl.split("=")[0];
      const sizes = ["s96", "s192", "s512", "s1024"];

      for (const size of sizes) {
        try {
          const testUrl = `${baseUrl}=${size}`;
          console.log(`🔍 AvatarService: Testing size ${size}: ${testUrl}`);

          // Test if the URL is accessible
          const response = await fetch(testUrl, { method: "HEAD" });
          if (response.ok) {
            console.log(`✅ AvatarService: Size ${size} is accessible`);
            // Check if it's a canonical URL
            if (testUrl.includes("/a-/")) {
              console.log(
                `🎉 AvatarService: Found canonical URL with size ${size}: ${testUrl}`
              );
              return testUrl;
            }
          }
        } catch (error) {
          console.log(`❌ AvatarService: Size ${size} failed:`, error.message);
        }
      }

      // Strategy 2: Try to extract user ID from cached URL and construct a-/ URL
      const cmMatch = cachedUrl.match(/\/cm\/([^\/]+)/);
      if (cmMatch) {
        const userId = cmMatch[1];
        console.log(`🔍 AvatarService: Extracted user ID: ${userId}`);

        // Try to construct a canonical URL (this is speculative)
        const canonicalUrl = `https://lh3.googleusercontent.com/a-/ALV-Uj${userId}=s512-c`;
        console.log(
          `🔍 AvatarService: Trying constructed canonical URL: ${canonicalUrl}`
        );

        try {
          const response = await fetch(canonicalUrl, { method: "HEAD" });
          if (response.ok) {
            console.log(
              `🎉 AvatarService: Constructed canonical URL works: ${canonicalUrl}`
            );
            return canonicalUrl;
          }
        } catch (error) {
          console.log(
            `❌ AvatarService: Constructed canonical URL failed:`,
            error.message
          );
        }
      }

      // Strategy 3: Try Workspace Directory search (if available)
      try {
        console.log(
          `🔍 AvatarService: Trying Workspace Directory search for ${email}...`
        );
        const directoryResponse =
          await this.people.people.searchDirectoryPeople({
            query: email,
            readMask: "photos",
            pageSize: 1,
          });

        if (
          directoryResponse.data.results &&
          directoryResponse.data.results.length > 0
        ) {
          const person = directoryResponse.data.results[0].person;
          if (person.photos && person.photos.length > 0) {
            const photo = person.photos[0];
            if (photo.url && photo.url.includes("/a-/")) {
              console.log(
                `🎉 AvatarService: Found canonical URL via Workspace Directory: ${photo.url}`
              );
              return photo.url;
            }
          }
        }
      } catch (error) {
        console.log(
          `❌ AvatarService: Workspace Directory search failed:`,
          error.message
        );
      }

      console.log(`❌ AvatarService: No canonical URL found for ${email}`);
      return null;
    } catch (error) {
      console.error(
        `🚨 AvatarService: Error trying to get canonical URL for ${email}:`,
        error
      );
      return null;
    }
  }

  /**
   * Enhance avatar URL to get higher quality version
   */
  private enhanceAvatarUrl(url: string): string {
    if (!url || !url.includes("googleusercontent.com")) {
      return url;
    }

    // If it's already a canonical a-/ URL, return as is
    if (url.includes("/a-/")) {
      console.log(`📸 Already canonical URL: ${url}`);
      return url;
    }

    // If it's a cm/ URL, try to enhance it
    if (url.includes("/cm/")) {
      // Try to get higher quality by removing size restrictions
      let enhanced = url;

      // Remove size restrictions (s=100, s=80, etc.)
      enhanced = enhanced.replace(/=s\d+(-[a-z]+)?/g, "");

      // Add higher quality parameters
      if (!enhanced.includes("=")) {
        enhanced += "=s512-c"; // 512px, crop
      } else if (!enhanced.includes("s")) {
        enhanced += "&s=512-c";
      }

      console.log(`🔧 Enhanced cm/ URL: ${url} -> ${enhanced}`);
      return enhanced;
    }

    // For other Google URLs, try to enhance
    let enhanced = url;

    // Remove size restrictions
    enhanced = enhanced.replace(/=s\d+(-[a-z]+)?/g, "");

    // Add higher quality parameters
    if (!enhanced.includes("=")) {
      enhanced += "=s512-c";
    } else if (!enhanced.includes("s")) {
      enhanced += "&s=512-c";
    }

    console.log(`🔧 Enhanced other URL: ${url} -> ${enhanced}`);
    return enhanced;
  }

  /**
   * Get avatar initials for fallback display
   * @param email - Email address
   * @returns string - Initials
   */
  getAvatarInitials(email: string): string {
    if (!email) return "?";

    // Extract name from email
    const name = email.split("@")[0];

    // Handle common email patterns
    if (name.includes(".")) {
      const parts = name.split(".");
      return parts
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }

    // Single word - take first two characters
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Batch fetch avatars for multiple emails
   * @param emails - Array of email addresses
   * @returns Promise<Map<string, string>> - Map of email to avatar URL
   */
  async getBatchAvatars(emails: string[]): Promise<Map<string, string>> {
    const avatarMap = new Map<string, string>();

    // Process emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const promises = batch.map(async (email) => {
        const avatarUrl = await this.getAvatarUrl(email);
        return { email, avatarUrl };
      });

      const results = await Promise.all(promises);
      results.forEach(({ email, avatarUrl }) => {
        avatarMap.set(email, avatarUrl);
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return avatarMap;
  }

  /**
   * Clear avatar cache
   */
  clearCache(): void {
    this.avatarCache.clear();
  }

  /**
   * Get cache statistics
   * @returns object - Cache stats
   */
  getCacheStats(): { size: number; emails: string[] } {
    return {
      size: this.avatarCache.size,
      emails: Array.from(this.avatarCache.keys()),
    };
  }

  /**
   * Test People API connection and permissions
   * @returns Promise<object> - Test results
   */
  async testPeopleApiConnection(): Promise<{
    success: boolean;
    canAccessSelf: boolean;
    canSearchContacts: boolean;
    error?: string;
  }> {
    try {
      // Test 1: Try to access self profile
      let canAccessSelf = false;
      try {
        await this.people.people.get({
          resourceName: "people/me",
          personFields: "photos,names,emailAddresses",
        });
        canAccessSelf = true;
        console.log("✅ People API: Can access self profile");
      } catch (error: any) {
        console.error(
          "❌ People API: Cannot access self profile:",
          error.message
        );
      }

      // Test 2: Try to search contacts
      let canSearchContacts = false;
      try {
        await this.people.people.searchContacts({
          query: "test@example.com",
          readMask: "photos,names,emailAddresses",
          pageSize: 1,
        });
        canSearchContacts = true;
        console.log("✅ People API: Can search contacts");
      } catch (error: any) {
        console.error("❌ People API: Cannot search contacts:", error.message);
      }

      return {
        success: canAccessSelf && canSearchContacts,
        canAccessSelf,
        canSearchContacts,
      };
    } catch (error: any) {
      console.error("🚨 People API connection test failed:", error);
      return {
        success: false,
        canAccessSelf: false,
        canSearchContacts: false,
        error: error.message,
      };
    }
  }

  /**
   * Get avatar URL with custom Gravatar fallback
   * @param email - Email address
   * @param fallbackType - Gravatar fallback type
   * @returns Promise<string> - Avatar URL
   */
  async getAvatarUrlWithCustomFallback(
    email: string,
    fallbackType:
      | "mp"
      | "identicon"
      | "monsterid"
      | "wavatar"
      | "retro"
      | "robohash"
  ): Promise<string> {
    if (!email) return this.getDefaultAvatarUrl(email);

    // Check cache first
    const cacheKey = `${email}_${fallbackType}`;
    const cached = this.avatarCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Try People API first
      const peopleAvatar = await this.getPeopleApiAvatar(email);
      if (peopleAvatar) {
        this.avatarCache.set(cacheKey, peopleAvatar);
        return peopleAvatar;
      }

      // Use custom Gravatar fallback
      const gravatarUrl = this.getGravatarUrlWithFallback(email, fallbackType);
      this.avatarCache.set(cacheKey, gravatarUrl);
      return gravatarUrl;
    } catch (error) {
      console.error(`Error fetching avatar for ${email}:`, error);
      const gravatarUrl = this.getGravatarUrlWithFallback(email, fallbackType);
      this.avatarCache.set(cacheKey, gravatarUrl);
      return gravatarUrl;
    }
  }
}

// Export singleton instance
export const avatarService = new AvatarService();
