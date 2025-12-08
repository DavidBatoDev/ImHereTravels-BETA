# Quick Setup Instructions

## Required: Add Environment Variables

The payment form requires Stripe API keys. Create a `.env.local` file in the `client` folder:

```bash
# In client/.env.local

# Stripe Configuration (REQUIRED for payment to work)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Your existing Firebase variables...
NEXT_PUBLIC_FIREBASE_API_KEY=...
```

## Get Your Stripe Keys:

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. For webhook secret, see STRIPE_SETUP.md

## Testing Without Stripe (Temporary):

If you want to test the form without setting up Stripe yet, you can skip Step 2 by:

1. The payment form will show an error message
2. You can still navigate and test Steps 1 and 3

## More Details:

See `STRIPE_SETUP.md` for complete setup instructions including:

- Webhook configuration
- Local development with Stripe CLI
- Test card numbers
- Security best practices
