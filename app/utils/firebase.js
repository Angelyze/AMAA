// Firebase configuration
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Get Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Log config for debugging (without API keys)
console.log('Firebase config:', { 
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId ? '(set)' : '(not set)'
});

// Initialize Firebase
let firebaseApp;
let authInstance;
let dbInstance;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

export function getFirebaseApp() {
  if (!firebaseApp) {
    if (!getApps().length) {
      console.log('Initializing Firebase app');
      try {
        // Check if all required config values are present
        const requiredKeys = ['apiKey', 'authDomain', 'projectId'];
        const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
        
        if (missingKeys.length > 0) {
          throw new Error(`Missing required Firebase config: ${missingKeys.join(', ')}`);
        }
        
        firebaseApp = initializeApp(firebaseConfig);
        console.log('Firebase app initialized successfully');
      } catch (error) {
        console.error('Error initializing Firebase app:', error);
        throw error;
      }
    } else {
      console.log('Using existing Firebase app');
      firebaseApp = getApps()[0];
    }
  }
  return firebaseApp;
}

export function getFirebaseAuth() {
  if (!authInstance) {
    try {
      initializationAttempts++;
      console.log(`Initializing Firebase Auth (attempt ${initializationAttempts})`);
      
      const app = getFirebaseApp();
      authInstance = getAuth(app);
      
      // Set persistence to LOCAL to keep the user logged in
      setPersistence(authInstance, browserLocalPersistence)
        .then(() => {
          console.log('Firebase Auth persistence set to LOCAL');
        })
        .catch(error => {
          console.error('Error setting auth persistence:', error);
          // Continue anyway, as this is not critical
        });
      
      // Use emulator if in development
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
        console.log('Using Firebase Auth emulator');
        connectAuthEmulator(authInstance, 'http://localhost:9099');
      }
      
      console.log('Firebase Auth initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Auth:', error);
      
      // Retry initialization if we haven't reached the maximum attempts
      if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
        console.log(`Retrying Firebase Auth initialization (${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})`);
        // Reset the instance so we can try again
        authInstance = null;
        return getFirebaseAuth();
      }
      
      console.error(`Failed to initialize Firebase Auth after ${MAX_INITIALIZATION_ATTEMPTS} attempts`);
      throw error;
    }
  }
  return authInstance;
}

export function getFirebaseFirestore() {
  if (!dbInstance) {
    try {
      const app = getFirebaseApp();
      dbInstance = getFirestore(app);
      console.log('Firebase Firestore initialized successfully');
      
      // Use emulator if in development
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
        console.log('Using Firestore emulator');
        connectFirestoreEmulator(dbInstance, 'localhost', 8080);
      }
    } catch (error) {
      console.error('Error initializing Firestore:', error);
      throw error;
    }
  }
  return dbInstance;
}

// Pre-declare our exports
let auth;
let db;

// Initialize on import with error handling
try {
  auth = getFirebaseAuth();
  console.log('Firebase auth initialized on import');
  
  // Only initialize Firestore if Auth was successful
  if (auth) {
    try {
      db = getFirebaseFirestore();
      console.log('Firebase Firestore initialized on import');
    } catch (dbError) {
      console.error('Firestore initialization error:', dbError);
      db = null;
    }
  }
} catch (error) {
  console.error('Critical Firebase Auth initialization error:', error);
  // Set fallback values if initialization fails
  auth = null;
  db = null;
}

// Export our instances and functions
export { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile
};

// Simple test function to check Firebase Auth connectivity
export async function testAuth(email, password) {
  try {
    console.log('Testing Firebase Auth connection...');
    const authInstance = getFirebaseAuth();
    
    if (!authInstance) {
      console.error('Auth instance not available');
      return { success: false, error: 'Auth service unavailable' };
    }
    
    console.log(`Attempting test auth with email: ${email}`);
    const result = await signInWithEmailAndPassword(authInstance, email, password);
    
    console.log('Test auth successful');
    return { 
      success: true, 
      user: {
        uid: result.user.uid,
        email: result.user.email
      }
    };
  } catch (error) {
    console.error('Test auth failed:', error.code, error.message);
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
} 