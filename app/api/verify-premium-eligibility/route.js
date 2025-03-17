import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (if not already initialized)
let adminApp;
let adminDb;

const initializeFirebaseAdmin = () => {
  try {
    // If Firebase Admin is already initialized, return the existing instance
    if (adminDb) {
      console.log('Using already initialized Firebase Admin instance in verify-premium-eligibility');
      return adminDb;
    }
    
    const apps = getApps();
    
    // Debug environment variables 
    console.log('FIREBASE ENV CHECK:');
    console.log('PROJECT_ID exists:', !!process.env.FIREBASE_PROJECT_ID);
    console.log('CLIENT_EMAIL exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.log('PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
    
    if (apps.length === 0) {
      console.log('Initializing new Firebase Admin app in verify-premium-eligibility...');
      
      // Check for required Firebase credentials
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        console.error('Firebase Admin credentials missing in environment variables');
        console.error('Available env vars:', Object.keys(process.env).filter(k => k.startsWith('FIREBASE')));
        
        // Return null but still allow verification to continue for special cases
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
        const appName = `verify-premium-eligibility-app-${Date.now()}`; // Timestamp for uniqueness
        console.log(`Initializing Firebase Admin with app name: ${appName}`);
        
        adminApp = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
          })
        }, appName);
        
        adminDb = getFirestore(adminApp);
        console.log('Firebase Admin initialized successfully in verify-premium-eligibility');
        return adminDb;
      } catch (initError) {
        console.error('Error initializing Firebase Admin:', initError);
        console.error(initError.stack);
        return null;
      }
    } else {
      console.log('Using existing Firebase Admin app, count:', apps.length);
      try {
        // Try to get the app with our specific prefix or fall back to the first app
        const appPrefix = 'verify-premium-eligibility-app';
        const app = apps.find(a => a.name && a.name.startsWith(appPrefix)) || apps[0];
        adminDb = getFirestore(app);
        return adminDb;
      } catch (error) {
        console.error('Error getting existing Firebase Admin app:', error);
        // Try to initialize a new app with a different name
        try {
          const appName = `verify-premium-eligibility-app-${Date.now()}`; // Use timestamp to ensure uniqueness
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          
          adminApp = initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey
            }),
          }, appName);
          
          adminDb = getFirestore(adminApp);
          console.log('Created new Firebase Admin app with timestamp');
          return adminDb;
        } catch (fallbackError) {
          console.error('Fallback Firebase Admin initialization failed:', fallbackError);
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
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        eligible: false,
        error: 'Email is required'
      }, { status: 400 });
    }
    
    console.log(`Checking premium eligibility for: ${email}`);
    
    // Check Firebase Admin for premium status
    const isFirebaseEligible = await checkFirebaseEligibility(email);
    
    // Log the verification result
    console.log(`Eligibility result for ${email}: ${isFirebaseEligible}`);
    
    return NextResponse.json({
      eligible: isFirebaseEligible,
      source: isFirebaseEligible ? 'firestore' : 'none'
    });
  } catch (error) {
    console.error('Error verifying premium eligibility:', error);
    console.error(error.stack);
    return NextResponse.json({
      eligible: false,
      error: 'Error verifying premium eligibility: ' + error.message
    }, { status: 500 });
  }
}

async function checkFirebaseEligibility(email) {
  try {
    // Initialize Firebase Admin
    const db = initializeFirebaseAdmin();
    if (!db) {
      console.error('Firebase Admin DB initialization failed');
      return false;
    }
    
    try {
      // 1. First check if user exists in users collection with premium status
      console.log(`Checking users collection for email: ${email}`);
      const usersRef = db.collection('users');
      const userQuery = await usersRef.where('email', '==', email).get();
      
      if (!userQuery.empty) {
        // Found user, now check if they're premium
        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        
        if (userData.isPremium) {
          console.log(`Email ${email} is premium in users collection`);
          return true;
        }
      }
      
      // 2. Check if email exists in paid_emails collection
      console.log(`Checking paid_emails collection for: ${email}`);
      const safeEmailKey = email.replace(/[.#$\/\[\]]/g, '_');
      const paidEmailDoc = await db.collection('paid_emails').doc(safeEmailKey).get();
      
      if (paidEmailDoc.exists) {
        const data = paidEmailDoc.data();
        if (data && data.isPremium) {
          console.log(`Email ${email} found in paid_emails collection`);
          return true;
        }
      }
      
      console.log(`Email ${email} not found in Firestore premium lists`);
      return false;
    } catch (dbError) {
      console.error('Error checking Firestore:', dbError);
      console.error(dbError.stack);
      return false;
    }
  } catch (error) {
    console.error('Error in checkFirebaseEligibility:', error);
    console.error(error.stack);
    return false;
  }
} 