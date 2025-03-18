import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';
import fetch from 'node-fetch';
import Stripe from 'stripe';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Comprehensive premium status verification API
 * This endpoint checks multiple sources to determine if a user has premium access:
 * 1. Firestore paid_emails collection
 * 2. Firestore users collection
 * 3. Firebase Auth custom claims
 * 4. Direct Stripe API verification (as a fallback)
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
          subscriptionStatus !== 'unpaid' &&
          subscriptionStatus !== 'cancellation_pending';
        
        // For scheduled cancellations, we now consider the user as NOT premium
        // This is the key change from the previous version
        if (cancelAtPeriodEnd) {
          results.paidEmailsCheck.eligible = false;
          console.log(`Subscription is marked for cancellation, user is NOT premium`);
        }
        
        results.paidEmailsCheck.cancelAtPeriodEnd = cancelAtPeriodEnd;
        results.paidEmailsCheck.subscriptionStatus = subscriptionStatus;
        results.paidEmailsCheck.customerId = data.customerId;
        results.paidEmailsCheck.subscriptionId = data.subscriptionId;
        
        console.log(`Paid emails check result: ${results.paidEmailsCheck.eligible}`);
        
        // Store subscription IDs for Stripe direct check
        if (data.customerId) {
          results.stripeCustomerId = data.customerId;
        }
        if (data.subscriptionId) {
          results.stripeSubscriptionId = data.subscriptionId;
        }
        
        // If the document exists but indicates the user is not premium,
        // that's a stronger signal than not finding them at all
        if (data.isPremium === false) {
          console.log(`User explicitly marked as non-premium in paid_emails`);
          
          // This is a definitive negative result - user was premium but isn't anymore
          // But we'll still do the Stripe check as a fallback
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
          
          // If cancellation is pending, consider as not premium
          results.usersCheck.eligible = 
            userData.isPremium === true && 
            !cancelAtPeriodEnd &&
            userData.subscriptionStatus !== 'canceled' &&
            userData.subscriptionStatus !== 'unpaid' &&
            userData.subscriptionStatus !== 'cancellation_pending';
            
          results.usersCheck.cancelAtPeriodEnd = cancelAtPeriodEnd;
          
          console.log(`Users collection check result: ${results.usersCheck.eligible}`);
          
          // If explicitly marked as non-premium, that's definitive
          if (userData.isPremium === false) {
            console.log(`User explicitly marked as non-premium in users collection`);
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
          
          // Same logic - if cancellation is pending, not premium
          results.authCheck.eligible = 
            customClaims.isPremium === true && 
            !customClaims.cancelAtPeriodEnd;
            
          results.authCheck.cancelAtPeriodEnd = customClaims.cancelAtPeriodEnd === true;
          
          console.log(`Auth claims check result: ${results.authCheck.eligible}`);
          
          // If explicitly marked as non-premium, that's definitive
          if (customClaims.isPremium === false) {
            console.log(`User explicitly marked as non-premium in Auth claims`);
          }
        } else {
          console.log(`No custom claims found for UID: ${uid}`);
        }
      } catch (authError) {
        console.error('Error checking Auth claims:', authError);
      }
    }
    
    // 4. FALLBACK: Direct Stripe API check for subscription status
    // This is a critical fallback when our database gets out of sync with Stripe
    try {
      // Only check Stripe if we have a customerId from previous checks
      if (results.stripeCustomerId || results.stripeSubscriptionId) {
        results.stripeCheck.checked = true;
        console.log(`Performing direct Stripe API verification as fallback...`);
        
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        // If we have a subscription ID, check it directly
        if (results.stripeSubscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(results.stripeSubscriptionId);
            
            // Check subscription status and cancellation
            const isActive = ['active', 'trialing'].includes(subscription.status);
            const isCanceled = subscription.cancel_at_period_end || subscription.status === 'canceled';
            
            results.stripeCheck.eligible = isActive && !isCanceled;
            results.stripeCheck.cancelAtPeriodEnd = subscription.cancel_at_period_end;
            results.stripeCheck.status = subscription.status;
            
            console.log(`Direct Stripe subscription check result: ${results.stripeCheck.eligible}`);
            console.log(`Stripe status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);
            
            // If stripe says it's canceled, we need to update our database
            if (isCanceled && (results.paidEmailsCheck.eligible || results.usersCheck.eligible || results.authCheck.eligible)) {
              console.log(`CRITICAL MISMATCH: Stripe says subscription is canceled but our database says it's active`);
              console.log(`Queueing database update to reflect cancellation...`);
              
              // Queue a database update (do this async without waiting)
              try {
                // Force an update to Firestore
                const forceCancellationUpdate = async () => {
                  try {
                    await db.collection('paid_emails').doc(emailKey).set({
                      isPremium: false,
                      subscriptionStatus: 'canceled',
                      cancelAtPeriodEnd: true,
                      updatedAt: new Date().toISOString(),
                      cancellationDate: new Date().toISOString(),
                      source: 'verify_premium_fallback'
                    }, { merge: true });
                    
                    // Also update user if possible
                    if (uid) {
                      await db.collection('users').doc(uid).set({
                        isPremium: false,
                        subscriptionStatus: 'canceled',
                        cancelAtPeriodEnd: true,
                        updatedAt: new Date().toISOString(),
                        cancellationDate: new Date().toISOString(),
                      }, { merge: true });
                      
                      // Update Auth claims
                      await auth.setCustomUserClaims(uid, {
                        isPremium: false,
                        cancelAtPeriodEnd: true,
                        updatedAt: new Date().toISOString()
                      });
                    }
                    
                    console.log(`Database updated to reflect cancellation from Stripe direct check`);
                  } catch (updateError) {
                    console.error('Error updating database from Stripe direct check:', updateError);
                  }
                };
                
                // Don't await this - let it run in the background
                forceCancellationUpdate();
              } catch (queueError) {
                console.error('Error queueing database update:', queueError);
              }
            }
          } catch (subscriptionError) {
            console.error('Error checking subscription directly:', subscriptionError);
            
            // If the subscription can't be found, it's definitely not active
            if (subscriptionError.code === 'resource_missing') {
              console.log('Subscription not found in Stripe - user is definitely not premium');
              results.stripeCheck.eligible = false;
              results.stripeCheck.status = 'not_found';
            }
          }
        }
        // If no subscription ID but we have customer ID, list their subscriptions
        else if (results.stripeCustomerId) {
          try {
            const subscriptions = await stripe.subscriptions.list({
              customer: results.stripeCustomerId,
              status: 'all'
            });
            
            // Check if customer has any active subscriptions
            const activeSubscription = subscriptions.data.find(sub => 
              ['active', 'trialing'].includes(sub.status) && !sub.cancel_at_period_end
            );
            
            results.stripeCheck.eligible = !!activeSubscription;
            results.stripeCheck.subscriptions = subscriptions.data.map(sub => ({
              id: sub.id,
              status: sub.status,
              cancelAtPeriodEnd: sub.cancel_at_period_end
            }));
            
            console.log(`Direct Stripe customer subscriptions check result: ${results.stripeCheck.eligible}`);
            console.log(`Customer has ${subscriptions.data.length} subscriptions, ${activeSubscription ? 'with active' : 'no active'} subscription`);
          } catch (customerError) {
            console.error('Error checking customer subscriptions:', customerError);
          }
        }
      }
    } catch (stripeError) {
      console.error('Error performing Stripe direct check:', stripeError);
    }
    
    // Determine overall eligibility based on all the checks performed
    let isEligible = 
      results.paidEmailsCheck.eligible || 
      results.usersCheck.eligible || 
      results.authCheck.eligible;
      
    // If Stripe direct check was performed and contradicts our database,
    // trust Stripe's result as it's the source of truth
    if (results.stripeCheck.checked) {
      if (isEligible && !results.stripeCheck.eligible) {
        console.log('STRIPE OVERRIDE: Stripe says user is NOT premium, overriding database results');
        isEligible = false;
      }
    }
    
    // Determine the source of truth
    let source = 'none';
    let cancelAtPeriodEnd = false;
    let subscriptionStatus = null;
    
    if (results.stripeCheck.eligible) {
      source = 'stripe_api';
      cancelAtPeriodEnd = results.stripeCheck.cancelAtPeriodEnd;
      subscriptionStatus = results.stripeCheck.status;
    } else if (results.paidEmailsCheck.eligible) {
      source = 'paid_emails';
      cancelAtPeriodEnd = results.paidEmailsCheck.cancelAtPeriodEnd;
      subscriptionStatus = results.paidEmailsCheck.subscriptionStatus;
    } else if (results.usersCheck.eligible) {
      source = 'users_collection';
      cancelAtPeriodEnd = results.usersCheck.cancelAtPeriodEnd;
    } else if (results.authCheck.eligible) {
      source = 'auth_claims';
      cancelAtPeriodEnd = results.authCheck.cancelAtPeriodEnd;
    } else if (results.stripeCheck.checked) {
      source = 'stripe_api_negative';
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
    
    // Generate a unique verification ID for tracking
    response.verificationId = `verify-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
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