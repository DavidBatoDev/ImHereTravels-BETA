const { google } = require("googleapis");
const fs = require("fs");
const readline = require("readline");

// OAuth2 setup for Gmail API - ONE TIME ONLY
async function setupGmailOAuth() {
  console.log("🔧 Setting up Gmail OAuth2 for automated access...\n");

  // Step 1: You need to create OAuth2 credentials in Google Cloud Console
  console.log("📋 STEP 1: Create OAuth2 Credentials");
  console.log("1. Go to: https://console.cloud.google.com/apis/credentials");
  console.log("2. Click 'Create Credentials' > 'OAuth 2.0 Client ID'");
  console.log("3. Choose 'Desktop Application'");
  console.log("4. Copy the Client ID and Client Secret\n");

  // Get credentials from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const getInput = (question) => {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  const clientId = await getInput("Enter your OAuth2 Client ID: ");
  const clientSecret = await getInput("Enter your OAuth2 Client Secret: ");

  if (!clientId || !clientSecret) {
    console.log("❌ Client ID and Client Secret are required!");
    rl.close();
    return;
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "urn:ietf:wg:oauth:2.0:oob" // For desktop apps
  );

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.compose"],
    prompt: "consent", // Force consent to get refresh token
  });

  console.log("\n📋 STEP 2: Authorize the Application");
  console.log("1. Open this URL in your browser:");
  console.log(`   ${authUrl}`);
  console.log("\n2. Sign in with the Gmail account you want to use");
  console.log("3. Grant permissions to the application");
  console.log("4. Copy the authorization code from the browser\n");

  const authCode = await getInput("Enter the authorization code: ");

  if (!authCode) {
    console.log("❌ Authorization code is required!");
    rl.close();
    return;
  }

  try {
    // Exchange authorization code for tokens
    console.log("\n🔄 Exchanging authorization code for tokens...");
    const { tokens } = await oauth2Client.getToken(authCode);
    oauth2Client.setCredentials(tokens);

    console.log("✅ Successfully obtained tokens!");
    console.log("📋 STEP 3: Save tokens to .env file");
    console.log("\nAdd these lines to your .env file:");
    console.log("```");
    console.log(`GMAIL_OAUTH2_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_OAUTH2_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_OAUTH2_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("```");

    // Test the connection
    console.log("\n🧪 Testing Gmail API connection...");
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    try {
      const profile = await gmail.users.getProfile({ userId: "me" });
      console.log(
        `✅ Successfully connected to Gmail account: ${profile.data.emailAddress}`
      );
      console.log(
        "\n🎉 Setup complete! Your function can now send emails automatically."
      );
    } catch (error) {
      console.log(
        "⚠️  Warning: Could not test Gmail connection:",
        error.message
      );
      console.log(
        "The tokens are saved, but there might be an issue with the setup."
      );
    }

    rl.close();
  } catch (error) {
    console.error("❌ Error exchanging authorization code:", error.message);
    rl.close();
  }
}

setupGmailOAuth().catch(console.error);
