import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin, setUserPremiumStatus } from '../../utils/firebaseAdmin';
import { isTestPremiumEmail } from '../../utils/config';
import { v4 as uuidv4 } from 'uuid';

// Check if an email should be premium (from Stripe webhook or test emails)
async function checkIsPremiumEmail(email, db) {
  try {
    if (!email || !db) return false;
    
    const normalizedEmail = email.toLowerCase();
    
    // Check if this is a test email that should always be premium
    if (isTestPremiumEmail(normalizedEmail)) {
      console.log(`Premium test email detected: ${normalizedEmail}`);
      return true;
    }
    
    // Check if email exists in paid_emails collection
    try {
      const safeEmailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
      const paidEmailDoc = await db.collection('paid_emails').doc(safeEmailKey).get();
      
      if (paidEmailDoc.exists && paidEmailDoc.data().isPremium) {
        console.log(`Email found in paid_emails collection: ${normalizedEmail}`);
        return true;
      }
    } catch (error) {
      console.error(`Error checking paid_emails: ${error}`);
      // Continue to check other methods
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking premium status: ${error}`);
    return false;
  }
}

export async function POST(request) {
  try {
    const { email, password, displayName } = await request.json();
    
    // Input validation
    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        error: "Email and password are required" 
      }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ 
        success: false, 
        error: "Password must be at least 6 characters" 
      }, { status: 400 });
    }
    
    // Initialize Firebase
    console.log('Initializing Firebase Admin for registration...');
    const { auth, db } = initializeFirebaseAdmin('register-route');
    if (!auth) {
      console.error('Failed to initialize Firebase Auth in register route');
      return NextResponse.json({ 
        success: false, 
        error: "Error initializing Firebase Auth" 
      }, { status: 500 });
    }
    
    const normalizedEmail = email.toLowerCase();
    console.log(`Processing registration for email: ${normalizedEmail}`);
    
    // Check if user already exists in Firebase Auth
    try {
      console.log(`Checking if user exists: ${normalizedEmail}`);
      const userRecord = await auth.getUserByEmail(normalizedEmail)
        .catch(() => null);
      
      if (userRecord) {
        console.log(`User already exists: ${normalizedEmail}`);
        return NextResponse.json({ 
          success: false, 
          error: "User with this email already exists" 
        }, { status: 400 });
      }
    } catch (error) {
      // User not found, which is what we want
      console.log(`User not found, proceeding with registration: ${normalizedEmail}`);
    }
    
    // Check if this email should be premium
    console.log(`Checking premium status for: ${normalizedEmail}`);
    const isPremium = await checkIsPremiumEmail(normalizedEmail, db);
    console.log(`Premium status for ${normalizedEmail}: ${isPremium}`);
    
    // Create user in Firebase Auth
    try {
      console.log(`Creating user in Firebase Auth: ${normalizedEmail}`);
      
      // Create Firebase Auth user with detailed error handling
      let userRecord;
      try {
        // Create Firebase Auth user
        userRecord = await auth.createUser({
          email: normalizedEmail,
          password: password,
          emailVerified: false,
          displayName: displayName || normalizedEmail.split('@')[0]
        });
        
        console.log(`Created user in Firebase Auth: ${userRecord.uid}`);
      } catch (authError) {
        console.error(`Error creating user in Firebase Auth: ${authError.message}`);
        
        // Check for specific Firebase Auth errors
        if (authError.code === 'auth/email-already-exists') {
          return NextResponse.json({ 
            success: false, 
            error: "This email is already registered. Please sign in instead." 
          }, { status: 400 });
        } else if (authError.code === 'auth/invalid-email') {
          return NextResponse.json({ 
            success: false, 
            error: "Invalid email address format." 
          }, { status: 400 });
        } else if (authError.code === 'auth/invalid-password') {
          return NextResponse.json({ 
            success: false, 
            error: "Password is too weak. Please use a stronger password." 
          }, { status: 400 });
        } else if (authError.code === 'auth/operation-not-allowed') {
          console.error('Email/password accounts are not enabled in Firebase console');
          return NextResponse.json({ 
            success: false, 
            error: "Registration is temporarily unavailable. Please try again later." 
          }, { status: 500 });
        }
        
        // Generic error
        return NextResponse.json({ 
          success: false, 
          error: `Error creating user: ${authError.message}` 
        }, { status: 500 });
      }
      
      // Set custom claims if premium
      if (isPremium) {
        try {
          console.log(`Setting premium claims for user: ${normalizedEmail}`);
          await setUserPremiumStatus(userRecord.uid, true);
          console.log(`Set premium claims for user: ${normalizedEmail}`);
        } catch (claimsError) {
          console.error(`Error setting premium claims: ${claimsError.message}`);
          // Continue anyway as we can fix this later
        }
      }
      
      // Also create a record in Firestore for backward compatibility
      if (db) {
        try {
          const timestamp = new Date().toISOString();
          
          console.log(`Creating Firestore record for user: ${userRecord.uid}`);
          await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: normalizedEmail,
            displayName: displayName || normalizedEmail.split('@')[0],
            isPremium: isPremium,
            premiumSince: isPremium ? timestamp : null,
            createdAt: timestamp,
            updatedAt: timestamp
          });
          
          console.log(`Created user record in Firestore: ${userRecord.uid}`);
          
          // If premium, update paid_emails collection
          if (isPremium) {
            try {
              console.log(`Updating paid_emails record for: ${normalizedEmail}`);
              const safeEmailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
              await db.collection('paid_emails').doc(safeEmailKey).set({
                email: normalizedEmail,
                isPremium: true,
                premiumSince: timestamp,
                registered: true,
                uid: userRecord.uid,
                updatedAt: timestamp
              }, { merge: true });
              
              console.log(`Updated paid_emails record for ${normalizedEmail}`);
            } catch (emailsError) {
              console.error(`Error updating paid_emails: ${emailsError.message}`);
              // Continue anyway as Auth is the source of truth
            }
          }
        } catch (firestoreError) {
          console.error(`Error creating Firestore record: ${firestoreError.message}`);
          // Continue anyway as Auth is the source of truth
        }
      } else {
        console.warn('Firestore not initialized, skipping Firestore record creation');
      }
      
      console.log(`Registration successful for: ${normalizedEmail}`);
      return NextResponse.json({ 
        success: true, 
        uid: userRecord.uid,
        isPremium: isPremium
      });
    } catch (error) {
      console.error(`Registration error: ${error.message}`);
      console.error(error.stack);
      return NextResponse.json({ 
        success: false, 
        error: `Registration failed: ${error.message}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Unexpected error in registration API: ${error.message}`);
    console.error(error.stack);
    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred" 
    }, { status: 500 });
  }
} 