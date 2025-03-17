import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
let adminApp;
let adminDb;
let adminAuth;

const initializeFirebaseAdmin = () => {
  try {
    // If Firebase Admin is already initialized, return the existing instances
    if (adminDb && adminAuth) {
      console.log('Using already initialized Firebase Admin instance in auth route');
      return { db: adminDb, auth: adminAuth };
    }
    
    const apps = getApps();
    console.log(`Firebase Admin apps count: ${apps.length}`);
    
    if (apps.length === 0) {
      console.log('Initializing new Firebase Admin app in auth route...');
      
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
        
        // Ensure proper newlines in private key
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
        const appName = `auth-route-app-${Date.now()}`; // Timestamp for uniqueness
        console.log(`Initializing Firebase Admin with app name: ${appName}`);
        
        adminApp = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
          })
        }, appName);
        
        adminDb = getFirestore(adminApp);
        adminAuth = getAuth(adminApp);
        
        console.log('Firebase Admin initialized successfully in auth route');
        return { db: adminDb, auth: adminAuth };
      } catch (initError) {
        console.error('Error initializing Firebase Admin:', initError);
        console.error(initError.stack);
        return null;
      }
    } else {
      console.log('Using existing Firebase Admin app');
      try {
        // Try to get the app with our specific prefix or fall back to the first app
        const appPrefix = 'auth-route-app';
        const app = apps.find(a => a.name && a.name.startsWith(appPrefix)) || apps[0];
        adminDb = getFirestore(app);
        adminAuth = getAuth(app);
        return { db: adminDb, auth: adminAuth };
      } catch (error) {
        console.error('Error getting existing Firebase Admin app:', error);
        // Try to initialize a new app with a different name
        try {
          const appName = `auth-route-app-${Date.now()}`; // Use timestamp for uniqueness
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          
          adminApp = initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey
            })
          }, appName);
          
          adminDb = getFirestore(adminApp);
          adminAuth = getAuth(adminApp);
          console.log('Created new Firebase Admin app with timestamp');
          return { db: adminDb, auth: adminAuth };
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

// Direct implementation of API route handlers
export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname.split('/').pop();
  
  console.log('GET Auth Request:', request.url);
  
  // Check for session cookie
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('auth-session');
  
  if (!sessionCookie || !sessionCookie.value) {
    // If no session cookie, user is logged out
    if (path === 'session') {
      return NextResponse.json({ user: null });
    }
  } else {
    // Session exists, extract user ID from session cookie
    const [userId] = sessionCookie.value.split('-');
    
    if (userId) {
      try {
        // Initialize Firebase
        const { db, auth } = initializeFirebaseAdmin();
        
        if (!db || !auth) {
          throw new Error('Firebase initialization failed');
        }
        
        // Get user from Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          // Return user session data (without sensitive info)
          if (path === 'session') {
            return NextResponse.json({
              user: {
                id: userId,
                name: userData.name || userData.displayName || 'User',
                email: userData.email,
                image: userData.image || userData.photoURL || '/profile-placeholder.png',
                isPremium: userData.isPremium || false
              },
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
      }
    }
  }
  
  // Handle CSRF token request
  if (path === 'csrf') {
    return NextResponse.json({
      csrfToken: "dummy-csrf-token"
    });
  }

  // For any other GET requests, return a basic response
  return NextResponse.json({
    message: "Auth endpoint active"
  });
}

export async function POST(request) {
  const url = new URL(request.url);
  
  console.log('POST Auth Request:', request.url);
  
  try {
    // Signout endpoint
    if (url.pathname.includes('signout')) {
      const response = NextResponse.json({ success: true });
      response.cookies.delete('auth-session');
      return response;
    }
    
    // For any other POST requests
    return NextResponse.json({
      message: "Auth endpoint active"
    });
  } catch (error) {
    console.error('Auth POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}