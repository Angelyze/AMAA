import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { email, returnUrl } = await req.json();
    
    console.log("Creating checkout session for:", email);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: returnUrl || `${req.headers.get("origin")}/subscribe?success=true&email=${encodeURIComponent(email)}`,
      cancel_url: `${req.headers.get("origin")}/subscribe?canceled=true`,
      metadata: {
        userEmail: email,
      },
    });
    
    console.log("Checkout session created:", session.id);
    
    return NextResponse.json({ id: session.id });
  } catch (err) {
    console.error("Error creating checkout session:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}