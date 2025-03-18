import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';
import fetch from 'node-fetch';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Changed from 'edge' to 'nodejs'

/**
 * Update premium status for a user
 * 
 * This endpoint updates a user's premium status in both Firebase Auth and Firestore
 */
export async function POST(request) {
  try {
    // Get request data
    const { email, isPremium = true, metadata = {} } = await request.json();
    
    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required',
      }, { status: 400 });
    }
    
    console.log(`API: Updating premium status for ${email} to ${isPremium}`);
    
    // Initialize Firebase Admin
    const { auth, db } = initializeFirebaseAdmin('update-premium');
    
    if (!auth || !db) {
      console.error('Firebase initialization failed');
      return NextResponse.json({
        success: false,
        error: 'Service unavailable',
      }, { status: 503 });
    }
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    const timestamp = new Date().toISOString();
    
    // Create email key for Firestore (replacing dots and special chars)
    const emailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
    
    // Track successes for response
    let firestoreUpdated = false;
    let authUpdated = false;
    let userRecord = null;
    
    // Update or create document in paid_emails collection first
    // This ensures we have a record of this email being premium
    try {
      const data = {
        email: normalizedEmail,
        isPremium,
        premiumSince: isPremium ? (metadata.premiumSince || timestamp) : null,
        subscriptionStatus: metadata.subscriptionStatus || (isPremium ? 'active' : 'canceled'),
        updatedAt: timestamp,
        // Additional fields
        registered: metadata.registered || false,
        source: metadata.source || 'api',
        updatedBy: metadata.updatedBy || 'update-premium-api'
      };
      
      await db.collection('paid_emails').doc(emailKey).set(data, { merge: true });
      firestoreUpdated = true;
      console.log(`Updated paid_emails record for ${normalizedEmail}`);
    } catch (paidEmailError) {
      console.error(`Error updating paid_emails for ${normalizedEmail}:`, paidEmailError);
      
      // Fallback: Use direct REST API if Firestore SDK fails
      try {
        console.log('Attempting direct Firestore REST API fallback...');
        await updateFirestoreViaREST(
          'paid_emails',
          emailKey,
          {
            email: normalizedEmail,
            isPremium,
            premiumSince: isPremium ? (metadata.premiumSince || timestamp) : null,
            subscriptionStatus: metadata.subscriptionStatus || (isPremium ? 'active' : 'canceled'),
            updatedAt: timestamp,
            registered: metadata.registered || false,
            source: metadata.source || 'api-rest-fallback',
            updatedBy: metadata.updatedBy || 'update-premium-api'
          }
        );
        firestoreUpdated = true;
        console.log(`Updated paid_emails record for ${normalizedEmail} via REST fallback`);
      } catch (restError) {
        console.error(`REST fallback also failed for ${normalizedEmail}:`, restError);
        // Continue to Auth update anyway, as it's more important
      }
    }
    
    // Check if user exists in Firebase Auth
    try {
      userRecord = await auth.getUserByEmail(normalizedEmail)
        .catch(() => null); // Catch "user not found" error and continue
      
      if (userRecord) {
        // User exists, update custom claims
        await auth.setCustomUserClaims(userRecord.uid, { 
          isPremium,
          updatedAt: timestamp,
          ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {})
        });
        
        authUpdated = true;
        console.log(`Updated Auth custom claims for ${normalizedEmail}`);
        
        // Also update Firestore user record if it exists
        try {
          const userData = {
            isPremium,
            updatedAt: timestamp,
            ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {}),
            email: normalizedEmail, // Always include email
            lastPremiumUpdate: {
              timestamp,
              source: metadata.source || 'api',
              method: 'sdk'
            }
          };
          
          await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
          console.log(`Updated Firestore user record for ${normalizedEmail}`);
        } catch (userUpdateError) {
          console.error(`Error updating user record for ${normalizedEmail}:`, userUpdateError);
          
          // Fallback: Use direct REST API if Firestore SDK fails
          try {
            console.log('Attempting direct Firestore REST API fallback for user document...');
            await updateFirestoreViaREST(
              'users',
              userRecord.uid,
              {
                isPremium,
                updatedAt: timestamp,
                ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {}),
                email: normalizedEmail,
                lastPremiumUpdate: {
                  timestamp,
                  source: metadata.source || 'api-rest-fallback',
                  method: 'rest'
                }
              }
            );
            console.log(`Updated users record for ${normalizedEmail} via REST fallback`);
          } catch (restError) {
            console.error(`REST fallback for user document also failed for ${normalizedEmail}:`, restError);
            // Continue anyway as Auth claims are the source of truth
          }
        }
      } else {
        console.log(`User ${normalizedEmail} not registered yet. Will be premium upon signup.`);
      }
    } catch (authError) {
      console.error(`Error updating Auth for ${normalizedEmail}:`, authError);
      // Continue anyway, as we still have the paid_emails record
    }
    
    // Return success, with some details about what was updated
    return NextResponse.json({
      success: firestoreUpdated || authUpdated, // Success if either one worked
      email: normalizedEmail,
      isPremium,
      authUpdated,
      firestoreUpdated,
      userExists: !!userRecord,
      timestamp
    });
  } catch (error) {
    console.error('Error in update-premium-status API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Update Firestore document using direct REST API call
 * This is a fallback method for when the Firebase Admin SDK fails due to gRPC issues
 */
async function updateFirestoreViaREST(collection, documentId, data) {
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project ID not available');
  }
  
  const accessToken = await getFirebaseAccessToken();
  
  if (!accessToken) {
    throw new Error('Could not get Firebase access token');
  }

  const url = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}/${documentId}`;
  
  // Convert data to Firestore format
  const firestoreData = {
    fields: convertToFirestoreFields(data)
  };
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(firestoreData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Get Firebase Admin access token for REST API calls
 */
async function getFirebaseAccessToken() {
  try {
    // Try to get an existing app or initialize a new one
    const { app } = initializeFirebaseAdmin('token-generator');
    
    if (!app) {
      console.error('Could not initialize Firebase Admin for token generation');
      return null;
    }
    
    // Get access token from app
    const token = await app.options.credential.getAccessToken();
    return token.access_token;
  } catch (error) {
    console.error('Error getting Firebase access token:', error);
    return null;
  }
}

/**
 * Convert JavaScript object to Firestore fields format for REST API
 */
function convertToFirestoreFields(data) {
  const fields = {};
  
  Object.entries(data).forEach(([key, value]) => {
    fields[key] = convertValueToFirestoreType(value);
  });
  
  return fields;
}

/**
 * Convert a JavaScript value to its Firestore type representation
 */
function convertValueToFirestoreType(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  } else if (typeof value === 'string') {
    return { stringValue: value };
  } else if (typeof value === 'number') {
    return { doubleValue: value };
  } else if (typeof value === 'boolean') {
    return { booleanValue: value };
  } else if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  } else if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(item => convertValueToFirestoreType(item))
      }
    };
  } else if (typeof value === 'object') {
    return {
      mapValue: {
        fields: convertToFirestoreFields(value)
      }
    };
  } else {
    // Default to string for unsupported types
    return { stringValue: String(value) };
  }
} 