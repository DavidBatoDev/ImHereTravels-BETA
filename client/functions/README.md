# Gmail API Setup Guide

This guide will walk you through setting up Gmail API OAuth2 authentication for the ImHereTravels communications system.

## Overview

We're using OAuth2 authentication to automate the Gmail account `bella@imheretravels.com` for:

- Fetching emails from Gmail
- Sending emails through Gmail API
- Managing drafts and email operations

## Prerequisites

- Access to Google Cloud Console
- Firebase project setup
- Node.js installed locally
- Access to `bella@imheretravels.com` Gmail account

## Step-by-Step Setup

### Step 1: Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (or create one if needed)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API"
5. Click on **Gmail API** and click **Enable**

### Step 2: Create OAuth2 Credentials

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose **External** user type
   - Fill in required fields:
     - App name: "ImHereTravels Gmail Integration"
     - User support email: `bella@imheretravels.com`
     - Developer contact: `bella@imheretravels.com`
   - Add scopes (we'll do this later)
   - Add test user: `bella@imheretravels.com`
4. For OAuth client ID:
   - Application type: **Desktop application**
   - Name: "ImHereTravels Gmail Desktop Client"
5. Click **Create**
6. **Download the JSON file** or copy the Client ID and Client Secret

### Step 3: Configure OAuth Scopes

1. Go back to **APIs & Services** > **OAuth consent screen**
2. Click **Edit App**
3. Go to **Scopes** section
4. Click **Add or Remove Scopes**
5. Add these Gmail scopes:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/gmail.compose
   https://www.googleapis.com/auth/gmail.modify
   ```
6. Save and continue

### Step 4: Generate Refresh Token

1. Navigate to the functions directory:

   ```bash
   cd client/functions
   ```

2. Edit the token generation script:

   ```bash
   # Open generate-gmail-token.mjs
   code generate-gmail-token.mjs
   ```

3. Replace the placeholder values with your actual credentials:

   ```javascript
   const CLIENT_ID = "your-actual-client-id.apps.googleusercontent.com";
   const CLIENT_SECRET = "your-actual-client-secret";
   ```

4. Run the token generation script:

   ```bash
   node generate-gmail-token.mjs
   ```

5. Follow the interactive prompts:

   - Copy the generated URL and open it in your browser
   - **Sign in as bella@imheretravels.com**
   - Grant the requested Gmail permissions
   - Copy the authorization code from the browser
   - Paste it into the terminal

6. **Save the refresh token** from the output - you'll need it for the next step

### Step 5: Create Environment Variables

Create a `.env` file in the `functions` directory:

```bash
# In functions/ directory
cp .env.example .env
```

Edit the `.env` file with your actual values:

```bash
# Gmail API OAuth2 Configuration
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=1//your-very-long-refresh-token
```

### Step 6: Set Production Environment Variables

For Firebase Functions deployment, set the environment variables:

```bash
# Using Firebase CLI
firebase functions:config:set gmail.client_id="your-client-id.apps.googleusercontent.com"
firebase functions:config:set gmail.client_secret="your-client-secret"
firebase functions:config:set gmail.refresh_token="1//your-very-long-refresh-token"
```

Or using the newer approach with `.env` files in production:

```bash
# Deploy with environment file
firebase deploy --only functions
```

## Testing the Setup

### Test Locally

1. Start Firebase Functions emulator:

   ```bash
   cd functions
   firebase emulators:start --only functions
   ```

2. Test the Gmail API functions:
   ```bash
   # In another terminal
   curl -X POST http://localhost:5001/your-project/asia-southeast1/fetchGmailEmails \
     -H "Content-Type: application/json" \
     -d '{"maxResults": 5}'
   ```

### Test in Frontend

1. Navigate to the communications center in your app
2. Go to the **Emails** tab
3. Click **Refresh** to fetch emails
4. Verify that emails from `bella@imheretravels.com` are displayed

## Available Gmail Functions

The setup provides access to comprehensive Gmail functionality:

### Email Management

- `fetchGmailEmails` - Fetch emails with filtering options
- `sendGmailEmail` - Send new emails
- `getGmailLabels` - Get Gmail labels/folders

### Draft Management

- `createGmailDraft` - Create email drafts
- `updateGmailDraft` - Update existing drafts
- `deleteGmailDraft` - Delete drafts
- `fetchGmailDrafts` - Get all drafts
- `sendGmailDraft` - Send a draft as email

### Thread & Conversation Management

- `fetchGmailThreads` - Get email conversations/threads
- `getGmailThread` - Get specific thread with all messages
- `replyToGmailEmail` - Reply to emails (maintains thread)
- `forwardGmailEmail` - Forward emails to other recipients

### Function Examples

```javascript
// Fetch recent emails
const emails = await fetchGmailEmails({
  maxResults: 20,
  query: "is:unread",
});

// Get a conversation thread
const thread = await getGmailThread({
  threadId: "thread_id_here",
});

// Reply to an email
const reply = await replyToGmailEmail({
  threadId: "thread_id_here",
  originalMessageId: "message_id_here",
  to: "recipient@example.com",
  subject: "Re: Original Subject",
  htmlContent: "<p>Your reply here</p>",
});

// Create a draft
const draft = await createGmailDraft({
  to: "client@example.com",
  subject: "Travel Itinerary",
  htmlContent: "<h1>Your Travel Plans</h1><p>Details...</p>",
});

// Schedule an email for later
const scheduledEmail = await scheduleEmail({
  to: "client@example.com",
  subject: "Reminder: Your Trip Tomorrow",
  htmlContent: "<p>Don't forget about your trip tomorrow!</p>",
  scheduledFor: "2025-10-15T09:00:00Z",
  emailType: "reminder",
});
```

## Scheduled Email Features

### Automatic Processing

- Emails are automatically processed every minute via Cloud Scheduler
- Failed emails are retried up to the specified maximum attempts
- Comprehensive status tracking (pending, sent, failed, cancelled)

### Management Functions

- `scheduleEmail` - Schedule emails for specific times
- `cancelScheduledEmail` - Cancel pending scheduled emails
- `rescheduleEmail` - Change the send time of pending emails
- `getScheduledEmails` - Retrieve scheduled emails with filtering
- `processScheduledEmails` - Cloud Scheduler function (runs automatically)
- `triggerScheduledEmailProcessing` - Manual processing trigger for testing

### Frontend Integration

The Communications Center includes a **Scheduled** tab for:

- Creating new scheduled emails
- Managing existing scheduled emails
- Quick scheduling shortcuts (1 day, 3 days, 1 week)
- Real-time status monitoring
- Rescheduling and cancellation

## Environment Variables Reference

| Variable              | Description                                         | Example                             |
| --------------------- | --------------------------------------------------- | ----------------------------------- |
| `GMAIL_CLIENT_ID`     | OAuth2 Client ID from Google Cloud Console          | `123456.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | OAuth2 Client Secret from Google Cloud Console      | `GOCSPX-abc123def456`               |
| `GMAIL_REFRESH_TOKEN` | Generated refresh token for bella@imheretravels.com | `1//04AbC...`                       |

## Troubleshooting

### Common Issues

**Error: "invalid_client"**

- Check that Client ID and Client Secret are correct
- Verify that OAuth2 credentials are for Desktop Application type

**Error: "invalid_grant"**

- Refresh token may have expired
- Re-run the token generation script to get a new refresh token

**Error: "insufficient_permissions"**

- Check that all required scopes are added to OAuth consent screen
- Ensure bella@imheretravels.com granted all permissions during authorization

**Error: "quota_exceeded"**

- Check Gmail API quotas in Google Cloud Console
- Consider implementing rate limiting in your functions

### Getting Help

1. Check the [Gmail API Documentation](https://developers.google.com/gmail/api)
2. Review Firebase Functions logs: `firebase functions:log`
3. Test individual functions in Firebase Console

## Security Best Practices

- ✅ Never commit `.env` files to version control
- ✅ Use Firebase Functions environment variables for production
- ✅ Regularly rotate OAuth2 credentials
- ✅ Monitor API usage in Google Cloud Console
- ✅ Keep refresh tokens secure and private

## File Structure

After setup, your functions directory should look like this:

```
functions/
├── src/
│   ├── gmail-api-service.ts      # Gmail API wrapper
│   ├── gmail-functions.ts        # Firebase functions
│   └── send-reservation-email.ts # Updated email sender
├── .env                          # Your environment variables
├── .env.example                  # Template file
├── generate-gmail-token.mjs      # Token generation script
├── GMAIL_API_SETUP.md           # Detailed setup guide
└── README.md                    # This file
```

## Next Steps

Once setup is complete:

1. Deploy functions: `firebase deploy --only functions`
2. Test email fetching in the frontend
3. Configure email templates as needed
4. Set up monitoring and alerts for Gmail API usage

---

**Need help?** Check the troubleshooting section above or contact the development team.
