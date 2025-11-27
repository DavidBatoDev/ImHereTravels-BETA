import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ contacts: [] });
    }

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.PEOPLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID,
      process.env.PEOPLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );

    oauth2Client.setCredentials({
      refresh_token:
        process.env.PEOPLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN,
    });

    const people = google.people({ version: "v1", auth: oauth2Client });

    // Search contacts by both name and email
    const response = await people.people.searchContacts({
      query: query,
      readMask: "photos,names,emailAddresses",
      pageSize: 20, // Increased to get more results for better matching
    });

    const allContacts = (response.data.results || []).map((result) => {
      // `result.person` can be undefined according to the People API types,
      // so use optional chaining everywhere we access it.
      const email = result.person?.emailAddresses?.[0]?.value || "";
      const displayName = result.person?.names?.[0]?.displayName;
      // Use email as name if no display name or if it's "Unknown"
      const name = displayName && displayName !== "Unknown" ? displayName : email;
      const photo = result.person?.photos?.[0];

      return {
        name,
        email,
        avatarUrl: photo?.url,
      };
    });

    // Client-side filtering for better matching
    const queryLower = query.toLowerCase();
    const filteredContacts = allContacts.filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(queryLower);
      const emailMatch = contact.email.toLowerCase().includes(queryLower);
      return nameMatch || emailMatch;
    });

    // Sort by relevance: exact matches first, then partial matches
    const sortedContacts = filteredContacts.sort((a, b) => {
      const aNameExact = a.name.toLowerCase() === queryLower;
      const aEmailExact = a.email.toLowerCase() === queryLower;
      const bNameExact = b.name.toLowerCase() === queryLower;
      const bEmailExact = b.email.toLowerCase() === queryLower;
      
      const aExact = aNameExact || aEmailExact;
      const bExact = bNameExact || bEmailExact;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // If both are exact or both are partial, sort by name
      return a.name.localeCompare(b.name);
    });

    // Limit to 10 results for performance
    const contacts = sortedContacts.slice(0, 10);

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Error searching contacts:", error);
    return NextResponse.json(
      { error: "Failed to search contacts" },
      { status: 500 }
    );
  }
}
