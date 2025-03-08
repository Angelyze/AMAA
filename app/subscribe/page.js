"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import "../globals.css";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function Subscribe() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    // Check URL parameters for success and email
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success") === "true") {
      setPaymentCompleted(true);
      const emailParam = urlParams.get("email");
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
      }
    }
    
    // If user is already premium, redirect to home
    if (session?.user?.isPremium) {
      router.push("/");
    }
  }, [session, router]);

  const handleSubscribe = async () => {
    setLoading(true);
    
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: session?.user?.email || email || "",
          returnUrl: window.location.origin + "/subscribe?success=true&email=" + 
            encodeURIComponent(session?.user?.email || email || "")
        }),
      });

      const { id: sessionId } = await response.json();
      const stripe = await stripePromise;
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = (provider) => {
    signIn(provider);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  return (
    <div className="container">
      <div className="subscribe-container">
        <h2>Upgrade to AMAA Premium</h2>
        <p>Enjoy ad-free answers and save your conversations for only $5/month.</p>
        
        {paymentCompleted ? (
          <div>
            <h3>Payment Successful!</h3>
            <p>Please sign in to access your premium account:</p>
            <div className="auth-buttons">
              <button onClick={() => handleSignIn("google")} className="auth-button">
                Sign in with Google
              </button>
              <button onClick={() => handleSignIn("facebook")} className="auth-button">
                Sign in with Facebook
              </button>
              <button onClick={() => handleSignIn("twitter")} className="auth-button">
                Sign in with X
              </button>
            </div>
          </div>
        ) : (
          <>
            {!session && (
              <div className="email-input-container">
                <p>Enter your email to continue:</p>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Your email address"
                  className="email-input"
                />
              </div>
            )}
            <button 
              onClick={handleSubscribe} 
              disabled={loading || (!session && !email)} 
              className="subscribe-btn"
            >
              {loading ? "Processing..." : "Subscribe Now"}
            </button>
          </>
        )}
        
        <p className="back-link">
          <a href="/">Back to Home</a>
        </p>
      </div>
    </div>
  );
}