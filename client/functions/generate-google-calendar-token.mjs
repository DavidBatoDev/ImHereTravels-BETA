#!/usr/bin/env node

import { google } from "googleapis";
import readline from "readline";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../.env.local" });

// OAuth2 configuration
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000"; // Use configured redirect URI

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Include Gmail, Google Sheets, and Google Calendar scopes
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar.events", // NEW: Calendar events scope
];

console.log(
  "🚀 Gmail + Google Sheets + Google Calendar OAuth2 Token Generator"
);
console.log(
  "=================================================================="
);
console.log("");
console.log("Before running this script:");
console.log("1. Go to Google Cloud Console → APIs & Services → Credentials");
console.log("2. Create OAuth Client ID (Desktop App)");
console.log("3. Enable Gmail API, Google Sheets API, and Google Calendar API");
console.log("4. Replace CLIENT_ID and CLIENT_SECRET in .env.local");
console.log("");

// Generate authorization URL
const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent", // Force consent screen to ensure we get a refresh token
});

console.log("📋 Steps to generate refresh token:");
console.log("1. Visit this URL in your browser:");
console.log("");
console.log(`   ${url}`);
console.log("");
console.log("2. Sign in as imheretravels@gmail.com (Bella's account)");
console.log("3. Grant Gmail, Google Sheets, and Google Calendar permissions");
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
    console.log("🔧 Add these to your .env file:");
    console.log("================================");
    console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("");
    console.log("📝 Scopes included in this token:");
    console.log("- Gmail (read, send, compose, modify)");
    console.log("- Google Sheets (readonly)");
    console.log("- Google Drive (readonly)");
    console.log("- Google Calendar (events - create, read, update, delete)");
    console.log("");
    console.log(
      "🎉 You can now use Gmail API, Google Sheets API, and Google Calendar API!"
    );
    console.log("");
    console.log(
      "⚠️  IMPORTANT: Update your Firebase Functions environment variables:"
    );
    console.log(
      '   firebase functions:config:set gmail.refresh_token="' +
        tokens.refresh_token +
        '"'
    );
  } catch (error) {
    console.error("❌ Error generating tokens:", error);
  }

  rl.close();
});

console.log("📌 Need help?");
console.log(
  "   Gmail API: https://developers.google.com/gmail/api/quickstart/nodejs"
);
console.log(
  "   Sheets API: https://developers.google.com/sheets/api/quickstart/nodejs"
);
console.log(
  "   Calendar API: https://developers.google.com/calendar/api/quickstart/nodejs"
);
