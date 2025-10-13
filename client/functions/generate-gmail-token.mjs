#!/usr/bin/env node

import { google } from "googleapis";
import readline from "readline";

// OAuth2 configuration
const CLIENT_ID = "your-client-id.apps.googleusercontent.com"; // Replace with your actual client ID
const CLIENT_SECRET = ""; // Replace with your actual client secret
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"; // For desktop apps

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
];

console.log("🚀 Gmail OAuth2 Token Generator");
console.log("===============================");
console.log("");
console.log("Before running this script:");
console.log("1. Go to Google Cloud Console → APIs & Services → Credentials");
console.log("2. Create OAuth Client ID (Desktop App)");
console.log("3. Replace CLIENT_ID and CLIENT_SECRET above");
console.log("");

// Generate authorization URL
const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
});

console.log("📋 Steps to generate refresh token:");
console.log("1. Visit this URL in your browser:");
console.log("");
console.log(`   ${url}`);
console.log("");
console.log("2. Sign in as bella@imheretravels.com");
console.log("3. Grant Gmail permissions");
console.log("4. Copy the authorization code");
console.log("5. Paste it below");
console.log("");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter the authorization code here: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("");
    console.log("✅ Success! Your tokens:");
    console.log("========================");
    console.log(`Access Token: ${tokens.access_token}`);
    console.log(`Refresh Token: ${tokens.refresh_token}`);
    console.log(`Expires In: ${tokens.expiry_date}`);
    console.log("");
    console.log("🔧 Add these to your Firebase Functions config:");
    console.log("===============================================");
    console.log(`firebase functions:config:set gmail.client_id="${CLIENT_ID}"`);
    console.log(
      `firebase functions:config:set gmail.client_secret="${CLIENT_SECRET}"`
    );
    console.log(
      `firebase functions:config:set gmail.refresh_token="${tokens.refresh_token}"`
    );
    console.log("");
    console.log("Or add to your .env file:");
    console.log("========================");
    console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("");
    console.log("🎉 You can now use Gmail API in your Firebase Functions!");
  } catch (error) {
    console.error("❌ Error generating tokens:", error);
  }

  rl.close();
});

console.log("📌 Need help? Check the setup guide:");
console.log("   https://developers.google.com/gmail/api/quickstart/nodejs");
console.log("");
