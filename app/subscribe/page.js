"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../providers";
import { useRouter } from "next/navigation";
import "../globals.css";

export default function Subscribe() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    // Remove dark theme if it's applied
    document.documentElement.classList.remove('dark-theme');
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    
    try {
      // If user is already logged in and premium, just redirect to home
      if (user?.isPremium) {
        alert('You are already a premium user!');
        router.push('/');
        return;
      }
      
      // If user is logged in, use their email
      if (user) {
        // Create Stripe checkout session with the logged-in user's email
        await createCheckoutSession(user.email, user.uid || '');
        return;
      }
      
      // If not logged in and email form is showing, validate and proceed
      if (showEmailForm) {
        if (!email || !email.includes('@')) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }
        
        // Create checkout session with the provided email
        await createCheckoutSession(email);
        return;
      }
      
      // If not logged in and email form is not showing, show the email form
      setShowEmailForm(true);
      setLoading(false);
    } catch (error) {
      console.error('Error in subscription process:', error);
      setError('Failed to process your request. Please try again.');
      setLoading(false);
    }
  };

  const createCheckoutSession = async (email, uid = '') => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, uid }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setError('Failed to redirect to checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="subscribe-container" style={{ maxWidth: '600px', margin: '50px auto', padding: '30px', textAlign: 'center' }}>
        <img src="/AMAA.png" alt="AMAA Logo" style={{ width: '200px', marginBottom: '20px' }} />
        <h2>Try AMAA Premium Free</h2>
        <p>Get a 7-day free trial, then just $5/month for premium features.</p>
        
        <div style={{ textAlign: 'left', margin: '20px 0', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Premium Features:</h3>
          <ul>
            <li>Save and manage your conversations</li>
            <li>Multiple high-quality text-to-speech voices</li>
            <li>Theme customization options</li>
            <li>Priority support</li>
          </ul>
        </div>
        
        {error && <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>{error}</div>}
        
        {showEmailForm && !user && (
          <div style={{ margin: '20px 0' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                marginBottom: '10px',
                fontSize: '16px'
              }}
              required
            />
          </div>
        )}
        
        <button 
          className="subscribe-btn" 
          onClick={handleSubscribe}
          disabled={loading}
          style={{ 
            padding: '20px 40px',
            fontSize: '16px', 
            marginTop: '20px',
            background: '#0097b2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Processing...' : showEmailForm ? 'Subscribe Now' : 'Get Premium Access'}
        </button>
        
        <div style={{ marginTop: '20px' }}>
          {user ? (
            <p>Signed in as {user.email}</p>
          ) : (
            <p>
              Already have an account? <a href="/auth/signin" style={{ color: '#0097b2' }}>Sign in</a>
            </p>
          )}
        </div>
        
        <div style={{ marginTop: '10px' }}>
          <a href="/" style={{ color: '#0097b2', textDecoration: 'none' }}>
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}