const { google } = require("googleapis");
require("dotenv").config({ path: ".env.local" });

async function debugContacts() {
  try {
    console.log("🔍 Debugging Google Contacts access...\n");

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

    // Test 1: Check your own profile
    console.log("1️⃣ Testing your own profile (people/me)...");
    try {
      const meResponse = await people.people.get({
        resourceName: "people/me",
        personFields: "photos,names,emailAddresses",
      });

      console.log("✅ Your profile accessible");
      console.log(
        "   Name:",
        meResponse.data.names?.[0]?.displayName || "Unknown"
      );
      console.log(
        "   Email:",
        meResponse.data.emailAddresses?.[0]?.value || "Unknown"
      );
      console.log("   Photos:", meResponse.data.photos?.length || 0);
    } catch (error) {
      console.log("❌ Cannot access your profile:", error.message);
    }

    // Test 2: Try different search queries
    console.log("\n2️⃣ Testing different search queries...");

    const searchQueries = [
      "", // Empty query
      "a", // Single letter
      "test", // Common word
      "@gmail.com", // Email domain
      "gmail", // Email provider
    ];

    for (const query of searchQueries) {
      try {
        console.log(`\n   Searching for: "${query}"`);
        const response = await people.people.searchContacts({
          query: query,
          readMask: "photos,names,emailAddresses",
          pageSize: 10,
        });

        const results = response.data.results || [];
        console.log(`   Results: ${results.length} contacts`);

        if (results.length > 0) {
          console.log("   Sample contacts:");
          results.slice(0, 3).forEach((result, index) => {
            const person = result.person;
            const name = person.names?.[0]?.displayName || "Unknown";
            const email = person.emailAddresses?.[0]?.value || "No email";
            console.log(`     ${index + 1}. ${name} (${email})`);
          });
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Test 3: Try connections.list (alternative method)
    console.log("\n3️⃣ Testing connections.list...");
    try {
      const connectionsResponse = await people.people.connections.list({
        resourceName: "people/me",
        personFields: "photos,names,emailAddresses",
        pageSize: 10,
      });

      const connections = connectionsResponse.data.connections || [];
      console.log(`   Found ${connections.length} connections`);

      if (connections.length > 0) {
        console.log("   Sample connections:");
        connections.slice(0, 3).forEach((person, index) => {
          const name = person.names?.[0]?.displayName || "Unknown";
          const email = person.emailAddresses?.[0]?.value || "No email";
          console.log(`     ${index + 1}. ${name} (${email})`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 4: Check API permissions
    console.log("\n4️⃣ Checking API permissions...");
    try {
      const { token } = await oauth2Client.getAccessToken();
      if (token) {
        console.log("   ✅ Access token available");

        // Check token info
        const tokenInfo = await oauth2Client.getTokenInfo(token);
        console.log("   Token scopes:", tokenInfo.scopes);
        console.log("   Token audience:", tokenInfo.audience);
      } else {
        console.log("   ❌ No access token available");
      }
    } catch (error) {
      console.log(`   ❌ Error checking token: ${error.message}`);
    }

    console.log("\n📊 Debug Summary:");
    console.log(
      "   - If no contacts are found, you may need to add some contacts to Google Contacts"
    );
    console.log(
      "   - Make sure you have the correct scopes: contacts.readonly"
    );
    console.log("   - Check if your Google account has any contacts saved");
  } catch (error) {
    console.error("🚨 Error:", error);
  }
}

debugContacts();
