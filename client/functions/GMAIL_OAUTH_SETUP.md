# Gmail OAuth2 Setup Instructions

## 🎯 **One-Time Setup for Automated Gmail Access**

This setup allows your function to send emails automatically without asking for permission every time.

### **Step 1: Create OAuth2 Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Make sure you're in the correct project (`imheretravels`)
3. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
4. Choose **"Desktop Application"** as the application type
5. Give it a name like "Gmail API Access"
6. Click **"Create"**
7. Copy the **Client ID** and **Client Secret**

### **Step 2: Run the Setup Script**

```bash
node setup-gmail-oauth.js
```

Follow the prompts:

- Enter your OAuth2 Client ID
- Enter your OAuth2 Client Secret
- The script will generate an authorization URL
- Open the URL in your browser
- Sign in with the Gmail account you want to use (`batobatodavid20@gmail.com`)
- Grant all permissions
- Copy the authorization code from the browser
- Paste it into the script

### **Step 3: Add Tokens to .env**

The script will output the environment variables you need to add to your `.env` file:

```env
GMAIL_OAUTH2_CLIENT_ID=your_client_id_here
GMAIL_OAUTH2_CLIENT_SECRET=your_client_secret_here
GMAIL_OAUTH2_REFRESH_TOKEN=your_refresh_token_here
```

### **Step 4: Deploy and Test**

```bash
npm run build
firebase deploy --only functions:generateReservationEmail
```

## ✅ **What This Achieves**

- ✅ **One-time authorization** - You only need to authorize once
- ✅ **Automatic access** - The function can send emails without user interaction
- ✅ **No repeated prompts** - Uses refresh token for automatic authentication
- ✅ **Secure** - Tokens are stored securely in environment variables

## 🔧 **How It Works**

1. **Initial Setup**: You authorize the app once to get a refresh token
2. **Automated Access**: The function uses the refresh token to automatically get new access tokens
3. **Gmail API**: The function can now create drafts in Gmail without user interaction

## 🚨 **Important Notes**

- The refresh token doesn't expire unless you revoke access
- Keep your `.env` file secure and never commit it to version control
- If you need to revoke access, go to [Google Account Settings](https://myaccount.google.com/permissions)

## 🧪 **Testing**

After setup, test with:

```bash
node test-simple.js
```

You should see successful draft creation in the Gmail account you authorized!
