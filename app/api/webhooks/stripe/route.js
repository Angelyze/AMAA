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
  // Store payload for debugging if needed
  let payload;
  let eventType = 'unknown';
  
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    
    // Store the raw payload for error reporting
    payload = body.substring(0, 1000); // First 1000 chars for debugging
    
    if (!signature) {
      console.error('Missing Stripe signature in webhook request');
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }
    
    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      eventType = event.type;
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    console.log(`Webhook received: ${event.type} (id: ${event.id})`);
    
    // Process the event - each handler manages its own errors and writes to database
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object, stripe);
          break;
          
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionUpdate(event.data.object, stripe);
          break;
          
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object, stripe);
          break;
          
        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(event.data.object, stripe);
          break;
          
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object, stripe);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      // Always acknowledge receipt of the event to Stripe
      return NextResponse.json({ 
        received: true, 
        type: event.type,
        id: event.id
      });
      
    } catch (eventError) {
      // Log error but return 200 to Stripe to prevent retries
      console.error(`Error processing ${event.type} (id: ${event.id}):`, eventError);
      
      // Try to store the error in Firestore for debugging
      try {
        const { db } = initializeFirebaseAdmin('stripe-webhook-error');
        if (db) {
          await db.collection('webhook_errors').add({
            stripeEventId: event.id,
            stripeEventType: event.type,
            error: eventError.message,
            stack: eventError.stack,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (dbError) {
        console.error('Error storing webhook error:', dbError);
      }
      
      // Return 200 anyway to acknowledge receipt
      return NextResponse.json({ 
        received: true, 
        warning: "Event processing had errors but was acknowledged",
        type: event.type,
        id: event.id 
      });
    }
  } catch (error) {
    // Critical error in webhook processing
    console.error("Critical webhook error:", error);
    
    // Try to record the error
    try {
      const { db } = initializeFirebaseAdmin('stripe-webhook-critical');
      if (db) {
        await db.collection('webhook_errors').add({
          error: error.message,
          stack: error.stack,
          payload: payload || 'unknown',
          eventType: eventType || 'unknown',
          timestamp: new Date().toISOString(),
          isCritical: true
        });
      }
    } catch (dbError) {
      console.error('Error storing critical webhook error:', dbError);
    }
    
    // Return 200 anyway - we don't want Stripe to retry as that won't help
    return NextResponse.json({ 
      received: true, 
      critical_error: "Webhook processing failed but was acknowledged"
    });
  }
}

/**
 * Handle 'checkout.session.completed' event
 * 
 * This is triggered when a customer completes checkout
 */
async function handleCheckoutCompleted(session, stripe) {
  if (!session?.customer_email) {
    console.log("No customer email in session");
    return;
  }
  
  const email = session.customer_email.toLowerCase();
  console.log(`Checkout completed for ${email}`);
  
  // Log the premium status (for debugging and as a backup record)
  console.log(`✅ PREMIUM USER: ${email} - checkout.session.completed`);

  // A new user has become premium, update their status
  try {
    const { db } = initializeFirebaseAdmin('stripe-checkout');
    if (!db) {
      throw new Error("Firebase DB initialization failed");
    }
    
    // Get subscription details if available
    let subscriptionData = {};
    if (session.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        subscriptionData = {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionItems: subscription.items.data.map(item => ({
            id: item.id,
            price: item.price.id,
            productId: item.price.product
          }))
        };
      } catch (subError) {
        console.error('Error retrieving subscription:', subError);
        // Continue without subscription details
      }
    }
    
    // Update the user's premium status in Firestore
    await updatePremiumStatus(email, true, {
      source: 'stripe_checkout',
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      ...subscriptionData
    }, db);
    
  } catch (error) {
    console.error("Error in handleCheckoutCompleted:", error);
    // Re-throw to be handled by the main handler
    throw error;
  }
}

/**
 * Handle subscription update event
 */
async function handleSubscriptionUpdate(subscription, stripe) {
  try {
    // Get customer email from Stripe
    if (!subscription.customer) {
      console.log("No customer in subscription");
      return;
    }
    
    // Get customer details to find email
    const customerData = await stripe.customers.retrieve(subscription.customer);
    const email = customerData.email?.toLowerCase();
    
    if (!email) {
      console.log("No email found for customer:", subscription.customer);
      return;
    }
    
    const isPremium = subscription.status === 'active' || subscription.status === 'trialing';
    console.log(`Subscription ${subscription.id} for ${email} is now ${subscription.status}`);
    
    // Log the subscription status
    if (isPremium) {
      console.log(`✅ PREMIUM USER: ${email} - subscription.${subscription.status}`);
    } else {
      console.log(`❌ NON-PREMIUM USER: ${email} - subscription.${subscription.status}`);
    }
    
    // Update premium status in Firestore
    const { db } = initializeFirebaseAdmin('stripe-subscription');
    if (!db) {
      throw new Error("Firebase DB initialization failed");
    }
    
    await updatePremiumStatus(email, isPremium, {
      source: 'stripe_subscription_update',
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      customerId: subscription.customer
    }, db);
    
  } catch (error) {
    console.error("Error in handleSubscriptionUpdate:", error);
    throw error;
  }
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription, stripe) {
  try {
    // Get customer email from Stripe
    if (!subscription.customer) {
      console.log("No customer in deleted subscription");
      return;
    }
    
    // Get customer details to find email
    const customerData = await stripe.customers.retrieve(subscription.customer);
    const email = customerData.email?.toLowerCase();
    
    if (!email) {
      console.log("No email found for customer:", subscription.customer);
      return;
    }
    
    console.log(`Subscription ${subscription.id} for ${email} has been deleted`);
    console.log(`❌ NON-PREMIUM USER: ${email} - subscription.deleted`);
    
    // Update premium status to false in Firestore
    const { db } = initializeFirebaseAdmin('stripe-subscription-deleted');
    if (!db) {
      throw new Error("Firebase DB initialization failed");
    }
    
    await updatePremiumStatus(email, false, {
      source: 'stripe_subscription_deleted',
      subscriptionId: subscription.id,
      subscriptionStatus: 'deleted',
      customerId: subscription.customer,
      canceledAt: new Date().toISOString()
    }, db);
    
  } catch (error) {
    console.error("Error in handleSubscriptionDeleted:", error);
    throw error;
  }
}

/**
 * Handle invoice payment succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice, stripe) {
  try {
    // Get subscription from invoice
    if (!invoice.subscription || !invoice.customer) {
      console.log("No subscription or customer in invoice");
      return;
    }
    
    // Get customer details
    const customerData = await stripe.customers.retrieve(invoice.customer);
    const email = customerData.email?.toLowerCase();
    
    if (!email) {
      console.log("No email found for customer:", invoice.customer);
      return;
    }
    
    console.log(`Invoice payment succeeded for ${email} (subscription: ${invoice.subscription})`);
    console.log(`✅ PREMIUM USER: ${email} - invoice.payment_succeeded`);
    
    // Update premium status to true in Firestore
    const { db } = initializeFirebaseAdmin('stripe-invoice-succeeded');
    if (!db) {
      throw new Error("Firebase DB initialization failed");
    }
    
    await updatePremiumStatus(email, true, {
      source: 'stripe_invoice_succeeded',
      subscriptionId: invoice.subscription,
      invoiceId: invoice.id,
      customerId: invoice.customer
    }, db);
    
  } catch (error) {
    console.error("Error in handleInvoicePaymentSucceeded:", error);
    throw error;
  }
}

/**
 * Handle invoice payment failed event
 */
async function handleInvoicePaymentFailed(invoice, stripe) {
  try {
    // Get subscription from invoice
    if (!invoice.subscription || !invoice.customer) {
      console.log("No subscription or customer in failed invoice");
      return;
    }
    
    // Get customer details
    const customerData = await stripe.customers.retrieve(invoice.customer);
    const email = customerData.email?.toLowerCase();
    
    if (!email) {
      console.log("No email found for customer:", invoice.customer);
      return;
    }
    
    console.log(`Invoice payment failed for ${email} (subscription: ${invoice.subscription})`);
    console.log(`⚠️ WARNING: Payment failed for ${email} - invoice.payment_failed`);
    
    // Don't update premium status yet - give the user time to fix their payment
    // Just log the event for now
    const { db } = initializeFirebaseAdmin('stripe-invoice-failed');
    if (!db) {
      throw new Error("Firebase DB initialization failed");
    }
    
    // Record the payment failure in the database
    await db.collection('payment_failures').add({
      email: email,
      customerId: invoice.customer,
      subscriptionId: invoice.subscription,
      invoiceId: invoice.id,
      timestamp: new Date().toISOString(),
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: invoice.status,
      attemptCount: invoice.attempt_count,
      nextPaymentAttempt: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null
    });
    
  } catch (error) {
    console.error("Error in handleInvoicePaymentFailed:", error);
    throw error;
  }
}

/**
 * Update premium status for a user by email in database
 */
async function updatePremiumStatus(email, isPremium, metadata = {}, db) {
  if (!email) {
    console.error('Email is required for updatePremiumStatus');
    return;
  }

  try {
    // Create an email key for Firestore
    const emailKey = email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
    const timestamp = new Date().toISOString();
    
    // Create the data object, filtering out undefined values
    const data = {
      email: email.toLowerCase(),
      isPremium,
      updatedAt: timestamp,
      // If becoming premium, set premiumSince if not already set
      ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {}),
      // Only add these fields if they're defined
      ...(metadata.subscriptionStatus ? { subscriptionStatus: metadata.subscriptionStatus } : {}),
      ...(metadata.subscriptionId ? { subscriptionId: metadata.subscriptionId } : {}),
      ...(metadata.customerId ? { customerId: metadata.customerId } : {}),
      ...(metadata.source ? { source: metadata.source || 'webhook' } : { source: 'webhook' }),
      ...(metadata.sessionId ? { sessionId: metadata.sessionId } : {}),
      lastWebhookAt: timestamp
    };
    
    // Update the paid_emails collection
    await db.collection('paid_emails').doc(emailKey).set(data, { merge: true });
    
    console.log(`Updated premium status for ${email} to ${isPremium} in paid_emails`);
    
    // Try to update Firebase Auth user if they exist
    try {
      const { auth } = initializeFirebaseAdmin('premium-update');
      
      if (auth) {
        const userRecord = await auth.getUserByEmail(email.toLowerCase())
          .catch(() => null); // Catch "user not found" error
        
        if (userRecord) {
          // Set custom claims for premium status
          await auth.setCustomUserClaims(userRecord.uid, { 
            isPremium,
            updatedAt: timestamp,
            ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {})
          });
          
          console.log(`Updated Auth claims for ${email}`);
          
          // Also update the Firestore user document
          try {
            const userData = {
              isPremium,
              updatedAt: timestamp,
              ...(isPremium ? { premiumSince: metadata.premiumSince || timestamp } : {}),
              lastSubscriptionUpdate: {
                timestamp,
                source: metadata.source || 'webhook',
                ...(metadata.subscriptionId ? { subscriptionId: metadata.subscriptionId } : {}),
                ...(metadata.subscriptionStatus ? { subscriptionStatus: metadata.subscriptionStatus } : {})
              }
            };
            
            await db.collection('users').doc(userRecord.uid).update(userData);
            
            console.log(`Updated users collection for ${email}`);
          } catch (userUpdateError) {
            console.error(`Error updating users collection for ${email}:`, userUpdateError);
            // Continue as Auth claims are the source of truth
          }
        } else {
          console.log(`User ${email} not found in Auth. Premium status saved in paid_emails.`);
        }
      }
    } catch (authError) {
      console.error(`Error updating Auth claims for ${email}:`, authError);
      // Continue as we've already updated Firestore
    }
    
    return { success: true, email };
  } catch (error) {
    console.error(`Error in updatePremiumStatus for ${email}:`, error);
    throw error;
  }
}