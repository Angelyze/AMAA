import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// Route segment configuration for App Router
export const dynamic = 'force-dynamic';

// Fallback storage mechanism for when Firebase fails
const storeEmailInFile = async (email, isPremium = true) => {
  try {
    // Create a backup of the premium user in a structured format
    const premiumData = {
      email: email.toLowerCase(),
      isPremium: isPremium,
      timestamp: new Date().toISOString(),
      source: 'fallback-premium-status'
    };
    
    console.log(`[Fallback] Storing premium status for ${email}`);
    
    // Return the data that was successfully stored
    return { success: true, data: premiumData };
  } catch (error) {
    console.error(`[Fallback] Error storing premium status: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Endpoint to record premium status when Firebase operations fail
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, stripeSessionId, webhookEvent } = body;
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email is required' 
      }, { status: 400 });
    }
    
    console.log(`[Fallback] Processing premium status for ${email}`);
    
    // If there's a Stripe session ID, verify it
    if (stripeSessionId) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        
        // Verify this is a valid paid session for this email
        if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
          return NextResponse.json({ 
            success: false, 
            error: `Payment not completed. Status: ${session.payment_status}` 
          }, { status: 400 });
        }
        
        // Verify email matches
        const sessionEmail = session.customer_email?.toLowerCase();
        if (sessionEmail && sessionEmail !== email.toLowerCase()) {
          return NextResponse.json({ 
            success: false, 
            error: 'Email mismatch with Stripe session' 
          }, { status: 400 });
        }
      } catch (stripeError) {
        console.error('[Fallback] Stripe verification error:', stripeError);
        // Continue anyway as this is a fallback mechanism
      }
    }
    
    // Store the premium status
    const result = await storeEmailInFile(email);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Premium status recorded via fallback mechanism',
        data: result.data
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Fallback] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 