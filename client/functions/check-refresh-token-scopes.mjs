import { google } from "googleapis";
import dotenv from "dotenv";

// Load .env.local from repo root's client folder
dotenv.config({ path: "../.env.local" });

async function main() {
  const CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.PEOPLE_CLIENT_ID;
  const CLIENT_SECRET =
    process.env.GMAIL_CLIENT_SECRET || process.env.PEOPLE_CLIENT_SECRET;
  const refreshToken =
    process.argv[2] ||
    process.env.TEST_REFRESH_TOKEN ||
    process.env.GMAIL_REFRESH_TOKEN;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
      "Missing CLIENT_ID or CLIENT_SECRET. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in ../.env.local or pass via env."
    );
    process.exit(1);
  }

  if (!refreshToken) {
    console.error(
      "Missing refresh token. Pass it as the first arg or set TEST_REFRESH_TOKEN or GMAIL_REFRESH_TOKEN in ../.env.local"
    );
    console.error("Example: node check-refresh-token-scopes.mjs 1//abcd....");
    process.exit(1);
  }

  // Masked preview
  const masked = `${refreshToken.slice(0, 6)}...${refreshToken.slice(-6)}`;
  console.log(`Using refresh token: ${masked}`);

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    console.log("Requesting access token using the refresh token...");
    const res = await oauth2Client.getAccessToken();
    const accessToken = res?.token || res;

    if (!accessToken) {
      console.error(
        "No access token returned. The refresh token may be invalid or revoked."
      );
      process.exit(1);
    }

    console.log(
      "Access token acquired (masked):",
      `${accessToken.slice(0, 6)}...${accessToken.slice(-6)}`
    );

    // Fetch token info (scopes, audience, email if available)
    try {
      const info = await oauth2Client.getTokenInfo(accessToken);
      console.log("Token info:");
      // tokenInfo returns object with scope string (space-separated) and possibly email, audience
      console.log(JSON.stringify(info, null, 2));

      // Present scopes nicely (plain JS, no TS assertions)
      let scopes = [];
      if (info && Array.isArray(info.scopes)) {
        scopes = info.scopes;
      } else if (info && info.scope && typeof info.scope === "string") {
        scopes = info.scope.split(" ");
      }

      if (Array.isArray(scopes) && scopes.length) {
        console.log("\nScopes granted:");
        scopes.forEach((s) => console.log(` - ${s}`));
      } else if (info && info.scope) {
        console.log("\nScopes (raw):", info.scope);
      } else {
        console.log("No scopes present in token info.");
      }
    } catch (tiErr) {
      console.warn(
        "Failed to fetch token info via getTokenInfo:",
        tiErr?.message || tiErr
      );
      console.log("Attempting tokeninfo endpoint as fallback...");

      try {
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const tokeninfo = await oauth2.tokeninfo({ access_token: accessToken });
        console.log(
          "Tokeninfo response:",
          JSON.stringify(tokeninfo.data, null, 2)
        );
      } catch (fallbackErr) {
        console.error(
          "Fallback tokeninfo failed:",
          fallbackErr?.message || fallbackErr
        );
      }
    }
  } catch (err) {
    console.error(
      "Error while exchanging refresh token:",
      (err && err.message) || err
    );
    process.exit(1);
  }
}

main();
