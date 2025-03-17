'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFirebaseAuth } from '@/app/providers/FirebaseAuthProvider';

// Create a dedicated component that uses searchParams
function SubscriptionSuccessContent() {
  const { user } = useFirebaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('Verifying your subscription...');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const emailParam = searchParams.get('email') || user?.email;
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (sessionId) {
      verifySubscription(sessionId, emailParam);
    } else {
      setLoading(false);
      setError('No session ID found. Cannot verify subscription.');
    }
  }, [searchParams, user]);
  
  const verifySubscription = async (sessionId, email) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/verify-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, email }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVerified(true);
        
        if (user) {
          // User is logged in
          setMessage(`Thank you for your subscription! Your premium access has been activated for ${data.email || email}.`);
        } else {
          // User is not logged in
          setMessage('Thank you for your subscription! Follow the instructions below to complete your registration.');
          setEmail(data.email || email);
        }
      } else {
        setError(data.error || 'Could not verify your subscription. Please contact support.');
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
      setError('An error occurred while verifying your subscription. Please contact support.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Subscription Successful</h1>
        
        {loading ? (
          <div className="text-center py-4">
            <p>{message}</p>
          </div>
        ) : error ? (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
            <div className="mt-4 text-center">
              <Link href="/support" className="text-blue-600 hover:underline">
                Contact Support
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
              <p>{message}</p>
            </div>
            
            {verified && !user && email && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Next Steps</h2>
                <p className="mb-4">
                  To access your premium features, please complete your account setup:
                </p>
                
                <Link 
                  href={`/auth/register-premium?email=${encodeURIComponent(email)}`}
                  className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                >
                  Complete Registration
                </Link>
                
                <p className="text-sm text-gray-600">
                  Already have an account? 
                  <Link href="/auth/signin" className="text-blue-600 hover:underline ml-1">
                    Sign in here
                  </Link>
                </p>
              </div>
            )}
            
            {verified && user && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Access Premium Features</h2>
                <p className="mb-4">
                  Your premium status is now active. You can now access all premium features.
                </p>
                
                <Link 
                  href="/dashboard"
                  className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}
            
            <div className="text-center mt-4">
              <Link href="/" className="text-blue-600 hover:underline">
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Verifying subscription...</h1>
          <div className="text-center py-4">
            <p>Please wait while we verify your purchase...</p>
          </div>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
} 