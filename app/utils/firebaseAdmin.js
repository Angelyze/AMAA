import * as admin from 'firebase-admin';

// Track initialized apps to prevent duplicate initializations
const FIREBASE_ADMIN_APPS = {};

/**
 * Initialize Firebase Admin SDK with error handling
 * 
 * @param {string} uniqueId - A unique identifier for this initialization
 * @returns {Object} - Object containing initialized auth and db instances
 */
export function initializeFirebaseAdmin(uniqueId = 'default') {
  try {
    console.log(`FIREBASE ENV CHECK:
PROJECT_ID exists: ${!!process.env.FIREBASE_PROJECT_ID}
CLIENT_EMAIL exists: ${!!process.env.FIREBASE_CLIENT_EMAIL}
PRIVATE_KEY exists: ${!!process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')}`);

    // Check if we already have an app with this ID
    const appCount = Object.keys(FIREBASE_ADMIN_APPS).length;
    
    if (FIREBASE_ADMIN_APPS[uniqueId]) {
      console.log(`Using existing Firebase Admin app, count: ${appCount}`);
      
      // Return the previously initialized instances
      return {
        app: FIREBASE_ADMIN_APPS[uniqueId],
        auth: admin.auth(FIREBASE_ADMIN_APPS[uniqueId]),
        db: admin.firestore(FIREBASE_ADMIN_APPS[uniqueId])
      };
    }

    // Log the initialization attempt
    console.log(`Firebase Admin apps count: ${appCount}`);
    console.log(`Initializing new Firebase Admin app (${uniqueId})...`);

    // Make sure we have the required env vars
    if (!process.env.FIREBASE_PROJECT_ID || 
        !process.env.FIREBASE_CLIENT_EMAIL || 
        !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('Firebase Admin SDK initialization failed: Missing environment variables');
      return {};
    }

    // Prepare credentials object with careful handling of the private key
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Fix for Vercel deployment - replace escaped newlines
    if (privateKey && !privateKey.includes('\n') && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    const credentials = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    };
    
    // Initialize the app with a unique name to avoid conflicts
    const appName = `admin-${uniqueId}-${Date.now()}`;
    
    // Create the app with explicit credential object instead of using JSON
    // This avoids JSON parsing issues in serverless environments
    const app = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: process.env.FIREBASE_PROJECT_ID,
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    }, appName);
    
    // Store the app for future use
    FIREBASE_ADMIN_APPS[uniqueId] = app;
    
    // Initialize and return auth and db
    const auth = admin.auth(app);
    const db = admin.firestore(app);
    
    // Configure Firestore to handle undefined values
    db.settings({
      ignoreUndefinedProperties: true
    });
    
    console.log('Firebase Admin initialized successfully');
    
    return { app, auth, db };
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return {};
  }
}

/**
 * Verify a Firebase ID token
 * 
 * @param {string} idToken - The ID token to verify
 * @returns {Object|null} The decoded token or null if invalid
 */
export async function verifyIdToken(idToken) {
  try {
    if (!idToken) {
      console.error('No token provided to verifyIdToken');
      return null;
    }
    
    const { auth } = initializeFirebaseAdmin('token-verify');
    
    if (!auth) {
      console.error('Firebase Auth not initialized in verifyIdToken');
      return null;
    }
    
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}

/**
 * Check if a user has premium status
 * 
 * @param {string} uid - Firebase Auth user ID
 * @returns {Promise<boolean>} True if user has premium access
 */
export async function checkUserPremiumStatus(uid) {
  try {
    const { auth } = initializeFirebaseAdmin('premium-check');
    
    if (!auth) {
      console.error('Firebase Auth not initialized in checkUserPremiumStatus');
      return false;
    }
    
    // Get the user's custom claims
    const user = await auth.getUser(uid);
    
    // Return true if the user has premium claim set to true
    return user.customClaims?.isPremium === true;
  } catch (error) {
    console.error(`Error checking premium status for user ${uid}:`, error);
    return false;
  }
}

/**
 * Set a user's premium status
 * 
 * @param {string} uid - Firebase Auth user ID
 * @param {boolean} isPremium - Whether the user should have premium status
 * @returns {Promise<boolean>} Success status
 */
export async function setUserPremiumStatus(uid, isPremium) {
  try {
    const { auth, db } = initializeFirebaseAdmin('premium-set');
    
    if (!auth || !db) {
      console.error('Firebase not initialized in setUserPremiumStatus');
      return false;
    }
    
    // Update the user's custom claims
    const timestamp = new Date().toISOString();
    await auth.setCustomUserClaims(uid, { 
      isPremium, 
      updatedAt: timestamp,
      ...(isPremium ? { premiumSince: timestamp } : {})
    });
    
    // Also update the user document in Firestore
    try {
      await db.collection('users').doc(uid).update({
        isPremium,
        updatedAt: timestamp,
        ...(isPremium ? { premiumSince: timestamp } : {})
      });
    } catch (dbError) {
      console.error(`Error updating Firestore for user ${uid}:`, dbError);
      // Continue anyway since the Auth custom claims are set
    }
    
    return true;
  } catch (error) {
    console.error(`Error setting premium status for user ${uid}:`, error);
    return false;
  }
} 