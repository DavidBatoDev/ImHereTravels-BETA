#!/usr/bin/env node

import { google } from "googleapis";
import readline from "readline";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../.env.local" });

// OAuth2 configuration
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000"; // Updated redirect URI (Google deprecated OOB)

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
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar.events"
];

console.log("🚀 Gmail + Google Sheets OAuth2 Token Generator");
console.log("==============================================");
console.log("");
console.log("⚠️  IMPORTANT: Before running this script:");
console.log("1. Go to Google Cloud Console → APIs & Services → Credentials");
console.log("2. Edit your OAuth Client ID");
console.log("3. Add 'http://localhost:3000' to Authorized redirect URIs");
console.log("4. Enable Gmail API and Google Sheets API");
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
console.log("2. Sign in as imheretravels@gmail.com");
console.log("3. Grant Gmail and Google Sheets permissions");
console.log("4. After authorization, you'll be redirected to localhost");
console.log("5. Copy the ENTIRE URL from your browser's address bar");
console.log("6. Paste it below");
console.log("");
console.log("   The URL will look like: http://localhost:3000/?code=4/0A...");
console.log("");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question(
  "Enter the full redirect URL (or just the code): ",
  async (input) => {
    try {
      // Extract code from URL or use direct code
      let code = input.trim();

      // If it's a full URL, extract the code parameter
      if (code.includes("localhost") || code.includes("code=")) {
        const urlParams = new URLSearchParams(code.split("?")[1]);
        code = urlParams.get("code") || code;
      }

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
      console.log(
        `firebase functions:config:set gmail.client_id="${CLIENT_ID}"`
      );
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
      console.log("📝 Scopes included in this token:");
      console.log("- Gmail (read, send, compose, modify)");
      console.log("- Google Sheets (readonly)");
      console.log("- Google Drive (readonly)");
      console.log("");
      console.log(
        "🎉 You can now use Gmail API and Google Sheets API in your app!"
      );
    } catch (error) {
      console.error("❌ Error generating tokens:", error);
    }

    rl.close();
  }
);

console.log("📌 Need help? Check the setup guides:");
console.log(
  "   Gmail API: https://developers.google.com/gmail/api/quickstart/nodejs"
);
console.log(
  "   Sheets API: https://developers.google.com/sheets/api/quickstart/nodejs"
);
console.log("");
