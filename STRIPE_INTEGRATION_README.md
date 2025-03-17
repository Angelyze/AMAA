# Stripe Integration and Firebase Admin SDK

## Overview

This document explains the integration between Stripe and Firebase for handling premium subscriptions in the application.

## Premium User Flow

1. **Guest User Starts Premium Purchase**
   - User enters their email on the subscription page
   - Redirects to Stripe checkout

2. **Stripe Payment Processing**
   - User completes payment on Stripe
   - Stripe sends webhook to our backend (`checkout.session.completed`)
   - Our backend records the premium status in the `paid_emails` collection
   - If Firebase operations fail, a fallback mechanism is used

3. **Account Creation After Payment**
   - User is redirected back to our site with a success message
   - They're prompted to create a password for their new account
   - Firebase Authentication creates the account
   - Our app checks both the `paid_emails` collection and fallback storage for premium status

4. **Email Verification (Best Practice)**
   - User receives email verification from Firebase
   - User verifies their email address

## Firebase Admin SDK Issues with Node.js 18.x

The Firebase Admin SDK has compatibility issues with newer versions of Node.js (18+). We've implemented several solutions:

1. **Improved Private Key Handling**
   - Proper handling of newline characters in private keys
   - Added debug logs for key formatting
   - Error handling for malformed keys

2. **App Initialization with Unique Names**
   - Using timestamp-based app names to prevent collisions
   - Fallback mechanisms when initialization fails
   - Consistent approach across all serverless functions

3. **Proper Error Handling**
   - Comprehensive try-catch blocks
   - Detailed error logs with stack traces
   - Graceful degradation when services are unavailable

4. **Fallback Mechanisms**
   - Created fallback API endpoints for critical operations
   - Alternative premium status storage that doesn't use the Firebase Admin SDK
   - Double-checking premium status through multiple sources

5. **OpenSSL Compatibility Fix**
   - Added `--openssl-legacy-provider` flag in `NODE_OPTIONS` environment variable
   - Applied webpack optimizations to improve compatibility

## Node.js Version Requirements

The project now requires:
- Node.js version: `18.x`

When deploying to Vercel, the platform now requires at least Node.js 18.x as version 16.x is discontinued. 
We've adapted our Firebase Admin SDK initialization to be compatible with Node.js 18.x by:

1. Using the `--openssl-legacy-provider` flag
2. Implementing fallback APIs that don't rely on problematic Firebase Admin SDK features
3. Handling failure cases gracefully and providing alternative mechanisms

## Environment Variables

The following environment variables must be properly configured:

```
# Firebase Admin (server-side)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here with proper \n characters\n-----END PRIVATE KEY-----\n"

# Stripe
STRIPE_SECRET_KEY="sk_xxx"
STRIPE_PUBLISHABLE_KEY="pk_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
STRIPE_PRICE_ID="price_xxx"

# Application URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL="https://your-app-url.com"
```

## Troubleshooting

If you encounter authentication issues with the Firebase Admin SDK:

1. Verify your private key contains proper newlines
2. Check server logs for Firestore operation errors
3. Use the fallback API endpoints directly if necessary
4. Check that the `NODE_OPTIONS` environment variable is set correctly

For Stripe webhook issues:

1. Verify your webhook secret is correct
2. Check the webhook endpoint is properly registered in Stripe
3. Examine server logs during webhook receipt
4. Test with Stripe CLI locally using `stripe listen`

## Fallback Mechanisms

If Firebase Admin SDK operations fail, the application uses these fallback mechanisms:

1. **Premium Status Recording**
   - `/api/fallback-premium-status` endpoint stores premium status when Firestore fails
   - Stripe webhooks automatically attempt this fallback when Firebase operations fail

2. **Premium Status Verification**
   - `/api/check-premium-status` endpoint checks premium status from multiple sources
   - Client-side can use this endpoint to verify premium status reliably

These fallbacks ensure that even if Firebase Admin SDK has issues with Node.js 18.x, 
users can still purchase premium subscriptions and access premium features. 