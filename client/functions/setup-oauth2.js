const { google } = require("googleapis");
const fs = require("fs");
const readline = require("readline");

// OAuth2 setup for Gmail API
async function setupOAuth2() {
  console.log("🔧 Setting up OAuth2 for Gmail API...\n");

  // You'll need to create OAuth2 credentials in Google Cloud Console
  // Go to: https://console.cloud.google.com/apis/credentials
  // Create OAuth 2.0 Client IDs (not Service Account)

  const oauth2Client = new google.auth.OAuth2(
    "YOUR_CLIENT_ID", // Replace with your OAuth2 Client ID
    "YOUR_CLIENT_SECRET", // Replace with your OAuth2 Client Secret
    "http://localhost:3000/oauth2callback" // Redirect URI
  );

  // Generate the URL for OAuth2 consent
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.compose"],
  });

  console.log("📋 Steps to complete OAuth2 setup:");
  console.log(
    "1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials"
  );
  console.log("2. Create OAuth 2.0 Client ID (not Service Account)");
  console.log("3. Add your redirect URI: http://localhost:3000/oauth2callback");
  console.log("4. Replace CLIENT_ID and CLIENT_SECRET in this script");
  console.log("5. Run this script to get authorization URL");
  console.log("6. Visit the URL and authorize the app");
  console.log("7. Save the refresh token to your .env file\n");

  console.log("🔗 Authorization URL:");
  console.log(authUrl);
  console.log(
    "\nAfter authorization, you'll get a refresh token that you can use for API calls."
  );
}

setupOAuth2().catch(console.error);
