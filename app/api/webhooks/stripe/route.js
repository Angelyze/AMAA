import { NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeFirebaseAdmin } from '../../../utils/firebaseAdmin';

// Route segment configuration for App Router
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Changed from 'edge' to 'nodejs'

/**
 * Process Stripe webhook events
 * 
 * This endpoint receives events from Stripe and processes them appropriately.
 * It's designed to be resilient, always returning 200 to Stripe while handling errors internally.
 */
export async function POST(request) {
  // Initialize variables
  let payload;
  let eventType;
  
  try {
    // Initialize Firebase with an identifier specific to this webhook
    console.log('Webhook received - initializing Firebase Admin');
    const { db, auth } = initializeFirebaseAdmin('stripe-webhook');
    
    if (!db || !auth) {
      console.error('Firebase initialization failed in Stripe webhook handler');
      
      // Still return 200 to Stripe, but log the error
      await logErrorToConsole('firebase_init_failed', 'Firebase initialization failed in webhook handler');
      
      // We'll still try to process the event, but we'll skip Firebase operations
      return NextResponse.json({ received: true, warning: 'Internal service partially unavailable' });
    }
    
    // Get the Stripe signature from headers
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('Webhook Error: No Stripe signature included');
      return NextResponse.json({ received: false, error: 'No signature' }, { status: 400 });
    }
    
    // Get the raw request body
    payload = await request.text();
    
    // Verify the event using the Stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed.`, err);
      return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 });
    }
    
    // Extract the event type
    eventType = event.type;
    console.log(`Stripe webhook received: ${eventType}`);
    
    // Process the event based on its type
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event, db, auth);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event, db, auth);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, db, auth);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event, db, auth);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, db, auth);
        break;
      default:
        console.log(`Unhandled event type ${eventType}`);
    }
    
    // Return a 200 response to Stripe
    return NextResponse.json({ received: true, type: eventType });
  } catch (error) {
    // Log the error
    console.error(`Error handling webhook: ${error.message}`);
    console.error(error);
    
    // Extract a meaningful error message
    const errorMessage = 
      error.message || 
      (error.code ? `Error code: ${error.code}` : 'Unknown error');
    
    // Try to log the error to Firestore for debugging
    await logErrorToConsole('webhook_error', errorMessage, { 
      payload: payload,
      eventType: eventType,
      error: error.toString(),
      stack: error.stack
    });
    
    // We still return 200 to avoid Stripe retries (we'll handle errors internally)
    return NextResponse.json({
      received: true,
      warning: 'Encountered an error during processing',
      error: errorMessage
    });
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(event, db, auth) {
  try {
    const session = event.data.object;
    const customerEmail = session.customer_details.email;
    
    console.log(`Processing completed checkout for ${customerEmail}`);
    
    if (!customerEmail) {
      throw new Error('No customer email found in checkout session');
    }
    
    // Update premium status
    await updatePremiumStatus(db, auth, {
      email: customerEmail,
      isPremium: true,
      subscriptionStatus: 'active', 
      subscriptionId: session.subscription,
      customerId: session.customer,
      sessionId: session.id,
      source: 'checkout',
    });
    
    console.log(`Checkout completed for ${customerEmail}`);
  } catch (error) {
    console.error('Error processing checkout.session.completed:', error);
    throw error; // Re-throw for central error handling
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdate(event, db, auth) {
  try {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    console.log(`Processing subscription update for customer ${customerId}`);
    console.log(`Status: ${status}, cancel_at_period_end: ${cancelAtPeriodEnd}`);
    console.log('Subscription update details:', JSON.stringify(subscription, null, 2));
    
    // Get customer email from subscription
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = customer.email;
    
    if (!customerEmail) {
      throw new Error('No customer email found');
    }
    
    // IMPORTANT: If cancel_at_period_end is true, we need to treat it as a cancellation
    // even though the status will still be 'active' until the period ends
    // This is the critical change to ensure cancellations take effect immediately!
    
    // If cancelAtPeriodEnd is true, force the premium status to false immediately
    // rather than waiting for the period to end, which resolves the cancellation detection issue
    const isPremium = cancelAtPeriodEnd ? false : ['active', 'trialing'].includes(status);
    
    // If the subscription is canceled at period end, log this clearly
    if (cancelAtPeriodEnd) {
      console.log(`CANCELLATION DETECTED: Subscription for ${customerEmail} has been cancelled`);
      console.log(`Current end date: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
      console.log(`FORCING PREMIUM STATUS TO FALSE IMMEDIATELY due to cancellation`);
      
      // Double-check by directly updating the documents
      try {
        const emailKey = customerEmail.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
        
        // Forcefully update the paid_emails collection to non-premium
        await db.collection('paid_emails').doc(emailKey).set({
          isPremium: false,
          cancelAtPeriodEnd: true,
          subscriptionStatus: 'cancellation_pending',
          cancellationDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'subscription_cancelled_immediately'
        }, { merge: true });
        
        // Also update the user in the users collection if possible
        const usersQuery = await db.collection('users')
          .where('email', '==', customerEmail.toLowerCase())
          .limit(1)
          .get();
        
        if (!usersQuery.empty) {
          const userDoc = usersQuery.docs[0];
          await userDoc.ref.set({
            isPremium: false,
            cancelAtPeriodEnd: true,
            subscriptionStatus: 'cancellation_pending',
            updatedAt: new Date().toISOString(),
            cancellationDate: new Date().toISOString()
          }, { merge: true });
          
          // Also update Firebase Auth claims
          try {
            await auth.setCustomUserClaims(userDoc.id, {
              isPremium: false,
              cancelAtPeriodEnd: true,
              subscriptionStatus: 'cancellation_pending',
              updatedAt: new Date().toISOString()
            });
            console.log(`Updated Auth claims for ${customerEmail} to reflect cancellation`);
          } catch (authError) {
            console.error(`Error updating Auth claims for cancellation:`, authError);
          }
          
          console.log(`Forcefully updated users collection for ${customerEmail} to reflect cancellation`);
        }
      } catch (forceUpdateError) {
        console.error('Error during forced update for cancellation:', forceUpdateError);
      }
    }
    
    // Get details about the subscription for more context
    let subscriptionPeriodEnd = null;
    let subscriptionItems = null;
    
    try {
      subscriptionPeriodEnd = subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;
      
      if (subscription.items && subscription.items.data) {
        subscriptionItems = subscription.items.data.map(item => ({
          id: item.id,
          price: item.price ? item.price.id : null,
          product: item.price && item.price.product ? item.price.product : null
        }));
      }
    } catch (detailsError) {
      console.error('Error extracting subscription details:', detailsError);
    }
    
    await updatePremiumStatus(db, auth, {
      email: customerEmail,
      isPremium,
      subscriptionStatus: cancelAtPeriodEnd ? 'cancellation_pending' : status,
      subscriptionId: subscription.id,
      customerId,
      cancelAtPeriodEnd,
      subscriptionPeriodEnd,
      subscriptionItems,
      source: cancelAtPeriodEnd ? 'subscription_cancelled' : 'subscription_update',
    });
    
    console.log(`Subscription updated for ${customerEmail}, isPremium: ${isPremium}, cancel_at_period_end: ${cancelAtPeriodEnd}`);
  } catch (error) {
    console.error('Error processing subscription update:', error);
    throw error;
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(event, db, auth) {
  try {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    
    console.log(`Processing subscription deletion for customer ${customerId}`);
    console.log('Subscription details:', JSON.stringify(subscription, null, 2));
    
    // Get customer email
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = customer.email;
    
    if (!customerEmail) {
      throw new Error('No customer email found');
    }
    
    // Log important details for debugging
    console.log(`SUBSCRIPTION CANCELLED for ${customerEmail}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Cancel reason: ${subscription.cancel_reason || 'Not specified'}`);
    
    // Update premium status to false
    await updatePremiumStatus(db, auth, {
      email: customerEmail,
      isPremium: false, // Always set to false for deletions/cancellations
      subscriptionStatus: 'canceled',
      subscriptionId: subscription.id,
      customerId,
      source: 'subscription_deleted',
      // Set cancelAtPeriodEnd to false since this is a full cancellation/deletion
      cancelAtPeriodEnd: false
    });
    
    // Additional measures to ensure user premium status is revoked
    try {
      // Forcefully update the user document with non-premium status
      const emailKey = customerEmail.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
      await db.collection('paid_emails').doc(emailKey).set({
        isPremium: false,
        subscriptionStatus: 'canceled',
        updatedAt: new Date().toISOString(),
        cancellationDate: new Date().toISOString(),
        source: 'subscription_deleted_force',
      }, { merge: true });
      
      console.log(`Forcefully updated paid_emails record for ${customerEmail} to non-premium status`);
      
      // Also try to find and update user in users collection
      const usersQuery = await db.collection('users')
        .where('email', '==', customerEmail.toLowerCase())
        .limit(1)
        .get();
      
      if (!usersQuery.empty) {
        const userDoc = usersQuery.docs[0];
        await userDoc.ref.set({
          isPremium: false,
          subscriptionStatus: 'canceled',
          updatedAt: new Date().toISOString(),
          cancellationDate: new Date().toISOString(),
        }, { merge: true });
        
        console.log(`Forcefully updated users collection record for ${customerEmail} to non-premium status`);
      }
    } catch (forceUpdateError) {
      console.error('Error during forced update of premium status:', forceUpdateError);
      // Continue anyway as the main updatePremiumStatus should have worked
    }
    
    console.log(`Subscription deleted for ${customerEmail} - premium access revoked`);
  } catch (error) {
    console.error('Error processing subscription deletion:', error);
    throw error;
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(event, db, auth) {
  try {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    console.log(`Processing successful payment for customer ${customerId}`);
    
    // Get customer email
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = customer.email;
    
    if (!customerEmail) {
      throw new Error('No customer email found');
    }
    
    // Update premium status
    await updatePremiumStatus(db, auth, {
      email: customerEmail,
      isPremium: true,
      subscriptionStatus: 'active',
      subscriptionId,
      customerId,
      source: 'invoice_paid',
    });
    
    console.log(`Payment succeeded for ${customerEmail}`);
  } catch (error) {
    console.error('Error processing invoice payment:', error);
    throw error;
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(event, db, auth) {
  try {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    console.log(`Processing failed payment for customer ${customerId}`);
    
    // Get customer email
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = customer.email;
    
    if (!customerEmail) {
      throw new Error('No customer email found');
    }
    
    // Not updating premium status yet, as they may pay later
    // Just log the event for now
    console.log(`Payment failed for ${customerEmail}`);
    
    // Store record of payment failure
    if (db) {
      try {
        await db.collection('payment_failures').add({
          email: customerEmail,
          customerId,
          subscriptionId,
          invoiceId: invoice.id,
          timestamp: new Date().toISOString(),
          attempt: invoice.attempt_count,
        });
      } catch (error) {
        console.error('Error storing payment failure record:', error);
      }
    }
  } catch (error) {
    console.error('Error processing invoice payment failure:', error);
    throw error;
  }
}

/**
 * Update premium status in Firestore and Firebase Auth
 */
async function updatePremiumStatus(db, auth, {
  email,
  isPremium,
  subscriptionStatus,
  subscriptionId,
  customerId,
  sessionId,
  source,
  cancelAtPeriodEnd,
  subscriptionPeriodEnd,
  subscriptionItems
}) {
  try {
    // Normalize email and create safe document ID
    const normalizedEmail = email.toLowerCase();
    const emailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
    const timestamp = new Date().toISOString();
    
    console.log(`Updating premium status for ${normalizedEmail} to ${isPremium}`);
    
    // Create data object, filtering out undefined values
    const data = {
      email: normalizedEmail,
      isPremium,
      updatedAt: timestamp
    };
    
    // Only add these fields if they are defined
    if (isPremium) {
      data.premiumSince = data.premiumSince || timestamp;
    }
    
    if (subscriptionStatus) data.subscriptionStatus = subscriptionStatus;
    if (subscriptionId) data.subscriptionId = subscriptionId;
    if (customerId) data.customerId = customerId;
    if (sessionId) data.sessionId = sessionId;
    if (cancelAtPeriodEnd !== undefined) data.cancelAtPeriodEnd = cancelAtPeriodEnd;
    if (subscriptionPeriodEnd) data.subscriptionPeriodEnd = subscriptionPeriodEnd;
    if (subscriptionItems) data.subscriptionItems = subscriptionItems;
    data.source = source || 'webhook';
    
    // Update or create document in paid_emails collection
    console.log(`Updating paid_emails record for ${normalizedEmail}`);
    await db.collection('paid_emails').doc(emailKey).set(data, { merge: true });
    
    // Check if user exists in Firebase Auth and update their custom claims
    try {
      const userRecord = await auth.getUserByEmail(normalizedEmail)
        .catch(() => null); // Ignore "user not found" error
      
      if (userRecord) {
        console.log(`User found in Auth, updating custom claims for ${normalizedEmail}`);
        
        // Update custom claims
        await auth.setCustomUserClaims(userRecord.uid, {
          isPremium,
          ...(isPremium ? { premiumSince: data.premiumSince } : {}),
          ...(cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd } : {}),
          updatedAt: timestamp
        });
        
        // Also update user document in Firestore
        const userData = {
          isPremium,
          ...(isPremium ? { premiumSince: data.premiumSince } : {}),
          ...(cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd } : {}),
          email: normalizedEmail,
          updatedAt: timestamp,
          lastPremiumUpdate: {
            source: source || 'webhook',
            timestamp
          }
        };
        
        await db.collection('users').doc(userRecord.uid).set(userData, { merge: true });
        console.log(`Updated Firestore user document for ${normalizedEmail}`);
      } else {
        console.log(`No user account found for ${normalizedEmail} yet`);
      }
    } catch (authError) {
      console.error(`Error updating Auth for ${normalizedEmail}:`, authError);
      // We'll continue anyway, as the paid_emails record is the source of truth for unregistered users
    }
    
    console.log(`Premium status updated for ${normalizedEmail}`);
  } catch (error) {
    console.error(`Error updating premium status for ${email}:`, error);
    
    // Special handling for specific Firebase errors
    if (error.code === 'app/no-app' || 
        error.code === 'app/duplicate-app' ||
        error.code?.includes('firestore')) {
      
      console.log('Detected Firebase-specific error, logging...');
      await logErrorToConsole('firebase_error', error.message, {
        email,
        error: error.toString(),
        stack: error.stack
      });
    }
    
    throw error;
  }
}

/**
 * Log error to console with structured format
 * This is a fallback method when Firestore is not available
 */
async function logErrorToConsole(errorType, errorMessage, additionalData = {}) {
  try {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: errorMessage,
      ...additionalData
    };
    
    console.error('STRUCTURED_ERROR_LOG:', JSON.stringify(errorLog));
    
    // Try to log to Firestore if available
    try {
      const { db } = initializeFirebaseAdmin('error-logger');
      if (db) {
        await db.collection('webhook_errors').add(errorLog);
      }
    } catch (dbError) {
      console.error('Failed to log error to Firestore:', dbError);
    }
  } catch (e) {
    console.error('Error in error logger:', e);
  }
}