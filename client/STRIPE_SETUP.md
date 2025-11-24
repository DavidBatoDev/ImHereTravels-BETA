# Stripe Payment Integration - Environment Variables

## Required Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Secret Key (server-side only - DO NOT expose to client)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Publishable Key (client-side - safe to expose)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret (for webhook signature verification)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## How to Get These Keys

### 1. Stripe Secret & Publishable Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)
4. Click **Reveal test key** to copy your **Secret key** (starts with `sk_test_`)

### 2. Webhook Secret

1. Go to **Developers** → **Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://yourdomain.com/api/stripe-payments/webhook`
   - For local development with Stripe CLI: `http://localhost:3000/api/stripe-payments/webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. After creating the endpoint, click on it and reveal the **Signing secret** (starts with `whsec_`)

## Local Development with Stripe CLI

For testing webhooks locally, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# Install Stripe CLI
# Windows (with Scoop): scoop install stripe
# macOS (with Homebrew): brew install stripe/stripe-cli/stripe

# Login to your Stripe account
stripe login

# Forward webhook events to your local server
stripe listen --forward-to localhost:3000/api/stripe-payments/webhook
```

The CLI will display a webhook signing secret - use this as your `STRIPE_WEBHOOK_SECRET` for local development.

## Testing the Integration

### Test Card Numbers

Use these test cards in your payment form:

- **Success**: `4242 4242 4242 4242`
- **Requires authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Use any future expiry date, any 3-digit CVC, and any postal code.

## Security Notes

⚠️ **Important**:

- Never commit `.env.local` to version control
- Keep your `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` secure
- Only the `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` should be exposed to the client
- Use test keys during development (they start with `pk_test_` and `sk_test_`)
- Switch to live keys only when you're ready for production (they start with `pk_live_` and `sk_live_`)
