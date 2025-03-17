import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (if not already initialized)
let adminApp;
let adminDb;

const initializeFirebaseAdmin = () => {
  try {
    // If Firebase Admin is already initialized, return the existing instance
    if (adminDb) {
      console.log('Using already initialized Firebase Admin instance in verify-subscription');
      return adminDb;
    }
    
    const apps = getApps();
    console.log(`Firebase Admin apps count: ${apps.length}`);
    
    if (apps.length === 0) {
      console.log('Initializing new Firebase Admin app in verify-subscription...');
      
      // Ensure Firebase credentials are available
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        console.error('Firebase Admin credentials missing in environment variables');
        return null;
      }
      
      try {
        // Process the private key with special care for Node.js 18+
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Ensure proper newlines in private key (critical for Node.js 18+)
        if (privateKey) {
          // Log the first part of the key for debugging (without exposing sensitive data)
          console.log(`Private key starts with: ${privateKey.substring(0, 20)}...`);
          
          // Replace encoded newlines with actual newlines
          privateKey = privateKey.replace(/\\n/g, '\n');
          
          // Ensure key has proper format with actual newlines
          if (!privateKey.includes('\n')) {
            console.warn('Private key does not contain actual newlines after processing');
          }
        }
        
        // Initialize with a unique app name to prevent collisions
        const appName = `verify-subscription-app-${Date.now()}`; // Timestamp for uniqueness
        console.log(`Initializing Firebase Admin with app name: ${appName}`);
        
        adminApp = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
          })
        }, appName);
        
        adminDb = getFirestore(adminApp);
        console.log('Firebase Admin initialized successfully in verify-subscription');
        return adminDb;
      } catch (initError) {
        console.error('Error initializing Firebase Admin:', initError);
        console.error(initError.stack);
        return null;
      }
    } else {
      console.log('Using existing Firebase Admin app in verify-subscription, apps count:', apps.length);
      try {
        // Try to get the app with our specific prefix or fall back to the first app
        const appPrefix = 'verify-subscription-app';
        const app = apps.find(a => a.name && a.name.startsWith(appPrefix)) || apps[0];
        adminDb = getFirestore(app);
        return adminDb;
      } catch (error) {
        console.error('Error getting existing Firebase Admin app:', error);
        // Try to initialize a new app with a different name
        try {
          const appName = `verify-subscription-app-${Date.now()}`; // Use timestamp for uniqueness
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          
          adminApp = initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey
            })
          }, appName);
          
          adminDb = getFirestore(adminApp);
          console.log('Created new Firebase Admin app with timestamp');
          return adminDb;
        } catch (fallbackError) {
          console.error('Fallback Firebase Admin initialization failed:', fallbackError);
          console.error(fallbackError.stack);
          return null;
        }
      }
    }
  } catch (error) {
    console.error('Critical error initializing Firebase Admin:', error);
    console.error(error.stack);
    return null;
  }
};

export async function POST(request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required',
      }, { status: 400 });
    }
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Get the customer email
    const email = session.customer_email || session.metadata?.userEmail;
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'No email associated with this session',
      }, { status: 400 });
    }
    
    console.log(`Verifying subscription for email: ${email}`);
    
    // Check for subscription ID in session
    let subscriptionStatus = 'unknown';
    if (session.subscription) {
      try {
        // Retrieve the subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        subscriptionStatus = subscription.status;
        
        console.log(`Subscription status for ${email}: ${subscriptionStatus}`);
        
        // If subscription is active or trialing, consider it successful
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Mark the user as premium in our systems
          await updateUserPremium(email);
          
          return NextResponse.json({
            success: true,
            email: email,
            status: subscriptionStatus
          });
        }
      } catch (subError) {
        console.error('Error retrieving subscription:', subError);
      }
    }
    
    // If no subscription or it's not active/trialing, check payment status
    if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
      // Mark the user as premium in our systems
      await updateUserPremium(email);
      
      return NextResponse.json({
        success: true,
        email: email,
        status: session.payment_status
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Payment not completed. Status: ${session.payment_status}, Subscription: ${subscriptionStatus}`,
      });
    }
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Error verifying subscription' },
      { status: 500 }
    );
  }
}

async function updateUserPremium(email) {
  try {
    console.log(`Updating premium status for ${email}`);
    
    // Update in Firebase Firestore only
    await updateFirebasePremium(email);
    
    return true;
  } catch (error) {
    console.error('Error in updateUserPremium:', error);
    return false;
  }
}

async function updateFirebasePremium(email) {
  try {
    // Initialize Firebase Admin
    const db = initializeFirebaseAdmin();
    if (!db) {
      console.error('Failed to initialize Firebase Admin in updateFirebasePremium');
      return false;
    }
    
    const timestamp = new Date().toISOString();
    const normalizedEmail = email.toLowerCase();
    
    // Wrap each Firestore operation in its own try-catch block
    // so a failure in one doesn't prevent others from executing
    
    // 1. First check if user exists in users collection
    let userUpdated = false;
    try {
      console.log(`Checking for existing user with email: ${normalizedEmail}`);
      const usersRef = db.collection('users');
      const userQuery = await usersRef.where('email', '==', normalizedEmail).get();
      
      if (!userQuery.empty) {
        // User found, update their premium status
        const userDoc = userQuery.docs[0];
        await usersRef.doc(userDoc.id).update({
          isPremium: true,
          premiumSince: timestamp,
          updatedAt: timestamp
        });
        
        userUpdated = true;
        console.log(`Updated existing user ${normalizedEmail} to premium in Firestore`);
      } else {
        console.log(`No existing user found for email: ${normalizedEmail}`);
      }
    } catch (userError) {
      console.error(`Error updating user record for ${normalizedEmail}:`, userError);
      // Continue to paid_emails update even if this fails
    }
    
    // 2. Always create/update entry in paid_emails collection regardless of user existence
    // This ensures the user can register later with premium status
    let paidEmailUpdated = false;
    try {
      console.log(`Updating paid_emails record for: ${normalizedEmail}`);
      const safeEmailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
      
      // Check if the document already exists
      const paidEmailRef = db.collection('paid_emails').doc(safeEmailKey);
      const paidEmailDoc = await paidEmailRef.get();
      
      if (paidEmailDoc.exists) {
        // Update existing document
        await paidEmailRef.update({
          email: normalizedEmail,
          isPremium: true,
          premiumSince: paidEmailDoc.data().premiumSince || timestamp,
          updatedAt: timestamp
        });
        paidEmailUpdated = true;
        console.log(`Updated existing paid_emails entry for ${normalizedEmail}`);
      } else {
        // Create new document
        await paidEmailRef.set({
          email: normalizedEmail,
          isPremium: true,
          premiumSince: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
          registered: false
        });
        paidEmailUpdated = true;
        console.log(`Created new paid_emails entry for ${normalizedEmail}`);
      }
    } catch (paidEmailError) {
      console.error(`Error updating paid_emails for ${normalizedEmail}:`, paidEmailError);
      // This is our critical update, so if it fails, return false
      return false;
    }
    
    return userUpdated || paidEmailUpdated;
  } catch (error) {
    console.error('Error in updateFirebasePremium:', error);
    console.error(error.stack);
    return false;
  }
} 