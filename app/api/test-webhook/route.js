import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeFirebaseAdmin } from '../../utils/firebaseAdmin';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Test endpoint for Stripe webhooks
 * 
 * This endpoint simulates a Stripe webhook event for testing purposes.
 * It helps verify that your webhook handling is working properly.
 */
export async function GET(request) {
  // Security check - only allow in development or with proper API key
  if (process.env.NODE_ENV !== 'development') {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('key');
    
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  // Get test parameters
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const eventType = url.searchParams.get('event') || 'checkout.session.completed';
  
  if (!email) {
    return NextResponse.json({ 
      error: 'Email parameter is required' 
    }, { status: 400 });
  }
  
  try {
    // Log the test request
    console.log(`Testing webhook for ${email} with event type ${eventType}`);
    
    const { db } = initializeFirebaseAdmin('webhook-test');
    if (!db) {
      return NextResponse.json({ 
        error: 'Firebase initialization failed' 
      }, { status: 500 });
    }
    
    // Create a test record in the database
    const timestamp = new Date().toISOString();
    const emailKey = email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
    
    // Update the user's premium status directly
    await db.collection('paid_emails').doc(emailKey).set({
      email: email.toLowerCase(),
      isPremium: true,
      premiumSince: timestamp,
      updatedAt: timestamp,
      subscriptionStatus: 'active',
      source: 'webhook_test',
      testEventType: eventType,
      isTest: true
    }, { merge: true });
    
    // Log the test in a separate collection
    await db.collection('webhook_tests').add({
      email: email.toLowerCase(),
      timestamp,
      eventType,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });
    
    // Return success
    return NextResponse.json({
      success: true,
      message: `Test webhook processed for ${email}`,
      eventType,
      timestamp
    });
  } catch (error) {
    console.error('Error in webhook test:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * POST handler for simulating a webhook event
 */
export async function POST(request) {
  // Security check - only allow in development or with proper API key
  if (process.env.NODE_ENV !== 'development') {
    const auth = request.headers.get('Authorization');
    if (!auth || auth !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  try {
    // Parse the request body
    const body = await request.json();
    const { email, eventType = 'checkout.session.completed', isPremium = true } = body;
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email parameter is required' 
      }, { status: 400 });
    }
    
    // Initialize Firebase
    const { db } = initializeFirebaseAdmin('webhook-test-post');
    if (!db) {
      return NextResponse.json({ 
        error: 'Firebase initialization failed' 
      }, { status: 500 });
    }
    
    // Update the user's premium status
    const timestamp = new Date().toISOString();
    const emailKey = email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
    
    await db.collection('paid_emails').doc(emailKey).set({
      email: email.toLowerCase(),
      isPremium,
      ...(isPremium ? { premiumSince: timestamp } : {}),
      updatedAt: timestamp,
      subscriptionStatus: isPremium ? 'active' : 'canceled',
      source: 'webhook_test_post',
      testEventType: eventType,
      isTest: true
    }, { merge: true });
    
    // Try to update Firebase Auth user if they exist
    try {
      const { auth } = initializeFirebaseAdmin('webhook-test-auth');
      
      if (auth) {
        const userRecord = await auth.getUserByEmail(email.toLowerCase())
          .catch(() => null);
        
        if (userRecord) {
          // Set custom claims for premium status
          await auth.setCustomUserClaims(userRecord.uid, { 
            isPremium,
            updatedAt: timestamp,
            ...(isPremium ? { premiumSince: timestamp } : {})
          });
          
          console.log(`Updated Auth claims for ${email} in webhook test`);
          
          // Also update the Firestore user document
          try {
            await db.collection('users').doc(userRecord.uid).update({
              isPremium,
              updatedAt: timestamp,
              ...(isPremium ? { premiumSince: timestamp } : {}),
              lastWebhookTest: timestamp
            });
          } catch (userUpdateError) {
            console.error(`Error updating user document in webhook test:`, userUpdateError);
          }
        }
      }
    } catch (authError) {
      console.error('Error updating Auth in webhook test:', authError);
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      message: `Test webhook POST processed for ${email}`,
      eventType,
      isPremium,
      timestamp
    });
  } catch (error) {
    console.error('Error in webhook test POST:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
} 