# Firebase Integration Guide

This document provides information about how Firebase is integrated in this application, with a focus on authentication, premium user management, and best practices.

## Table of Contents

1. [Firebase Setup](#firebase-setup)
2. [Authentication Flow](#authentication-flow)
3. [Premium User Management](#premium-user-management)
4. [Stripe Integration](#stripe-integration)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Firebase Setup

This application uses Firebase for authentication and Firestore for data storage. The Firebase Admin SDK is used in server-side code, while the client-side Firebase SDK is used in the browser.

### Environment Variables

The following environment variables are required for proper functionality:

```
# Public Firebase config (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin (server-side)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n'

# Stripe configuration
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### Firebase Admin Initialization

The application now uses a shared utility for Firebase Admin initialization to prevent duplicate initializations and ensure consistent error handling:

```javascript
// app/utils/firebaseAdmin.js
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';

// Use with a unique identifier for better debugging
const { auth, db } = initializeFirebaseAdmin('my-component-name');
```

## Authentication Flow

### Registration

1. User submits email and password via the registration form
2. The app checks if the email is already registered in Firebase Auth
3. The app checks if the email has premium status (via Stripe or test emails)
4. A new user account is created in Firebase Auth
5. Premium status is set via custom claims if applicable
6. A user record is created in Firestore for backward compatibility
7. A session cookie is set for the browser

### Login

1. User submits email and password via the login form
2. The app verifies the credentials with Firebase Auth
3. Premium status is checked from Firebase Auth custom claims
4. If the user does not have premium status in custom claims but has it in Firestore, the claims are updated
5. A session cookie is set for the browser

### Authentication Middleware

The app includes middleware for verifying authentication in API routes:

```javascript
// Usage in API routes
import { withAuth } from '../../middleware/authMiddleware';

export async function GET(request) {
  // Check authentication
  const authResponse = await withAuth(request);
  if (authResponse) return authResponse; // Return early if unauthorized
  
  // User info is available in request.user
  const userId = request.user.uid;
  
  // Continue with the authenticated request...
}
```

## Premium User Management

### Premium Status Flow

1. User signs up for premium via Stripe checkout
2. Stripe webhook notifies the app when the payment is successful
3. The app sets the `isPremium` custom claim on the user's Firebase Auth account
4. This claim is included in the user's ID token and can be verified both client and server-side
5. For users who paid before registering, their premium status is stored in Firestore and applied when they register

### Checking Premium Status

Client-side:
```javascript
import { checkPremiumStatus } from '../utils/checkPremiumStatus';

// Inside a component
const isPremium = await checkPremiumStatus(user);
```

Server-side:
```javascript
import { checkUserPremiumStatus } from '../utils/firebaseAdmin';

const isPremium = await checkUserPremiumStatus(userId);
```

## Stripe Integration

Stripe is integrated for premium subscription payments. The webhook handler (`app/api/webhooks/stripe/route.js`) processes Stripe events and updates user premium status.

### Important Stripe Webhook Events

- `checkout.session.completed`: User has completed a checkout session
- `customer.subscription.created`: A new subscription has been created
- `customer.subscription.updated`: An existing subscription has been updated (renewal, cancellation, etc.)

### Premium Email Collection

When a user pays for premium before registering, their email is stored in a `paid_emails` collection in Firestore. When they register later, this premium status is applied to their account.

## Best Practices

1. **Firebase Admin SDK Initialization**
   - Use the shared utility `initializeFirebaseAdmin` to prevent initialization issues
   - Pass a unique identifier for better debugging

2. **Custom Claims for Premium Status**
   - Use Firebase Auth custom claims as the source of truth for premium status
   - Custom claims are automatically included in ID tokens for verification
   - Firestore is used as a backup and for backward compatibility

3. **Error Handling**
   - All Firebase operations are wrapped in try-catch blocks
   - Errors are logged but don't break the user experience

4. **Configuration**
   - Environment variables are centralized in `app/utils/config.js`
   - Test premium emails and other constants are defined in one place

## Troubleshooting

### Common Issues

1. **Firebase Admin initialization failures**
   - Check that the FIREBASE_PRIVATE_KEY has proper newline characters (\n)
   - Ensure all environment variables are set
   - Check for correct permissions on the service account

2. **Premium status not updating**
   - Verify Stripe webhook events are being received
   - Check logs for errors in the webhook handler
   - Manually check the user's custom claims in Firebase Auth

3. **Multiple Firebase instances**
   - Use the shared utility for initialization
   - Check for legacy code still initializing Firebase directly

### Debugging

The application includes extensive logging for debugging:

- Firebase initialization status
- Authentication events
- Premium status changes
- Stripe webhook events

Check server logs to diagnose issues with Firebase integration. 