/**
 * Application configuration settings
 * This centralized config makes it easier to update settings and constants
 */

// Test premium emails - users with these emails automatically get premium access
export const TEST_PREMIUM_EMAILS = [
  'angelyzeshop@gmail.com',
  'test@example.com',
  'premium@example.com'
];

// Check if an email should get premium status for testing
export function isTestPremiumEmail(email) {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase();
  
  // Check exact matches first
  if (TEST_PREMIUM_EMAILS.includes(normalizedEmail)) {
    return true;
  }
  
  // Check substring matches
  if (normalizedEmail.includes('test') || normalizedEmail.includes('premium')) {
    return true;
  }
  
  return false;
}

// Firebase configuration - loaded from environment variables
export const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Firebase Admin configuration
export const FIREBASE_ADMIN_CONFIG = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
};

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  successUrl: process.env.NEXT_PUBLIC_STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
  cancelUrl: process.env.NEXT_PUBLIC_STRIPE_CANCEL_URL || 'http://localhost:3000/subscribe'
};

// API routes and endpoints
export const API_ROUTES = {
  createCheckoutSession: '/api/create-checkout-session',
  login: '/api/login',
  register: '/api/register',
  logout: '/api/logout',
  verifySubscription: '/api/verify-subscription',
  checkPremiumStatus: '/api/check-premium-status'
};

// Premium features configuration
export const PREMIUM_CONFIG = {
  monthlyPrice: process.env.NEXT_PUBLIC_PREMIUM_PRICE || '5.00',
  currency: process.env.NEXT_PUBLIC_PREMIUM_CURRENCY || 'USD',
  trialDays: process.env.NEXT_PUBLIC_PREMIUM_TRIAL_DAYS || 7,
  maxQuestionsPerDay: {
    free: process.env.NEXT_PUBLIC_FREE_QUESTIONS_PER_DAY || 5,
    premium: process.env.NEXT_PUBLIC_PREMIUM_QUESTIONS_PER_DAY || 50
  }
}; 