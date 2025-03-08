import { NextResponse } from "next/server";
import Stripe from "stripe";
import { get, set } from '@vercel/edge-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }
  
  console.log("Received Stripe webhook event:", event.type);
  
  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userEmail = session.metadata.userEmail;
    
    console.log("Checkout completed for user:", userEmail);
    
    try {
      // Get current premium users
      const premiumUsers = await get('premium_users') || [];
      
      // Add new premium user if not already in the list
      if (!premiumUsers.includes(userEmail)) {
        const updatedPremiumUsers = [...premiumUsers, userEmail];
        
        // Update Edge Config
        await set('premium_users', updatedPremiumUsers);
        
        console.log(`User ${userEmail} upgraded to premium`);
      } else {
        console.log(`User ${userEmail} is already premium`);
      }
    } catch (error) {
      console.error("Edge Config error:", error);
    }
  }
  
  return NextResponse.json({ received: true });
}