/**
 * Generate service account JSON file from environment variables
 * This helps work around private key encoding issues
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: "",
  private_key: process.env.FIREBASE_PRIVATE_KEY,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: "",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
    process.env.FIREBASE_CLIENT_EMAIL
  )}`,
};

// Create keys directory if it doesn't exist
const keysDir = path.join(__dirname, "..", "keys");
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const outputPath = path.join(keysDir, "prod-service-account.json");
fs.writeFileSync(outputPath, JSON.stringify(serviceAccount, null, 2));

console.log("✅ Service account JSON file created:", outputPath);
console.log(
  "⚠️  Remember: This file contains sensitive credentials. Do not commit it to git!"
);
