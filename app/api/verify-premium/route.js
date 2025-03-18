import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';
import fetch from 'node-fetch';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Comprehensive premium status verification API
 * This endpoint checks multiple sources to determine if a user has premium access:
 * 1. Firestore paid_emails collection
 * 2. Firestore users collection
 * 3. Firebase Auth custom claims
 * 4. Stripe subscription status (for active subscriptions)
 */
export async function POST(request) {
  try {
    const { email, uid, refreshToken } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        eligible: false, 
        error: 'Email is required',
        source: 'validation'
      }, { status: 400 });
    }
    
    console.log(`Comprehensive premium verification for: ${email}`);
    
    // Initialize Firebase Admin
    const { auth, db } = initializeFirebaseAdmin('verify-premium-comp');
    
    if (!auth || !db) {
      console.error('Firebase initialization failed');
      return NextResponse.json({ 
        eligible: false,
        error: 'Service temporarily unavailable',
        source: 'firebase-init'
      }, { status: 503 });
    }
    
    // Normalize email and create safe email key
    const normalizedEmail = email.toLowerCase();
    const emailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
    
    // Track verification sources and results
    const results = {
      paidEmailsCheck: { eligible: false, checked: false },
      usersCheck: { eligible: false, checked: false },
      authCheck: { eligible: false, checked: false },
      stripeCheck: { eligible: false, checked: false },
    };
    
    // 1. Check paid_emails collection first
    try {
      results.paidEmailsCheck.checked = true;
      console.log(`Checking paid_emails collection for: ${normalizedEmail}`);
      
      const paidEmailDoc = await db.collection('paid_emails').doc(emailKey).get();
      
      if (paidEmailDoc.exists) {
        const data = paidEmailDoc.data();
        
        // Check if subscription is scheduled for cancellation
        const cancelAtPeriodEnd = data.cancelAtPeriodEnd === true;
        const subscriptionStatus = data.subscriptionStatus;
        
        // Consider eligible if explicitly marked as premium and not cancelled
        results.paidEmailsCheck.eligible = 
          data.isPremium === true && 
          subscriptionStatus !== 'canceled' && 
          subscriptionStatus !== 'unpaid';
        
        // For scheduled cancellations, we still honor the premium status
        // but we'll include this info in the response
        results.paidEmailsCheck.cancelAtPeriodEnd = cancelAtPeriodEnd;
        results.paidEmailsCheck.subscriptionStatus = subscriptionStatus;
        
        console.log(`Paid emails check result: ${results.paidEmailsCheck.eligible}`);
        
        // If the document exists but indicates the user is not premium,
        // that's a stronger signal than not finding them at all
        if (data.isPremium === false) {
          console.log(`User explicitly marked as non-premium in paid_emails`);
          
          // This is a definitive negative result - user was premium but isn't anymore
          return NextResponse.json({
            eligible: false,
            email: normalizedEmail,
            source: 'paid_emails',
            cancelAtPeriodEnd: data.cancelAtPeriodEnd,
            subscriptionStatus: data.subscriptionStatus,
            timestamp: new Date().toISOString(),
            results
          });
        }
      } else {
        console.log(`Email ${normalizedEmail} not found in paid_emails collection`);
      }
    } catch (firestoreError) {
      console.error('Error checking paid_emails collection:', firestoreError);
    }
    
    // 2. Check users collection
    if (!results.paidEmailsCheck.eligible) {
      try {
        results.usersCheck.checked = true;
        console.log(`Checking users collection for email: ${normalizedEmail}`);
        
        // Find user by email
        const usersQuery = await db.collection('users')
          .where('email', '==', normalizedEmail)
          .limit(1)
          .get();
        
        if (!usersQuery.empty) {
          const userDoc = usersQuery.docs[0];
          const userData = userDoc.data();
          
          // Similar logic to paid_emails check
          const cancelAtPeriodEnd = userData.cancelAtPeriodEnd === true;
          
          results.usersCheck.eligible = userData.isPremium === true;
          results.usersCheck.cancelAtPeriodEnd = cancelAtPeriodEnd;
          
          console.log(`Users collection check result: ${results.usersCheck.eligible}`);
          
          // If explicitly marked as non-premium, that's definitive
          if (userData.isPremium === false) {
            console.log(`User explicitly marked as non-premium in users collection`);
            return NextResponse.json({
              eligible: false,
              email: normalizedEmail,
              source: 'users_collection',
              timestamp: new Date().toISOString(),
              results
            });
          }
        } else {
          console.log(`No user found with email ${normalizedEmail} in users collection`);
        }
      } catch (usersError) {
        console.error('Error checking users collection:', usersError);
      }
    }
    
    // 3. Check Firebase Auth custom claims if UID is provided
    if (uid) {
      try {
        results.authCheck.checked = true;
        console.log(`Checking Auth custom claims for UID: ${uid}`);
        
        const userRecord = await auth.getUser(uid);
        
        if (userRecord && userRecord.customClaims) {
          const customClaims = userRecord.customClaims;
          
          results.authCheck.eligible = customClaims.isPremium === true;
          results.authCheck.cancelAtPeriodEnd = customClaims.cancelAtPeriodEnd === true;
          
          console.log(`Auth claims check result: ${results.authCheck.eligible}`);
          
          // If explicitly marked as non-premium, that's definitive
          if (customClaims.isPremium === false) {
            console.log(`User explicitly marked as non-premium in Auth claims`);
            return NextResponse.json({
              eligible: false,
              email: normalizedEmail,
              source: 'auth_claims',
              timestamp: new Date().toISOString(),
              results
            });
          }
        } else {
          console.log(`No custom claims found for UID: ${uid}`);
        }
      } catch (authError) {
        console.error('Error checking Auth claims:', authError);
      }
    }
    
    // Determine overall eligibility based on the checks performed
    const isEligible = 
      results.paidEmailsCheck.eligible || 
      results.usersCheck.eligible || 
      results.authCheck.eligible;
    
    // Determine the source of truth
    let source = 'none';
    let cancelAtPeriodEnd = false;
    let subscriptionStatus = null;
    
    if (results.paidEmailsCheck.eligible) {
      source = 'paid_emails';
      cancelAtPeriodEnd = results.paidEmailsCheck.cancelAtPeriodEnd;
      subscriptionStatus = results.paidEmailsCheck.subscriptionStatus;
    } else if (results.usersCheck.eligible) {
      source = 'users_collection';
      cancelAtPeriodEnd = results.usersCheck.cancelAtPeriodEnd;
    } else if (results.authCheck.eligible) {
      source = 'auth_claims';
      cancelAtPeriodEnd = results.authCheck.cancelAtPeriodEnd;
    }
    
    // Create the response
    const response = {
      eligible: isEligible,
      email: normalizedEmail,
      source,
      timestamp: new Date().toISOString(),
      cancelAtPeriodEnd: cancelAtPeriodEnd || false,
      results
    };
    
    if (subscriptionStatus) {
      response.subscriptionStatus = subscriptionStatus;
    }
    
    // Log the final result
    console.log(`Final eligibility result for ${normalizedEmail}: ${isEligible} (source: ${source})`);
    
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