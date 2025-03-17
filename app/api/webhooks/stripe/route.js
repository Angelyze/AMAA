import { NextResponse } from "next/server";
import Stripe from "stripe";
import { initializeFirebaseAdmin, setUserPremiumStatus } from '../../../utils/firebaseAdmin';
import { isTestPremiumEmail } from '../../../utils/config';

// Route segment configuration for App Router
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    
    if (!signature) {
      return NextResponse.json({ success: false, error: "Missing Stripe signature" }, { status: 400 });
    }
    
    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    
    console.log("Webhook received:", event.type);
    
    // Process the event
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object);
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionUpdate(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      return NextResponse.json({ success: true, received: true });
    } catch (eventError) {
      console.error(`Error processing ${event.type}:`, eventError);
      
      // Return 200 anyway to prevent Stripe from retrying
      return NextResponse.json({ 
        success: true, 
        warning: "Event processing had errors but was acknowledged" 
      });
    }
  } catch (error) {
    console.error("Webhook critical error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Handle checkout completed event
async function handleCheckoutCompleted(session) {
  if (!session?.customer_email) {
    console.log("No customer email in session");
    return;
  }
  
  const email = session.customer_email.toLowerCase();
  console.log(`Checkout completed for ${email}`);
  
  // Basic email validation
  if (!email.includes('@')) {
    console.error(`Invalid email format: ${email}`);
    return;
  }
  
  // Log the premium status (for debugging and as a backup record)
  console.log(`✅ PREMIUM USER: ${email} - checkout.session.completed`);

  // Try to set custom claims in Firebase Auth
  try {
    const { auth, db } = initializeFirebaseAdmin('stripe-webhook');
    if (!auth) {
      console.error("Firebase Auth initialization failed");
      return;
    }
    
    try {
      // Try to find the user by email
      const userRecord = await auth.getUserByEmail(email)
        .catch(err => {
          console.log(`User not found in Firebase Auth: ${email}`);
          return null;
        });
      
      if (userRecord) {
        // Set custom claims to mark user as premium
        await setUserPremiumStatus(userRecord.uid, true);
        console.log(`Updated premium status for user: ${email}`);
        
        // Also update in Firestore for backward compatibility
        if (db) {
          try {
            await db.collection('users').doc(userRecord.uid).update({
              isPremium: true,
              premiumSince: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            
            console.log(`Updated Firestore record for user: ${email}`);
          } catch (firestoreError) {
            console.error(`Error updating Firestore record:`, firestoreError);
            // Continue anyway as Auth claims are the source of truth
          }
        }
      } else {
        // If user doesn't exist yet, store their email in Firestore
        if (db) {
          try {
            const safeEmailKey = email.replace(/[.#$\/\[\]]/g, '_');
            
            await db.collection('paid_emails').doc(safeEmailKey).set({
              email: email,
              isPremium: true,
              premiumSince: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              registered: false
            });
            
            console.log(`Stored premium status for future user: ${email}`);
          } catch (storeError) {
            console.error('Error storing premium email:', storeError);
          }
        }
        
        console.log(`User ${email} not registered yet. Will be premium upon signup.`);
      }
    } catch (authError) {
      console.error(`Error updating user claims:`, authError);
    }
  } catch (error) {
    console.error("Error in handleCheckoutCompleted:", error);
  }
}

// Handle subscription update event
async function handleSubscriptionUpdate(subscription) {
  try {
    // Get customer email from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const customer = subscription.customer;
    
    if (!customer) {
      console.log("No customer in subscription");
      return;
    }
    
    const customerData = await stripe.customers.retrieve(customer);
    const email = customerData.email?.toLowerCase();
    
    if (!email) {
      console.log("No email found for customer:", customer);
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
    
    // Update Firebase Auth custom claims
    try {
      const { auth, db } = initializeFirebaseAdmin('stripe-subscription');
      if (!auth) {
        console.error("Firebase Auth initialization failed");
        return;
      }
      
      const userRecord = await auth.getUserByEmail(email)
        .catch(err => {
          console.log(`User not found in Firebase Auth: ${email}`);
          return null;
        });
      
      if (userRecord) {
        // Set custom claims based on subscription status
        await auth.setCustomUserClaims(userRecord.uid, { 
          isPremium: isPremium,
          subscriptionStatus: subscription.status,
          updatedAt: new Date().toISOString(),
          ...(isPremium ? { premiumSince: new Date().toISOString() } : {})
        });
        
        console.log(`Updated subscription status for user: ${email}`);
        
        // Also update Firestore for backward compatibility
        if (db) {
          try {
            await db.collection('users').doc(userRecord.uid).update({
              isPremium: isPremium,
              subscriptionStatus: subscription.status,
              updatedAt: new Date().toISOString()
            });
            
            console.log(`Updated Firestore record for user: ${email}`);
          } catch (firestoreError) {
            console.error(`Error updating Firestore record:`, firestoreError);
            // Continue anyway as Auth claims are the source of truth
          }
        }
      } else {
        // Store in paid_emails collection for when they register
        if (db && isPremium) {
          try {
            const safeEmailKey = email.replace(/[.#$\/\[\]]/g, '_');
            
            await db.collection('paid_emails').doc(safeEmailKey).set({
              email: email,
              isPremium: true,
              subscriptionStatus: subscription.status,
              premiumSince: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              registered: false
            }, { merge: true });
            
            console.log(`Stored subscription status for future user: ${email}`);
          } catch (storeError) {
            console.error('Error storing subscription data:', storeError);
          }
        }
      }
    } catch (authError) {
      console.error(`Error updating user claims:`, authError);
    }
  } catch (error) {
    console.error("Error in handleSubscriptionUpdate:", error);
  }
}