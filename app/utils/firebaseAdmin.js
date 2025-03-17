import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Cached instances
let adminDb;
let adminAuth;

/**
 * Initialize Firebase Admin SDK with proper error handling for Node.js 18+
 * @param {string} uniqueId - Optional unique identifier for the app
 * @returns {Object} - Object containing auth and db instances
 */
export function initializeFirebaseAdmin(uniqueId = '') {
  try {
    // If already initialized, return existing instances
    if (adminAuth && adminDb) {
      return { auth: adminAuth, db: adminDb };
    }
    
    const apps = getApps();
    console.log(`Firebase Admin apps count: ${apps.length}`);
    
    if (apps.length === 0) {
      console.log(`Initializing new Firebase Admin app${uniqueId ? ` (${uniqueId})` : ''}...`);
      
      // Ensure Firebase credentials are available
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        console.error('Firebase Admin credentials missing in environment variables');
        return { auth: null, db: null };
      }
      
      try {
        // Process the private key with special care for Node.js 18+
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        
        // Ensure proper newlines in private key
        if (privateKey) {
          // Replace encoded newlines with actual newlines
          privateKey = privateKey.replace(/\\n/g, '\n');
          
          // Warning if no actual newlines in private key
          if (!privateKey.includes('\n')) {
            console.warn('Private key does not contain actual newlines after processing');
          }
        }
        
        // Generate a unique app name to prevent collisions
        const appName = uniqueId ? 
          `firebase-admin-${uniqueId}-${Date.now()}` : 
          `firebase-admin-${Date.now()}`;
        
        const app = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
          })
        }, appName);
        
        adminAuth = getAuth(app);
        adminDb = getFirestore(app);
        
        console.log('Firebase Admin initialized successfully');
        return { auth: adminAuth, db: adminDb };
      } catch (initError) {
        console.error('Error initializing Firebase Admin:', initError);
        console.error(initError.stack);
        return { auth: null, db: null };
      }
    } else {
      console.log('Using existing Firebase Admin app');
      try {
        // Try to get an app with our specific identifier or fall back to the first app
        const app = apps.find(a => a.name && uniqueId && a.name.includes(uniqueId)) || apps[0];
        
        adminAuth = getAuth(app);
        adminDb = getFirestore(app);
        
        return { auth: adminAuth, db: adminDb };
      } catch (error) {
        console.error('Error getting existing Firebase Admin app:', error);
        
        // Try to initialize a new app with a different name
        try {
          const appName = `firebase-admin-fallback-${Date.now()}`;
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          
          const app = initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey
            })
          }, appName);
          
          adminAuth = getAuth(app);
          adminDb = getFirestore(app);
          
          console.log('Created new Firebase Admin app as fallback');
          return { auth: adminAuth, db: adminDb };
        } catch (fallbackError) {
          console.error('Fallback Firebase Admin initialization failed:', fallbackError);
          console.error(fallbackError.stack);
          return { auth: null, db: null };
        }
      }
    }
  } catch (error) {
    console.error('Critical error initializing Firebase Admin:', error);
    console.error(error.stack);
    return { auth: null, db: null };
  }
}

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token to verify
 * @returns {Promise<Object|null>} - Decoded token or null if invalid
 */
export async function verifyIdToken(idToken) {
  try {
    const { auth } = initializeFirebaseAdmin('token-verifier');
    
    if (!auth) {
      console.error('Firebase Auth not initialized');
      return null;
    }
    
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
}

/**
 * Check if a user has premium status via Firebase Auth custom claims
 * @param {string} uid - User ID to check
 * @returns {Promise<boolean>} - Whether the user has premium status
 */
export async function checkUserPremiumStatus(uid) {
  try {
    const { auth } = initializeFirebaseAdmin('premium-checker');
    
    if (!auth || !uid) {
      return false;
    }
    
    const userRecord = await auth.getUser(uid);
    const customClaims = userRecord.customClaims || {};
    
    return customClaims.isPremium === true;
  } catch (error) {
    console.error(`Error checking premium status for user ${uid}:`, error);
    return false;
  }
}

/**
 * Set premium status for a user via Firebase Auth custom claims
 * @param {string} uid - User ID to update
 * @param {boolean} isPremium - Premium status to set
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export async function setUserPremiumStatus(uid, isPremium = true) {
  try {
    const { auth } = initializeFirebaseAdmin('premium-setter');
    
    if (!auth || !uid) {
      return false;
    }
    
    await auth.setCustomUserClaims(uid, { 
      isPremium,
      updatedAt: new Date().toISOString(),
      ...(isPremium ? { premiumSince: new Date().toISOString() } : {})
    });
    
    return true;
  } catch (error) {
    console.error(`Error setting premium status for user ${uid}:`, error);
    return false;
  }
} 