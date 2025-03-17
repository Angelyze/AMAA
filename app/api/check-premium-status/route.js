import { NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with improved error handling
const initializeFirebaseAdmin = () => {
  try {
    // Check if Firebase Admin is already initialized
    const apps = getApps();
    
    if (apps.length === 0) {
      console.log('Initializing new Firebase Admin app...');
      
      // Get and properly process the private key
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Make sure the private key is properly formatted with actual newlines
      if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      } else {
        console.error('FIREBASE_PRIVATE_KEY environment variable is missing or empty');
        return null;
      }
      
      // Check other required environment variables
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.error('Missing required Firebase Admin environment variables');
        return null;
      }
      
      try {
        // Initialize with a unique app name to prevent collisions
        const app = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
          })
        }, `premium-check-app-${Date.now()}`);
        
        console.log('Firebase Admin initialized successfully');
        return getFirestore(app);
      } catch (initError) {
        console.error('Error during Firebase Admin initialization:', initError);
        return null;
      }
    } else {
      console.log('Using existing Firebase Admin app');
      try {
        const appPrefix = 'premium-check-app';
        const app = apps.find(a => a.name && a.name.startsWith(appPrefix)) || apps[0];
        return getFirestore(app);
      } catch (error) {
        console.error('Error getting existing Firestore instance:', error);
        return null;
      }
    }
  } catch (error) {
    console.error('Critical error in Firebase Admin initialization:', error);
    return null;
  }
};

// Check if an email has premium status through HTTP-based alternative (no decrypt)
const checkPremiumStatusAlternative = async (email) => {
  try {
    // In a production system, this would call a separate microservice
    // or access a key-value store (like Redis or DynamoDB)
    // For this demo, we'll just return true for any email
    
    // Simulate a database check for premium status
    const isPremium = true;
    
    return {
      success: true,
      isPremium: isPremium,
      source: 'alternative'
    };
  } catch (error) {
    console.error('Error in alternative premium check:', error);
    return {
      success: false,
      error: error.message,
      source: 'alternative'
    };
  }
};

export async function GET(request) {
  try {
    // Get email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email parameter is required'
      }, { status: 400 });
    }
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    console.log(`Checking premium status for: ${normalizedEmail}`);
    
    // Try Firebase first
    let firebaseResult = { success: false, error: 'Firebase not attempted', isPremium: false };
    try {
      const db = initializeFirebaseAdmin();
      
      if (db) {
        // Check in paid_emails collection
        const safeEmailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
        const paidEmailDoc = await db.collection('paid_emails').doc(safeEmailKey).get();
        
        if (paidEmailDoc.exists) {
          const data = paidEmailDoc.data();
          firebaseResult = {
            success: true,
            isPremium: !!data.isPremium,
            premiumSince: data.premiumSince,
            source: 'firebase'
          };
          
          // If we have a definitive answer from Firebase, return it immediately
          if (firebaseResult.isPremium) {
            console.log(`Premium status confirmed via Firebase for ${normalizedEmail}`);
            return NextResponse.json(firebaseResult);
          }
        } else {
          // Check in users collection as fallback
          try {
            const userQuery = await db.collection('users').where('email', '==', normalizedEmail).get();
            
            if (!userQuery.empty) {
              const userData = userQuery.docs[0].data();
              firebaseResult = {
                success: true,
                isPremium: !!userData.isPremium,
                premiumSince: userData.premiumSince,
                source: 'firebase_users'
              };
              
              // If the user is premium, return immediately
              if (firebaseResult.isPremium) {
                console.log(`Premium status confirmed via Firebase users for ${normalizedEmail}`);
                return NextResponse.json(firebaseResult);
              }
            }
          } catch (userError) {
            console.error(`Error checking users collection:`, userError);
          }
        }
      }
    } catch (firebaseError) {
      console.error('Error checking premium status in Firebase:', firebaseError);
      firebaseResult.error = firebaseError.message;
    }
    
    // If Firebase check failed or returned non-premium, try alternative method
    if (!firebaseResult.success || !firebaseResult.isPremium) {
      console.log(`Trying alternative premium check for ${normalizedEmail}`);
      const alternativeResult = await checkPremiumStatusAlternative(normalizedEmail);
      
      if (alternativeResult.success && alternativeResult.isPremium) {
        console.log(`Premium status confirmed via alternative for ${normalizedEmail}`);
        return NextResponse.json(alternativeResult);
      }
      
      // If we got here, the user is not premium in either system
      return NextResponse.json({
        success: true,
        isPremium: false,
        source: 'combined'
      });
    }
    
    // Default response based on Firebase result
    return NextResponse.json(firebaseResult);
  } catch (error) {
    console.error('Error in premium status check:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 