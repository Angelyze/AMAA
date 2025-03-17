import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { email, uid } = await request.json();
    
    // Validate request
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required for subscription' },
        { status: 400 }
      );
    }
    
    // Create a checkout session with trial period
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: {
          userEmail: email,
          uid: uid || '' // Include Firebase UID if available
        }
      },
      success_url: `${process.env.NEXTAUTH_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}&premium=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscribe/cancel`,
      customer_email: email,
      metadata: {
        userEmail: email,
        uid: uid || '', // Include Firebase UID if available
        purchaseType: 'premium_subscription'
      },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}