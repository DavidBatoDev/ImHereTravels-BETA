const { google } = require("googleapis");
require("dotenv").config({ path: ".env.local" });

async function listAllContactsPaginated() {
  try {
    console.log(
      "🔍 Fetching ALL contacts from Google People API with pagination...\n"
    );

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

    let allContacts = [];
    let pageToken = null;
    let pageNumber = 1;
    const pageSize = 100; // Maximum allowed per page

    console.log("📄 Fetching contacts with pagination...\n");

    do {
      try {
        console.log(`📄 Page ${pageNumber} (${pageSize} contacts per page):`);

        // Fetch contacts with pagination
        const response = await people.people.connections.list({
          resourceName: "people/me",
          personFields:
            "photos,names,emailAddresses,phoneNumbers,organizations",
          pageSize: pageSize,
          pageToken: pageToken,
        });

        const contacts = response.data.connections || [];
        console.log(`  Found ${contacts.length} contacts on this page`);

        if (contacts.length === 0) {
          console.log("  No more contacts found.\n");
          break;
        }

        // Add contacts to our collection
        allContacts = allContacts.concat(contacts);

        // Show sample of contacts from this page
        console.log("  Sample contacts from this page:");
        contacts.slice(0, 3).forEach((person, index) => {
          const name = person.names?.[0]?.displayName || "Unknown";
          const email = person.emailAddresses?.[0]?.value || "No email";
          const photoCount = person.photos?.length || 0;
          console.log(
            `    ${index + 1}. ${name} (${email}) - ${photoCount} photos`
          );
        });

        // Get next page token
        pageToken = response.data.nextPageToken;
        pageNumber++;

        // Add a small delay to respect rate limits
        if (pageToken) {
          console.log("  ⏳ Waiting 1 second before fetching next page...\n");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          console.log("  ✅ No more pages to fetch.\n");
        }
      } catch (error) {
        console.error(`❌ Error fetching page ${pageNumber}:`, error.message);
        break;
      }
    } while (pageToken);

    console.log("📊 Final Summary:");
    console.log(`   Total contacts found: ${allContacts.length}`);
    console.log(`   Total pages processed: ${pageNumber - 1}`);

    // Show some statistics
    const contactsWithPhotos = allContacts.filter(
      (contact) => contact.photos && contact.photos.length > 0
    );
    const contactsWithCanonicalPhotos = allContacts.filter((contact) =>
      contact.photos?.some((photo) => photo.url.includes("/a-/"))
    );
    const contactsWithCachedPhotos = allContacts.filter((contact) =>
      contact.photos?.some((photo) => photo.url.includes("/cm/"))
    );

    console.log("\n📈 Contact Statistics:");
    console.log(`   Contacts with photos: ${contactsWithPhotos.length}`);
    console.log(
      `   Contacts with canonical photos (a-/): ${contactsWithCanonicalPhotos.length}`
    );
    console.log(
      `   Contacts with cached photos (cm/): ${contactsWithCachedPhotos.length}`
    );
    console.log(
      `   Contacts without photos: ${
        allContacts.length - contactsWithPhotos.length
      }`
    );

    // Show sample of contacts with canonical photos
    if (contactsWithCanonicalPhotos.length > 0) {
      console.log("\n🎯 Sample contacts with canonical photos:");
      contactsWithCanonicalPhotos.slice(0, 5).forEach((person, index) => {
        const name = person.names?.[0]?.displayName || "Unknown";
        const email = person.emailAddresses?.[0]?.value || "No email";
        const canonicalPhoto = person.photos?.find((photo) =>
          photo.url.includes("/a-/")
        );
        console.log(`   ${index + 1}. ${name} (${email})`);
        console.log(`      Canonical URL: ${canonicalPhoto?.url}`);
      });
    }

    // Show sample of contacts with cached photos only
    const contactsWithOnlyCachedPhotos = contactsWithCachedPhotos.filter(
      (contact) => !contact.photos?.some((photo) => photo.url.includes("/a-/"))
    );

    if (contactsWithOnlyCachedPhotos.length > 0) {
      console.log("\n📸 Sample contacts with only cached photos:");
      contactsWithOnlyCachedPhotos.slice(0, 5).forEach((person, index) => {
        const name = person.names?.[0]?.displayName || "Unknown";
        const email = person.emailAddresses?.[0]?.value || "No email";
        const cachedPhoto = person.photos?.find((photo) =>
          photo.url.includes("/cm/")
        );
        console.log(`   ${index + 1}. ${name} (${email})`);
        console.log(`      Cached URL: ${cachedPhoto?.url}`);
      });
    }

    console.log("\n✅ All contacts fetched successfully!");
  } catch (error) {
    console.error("🚨 Error:", error);
  }
}

listAllContactsPaginated();
