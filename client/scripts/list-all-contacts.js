const { google } = require("googleapis");
require("dotenv").config({ path: ".env.local" });

async function listAllContacts() {
  try {
    console.log("🔍 Fetching all contacts from Google People API...\n");

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

    let totalContacts = 0;

    try {
      console.log(`📄 Fetching all contacts:`);

      // Use connections.list to get all contacts
      const response = await people.people.connections.list({
        resourceName: "people/me",
        personFields: "photos,names,emailAddresses,phoneNumbers,organizations",
        pageSize: 100, // Maximum allowed
      });

      const results = response.data.connections || [];
      console.log(`  Found ${results.length} contacts\n`);

      if (results.length === 0) {
        console.log("  No contacts found.\n");
      } else {
        // Process each contact
        results.forEach((person, index) => {
          const contactNumber = index + 1;

          console.log(`  ${contactNumber}. Contact Details:`);

          // Name
          if (person.names && person.names.length > 0) {
            const name = person.names[0];
            console.log(`     Name: ${name.displayName || "Unknown"}`);
            if (name.givenName)
              console.log(`     First Name: ${name.givenName}`);
            if (name.familyName)
              console.log(`     Last Name: ${name.familyName}`);
          } else {
            console.log(`     Name: Unknown`);
          }

          // Email addresses
          if (person.emailAddresses && person.emailAddresses.length > 0) {
            console.log(`     Emails:`);
            person.emailAddresses.forEach((email, emailIndex) => {
              console.log(
                `       ${emailIndex + 1}. ${email.value} ${
                  email.metadata?.primary ? "(Primary)" : ""
                }`
              );
            });
          } else {
            console.log(`     Emails: None`);
          }

          // Phone numbers
          if (person.phoneNumbers && person.phoneNumbers.length > 0) {
            console.log(`     Phone Numbers:`);
            person.phoneNumbers.forEach((phone, phoneIndex) => {
              console.log(
                `       ${phoneIndex + 1}. ${phone.value} ${
                  phone.metadata?.primary ? "(Primary)" : ""
                }`
              );
            });
          }

          // Organizations
          if (person.organizations && person.organizations.length > 0) {
            console.log(`     Organizations:`);
            person.organizations.forEach((org, orgIndex) => {
              console.log(
                `       ${orgIndex + 1}. ${org.name || "Unknown"} ${
                  org.title ? `- ${org.title}` : ""
                }`
              );
            });
          }

          // Photos
          if (person.photos && person.photos.length > 0) {
            console.log(`     Photos:`);
            person.photos.forEach((photo, photoIndex) => {
              console.log(`       ${photoIndex + 1}. ${photo.url}`);
              console.log(
                `          Primary: ${photo.metadata?.primary || false}`
              );
              console.log(
                `          Source: ${photo.metadata?.source?.type || "Unknown"}`
              );
            });
          } else {
            console.log(`     Photos: None`);
          }

          // Metadata
          if (person.metadata) {
            console.log(
              `     Source: ${person.metadata.source?.type || "Unknown"}`
            );
            console.log(
              `     Object Type: ${person.metadata.objectType || "Unknown"}`
            );
          }

          console.log(""); // Empty line for readability
        });

        totalContacts = results.length;
      }
    } catch (error) {
      console.error(`❌ Error fetching contacts:`, error.message);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total contacts found: ${totalContacts}`);
  } catch (error) {
    console.error("🚨 Error:", error);
  }
}

listAllContacts();
