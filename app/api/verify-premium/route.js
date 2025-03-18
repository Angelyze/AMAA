import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';
import fetch from 'node-fetch';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Verify if an email has premium access
 */
export async function POST(request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        eligible: false, 
        error: 'Email is required',
        source: 'validation'
      }, { status: 400 });
    }
    
    console.log(`Verifying premium eligibility for: ${email}`);
    
    // Initialize Firebase Admin
    const { auth, db } = initializeFirebaseAdmin('verify-premium');
    
    if (!auth || !db) {
      console.error('Firebase initialization failed');
      return NextResponse.json({ 
        eligible: false,
        error: 'Service temporarily unavailable',
        source: 'firebase-init'
      }, { status: 503 });
    }
    
    // Normalize email
    const normalizedEmail = email.toLowerCase();
    const emailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
    
    let isPremium = false;
    let checkMethod = 'none';
    
    try {
      // Method 1: Try to check via Firestore SDK first
      console.log(`Checking paid_emails collection for: ${normalizedEmail}`);
      const paidEmailDoc = await db.collection('paid_emails').doc(emailKey).get();
      
      if (paidEmailDoc.exists) {
        const data = paidEmailDoc.data();
        isPremium = data.isPremium === true;
        checkMethod = 'firestore-sdk';
        console.log(`Premium status from paid_emails: ${isPremium}`);
      } else {
        console.log(`Email ${normalizedEmail} not found in paid_emails collection`);
      }
    } catch (firestoreError) {
      console.error('Error checking Firestore via SDK:', firestoreError);
      
      // Method 2: Fallback to direct REST API if SDK fails
      try {
        console.log('Falling back to direct Firestore REST API check...');
        const result = await checkPremiumViaREST(normalizedEmail);
        
        if (result.found) {
          isPremium = result.isPremium;
          checkMethod = 'firestore-rest';
          console.log(`Premium status from REST API: ${isPremium}`);
        }
      } catch (restError) {
        console.error('Error checking Firestore via REST:', restError);
      }
    }
    
    // Method 3: Check if user exists in Auth and has premium claims
    // Only do this if the user is still not considered premium
    if (!isPremium) {
      try {
        console.log(`Checking users collection for email: ${normalizedEmail}`);
        const usersQuery = await db.collection('users')
          .where('email', '==', normalizedEmail)
          .limit(1)
          .get();
        
        if (!usersQuery.empty) {
          const userDoc = usersQuery.docs[0];
          const userData = userDoc.data();
          
          if (userData.isPremium === true) {
            isPremium = true;
            checkMethod = 'users-collection';
            console.log(`Premium status from users collection: ${isPremium}`);
          }
        } else {
          console.log(`No user found with email ${normalizedEmail} in users collection`);
        }
      } catch (usersError) {
        console.error('Error checking users collection:', usersError);
      }
    }
    
    // Method 4: Check if user exists in Auth and has premium custom claims
    if (!isPremium) {
      try {
        const userRecord = await auth.getUserByEmail(normalizedEmail).catch(() => null);
        
        if (userRecord && userRecord.customClaims) {
          isPremium = userRecord.customClaims.isPremium === true;
          if (isPremium) {
            checkMethod = 'auth-claims';
            console.log(`Premium status from Auth claims: ${isPremium}`);
          }
        }
      } catch (authError) {
        console.error('Error checking Auth claims:', authError);
      }
    }
    
    // Create comprehensive response
    const response = {
      eligible: isPremium,
      email: normalizedEmail,
      source: checkMethod,
      timestamp: new Date().toISOString(),
      request_id: `verify-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    };
    
    // Log the result
    console.log(`Eligibility result for ${normalizedEmail}: ${isPremium}`);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in verify-premium API:', error);
    return NextResponse.json({ 
      eligible: false,
      error: 'Internal server error',
      source: 'server-error'
    }, { status: 500 });
  }
}

/**
 * Check premium status using Firestore REST API
 */
async function checkPremiumViaREST(email) {
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project ID not available');
  }
  
  const accessToken = await getFirebaseAccessToken();
  
  if (!accessToken) {
    throw new Error('Could not get Firebase access token');
  }
  
  // Create the document ID from email
  const emailKey = email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
  
  // Use REST API to access Firestore directly
  const url = `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/paid_emails/${emailKey}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.status === 404) {
    // Document not found
    return { found: false, isPremium: false };
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore REST API error: ${response.status} ${errorText}`);
  }
  
  const responseData = await response.json();
  
  // Extract premium status from Firestore document fields
  if (responseData && responseData.fields) {
    const isPremium = 
      responseData.fields.isPremium?.booleanValue === true ||
      responseData.fields.is_premium?.booleanValue === true;
    
    return { found: true, isPremium };
  }
  
  return { found: true, isPremium: false };
}

/**
 * Get Firebase Admin access token for REST API calls
 */
async function getFirebaseAccessToken() {
  try {
    const { app } = initializeFirebaseAdmin('token-generator');
    
    if (!app) {
      console.error('Could not initialize Firebase Admin for token generation');
      return null;
    }
    
    const token = await app.options.credential.getAccessToken();
    return token.access_token;
  } catch (error) {
    console.error('Error getting Firebase access token:', error);
    return null;
  }
} 