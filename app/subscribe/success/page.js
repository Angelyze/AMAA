'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFirebaseAuth } from '@/app/providers/FirebaseAuthProvider';
import { enqueueSubscriptionVerification, getTaskById } from '@/app/utils/subscriptionQueue';

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
  const [taskId, setTaskId] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [manuallyVerified, setManuallyVerified] = useState(false);
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const emailParam = searchParams.get('email') || user?.email;
    const premiumParam = searchParams.get('premium');
    
    if (emailParam) {
      setEmail(emailParam);
      
      // If premium=true is present in the URL, consider it manually verified
      if (premiumParam === 'true') {
        setManuallyVerified(true);
        setVerified(true);
        setLoading(false);
        setMessage(`Premium status for ${emailParam} has been manually verified.`);
        return;
      }
    }
    
    if (sessionId) {
      verifySubscription(sessionId, emailParam);
    } else {
      setLoading(false);
      setError('No session ID found. Cannot verify subscription.');
    }
  }, [searchParams, user]);
  
  useEffect(() => {
    // Poll for task status updates if we have a task ID
    if (taskId) {
      const interval = setInterval(() => {
        checkTaskStatus(taskId);
      }, 2000); // Check every 2 seconds
      
      return () => clearInterval(interval);
    }
  }, [taskId]);
  
  const checkTaskStatus = (id) => {
    const task = getTaskById(id);
    
    if (task) {
      if (task.status === 'completed') {
        setVerified(true);
        setLoading(false);
        if (task.result?.email) {
          setEmail(task.result.email);
        }
        setMessage(`Thank you for your subscription! Your premium access has been activated.`);
        clearInterval(); // Stop polling
      } else if (task.status === 'failed' || task.status === 'failed_permanent') {
        if (task.retries >= 5) {
          setError(`Verification failed after multiple attempts. Please try signing in directly or contact support. (${task.lastError || 'Unknown error'})`);
          setLoading(false);
          setShowRetry(false);
          clearInterval(); // Stop polling
        } else {
          setShowRetry(true);
        }
      }
    }
  };
  
  const verifySubscription = async (sessionId, userEmail) => {
    try {
      setLoading(true);
      setShowRetry(false);
      
      // First, try the direct API call with a timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('/api/verify-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, email: userEmail }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success) {
            setVerified(true);
            setEmail(data.email || userEmail);
            setMessage(`Thank you for your subscription! Your premium access has been activated.`);
            return; // Success, exit early
          }
        }
        
        // If we get here, the direct approach failed but didn't throw,
        // so continue to the queue approach
      } catch (directError) {
        console.log('Direct API call failed, falling back to queue:', directError);
        // Continue to queue approach
      }
      
      // Use the queue system as a backup approach
      console.log('Using queue system for subscription verification');
      const newTaskId = enqueueSubscriptionVerification(sessionId, userEmail || email, {
        source: 'subscription_success_page',
        url: window.location.href
      });
      
      if (newTaskId) {
        setTaskId(newTaskId);
        setMessage('Subscription verification in progress. This may take a moment...');
        
        // Store task info in sessionStorage for retry after page reload
        sessionStorage.setItem('subscription_task', JSON.stringify({
          id: newTaskId,
          sessionId,
          email: userEmail || email,
          timestamp: Date.now()
        }));
      } else {
        throw new Error('Failed to enqueue verification task');
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
      setError('An error occurred while verifying your subscription. Please try again or contact support.');
      setShowRetry(true);
      setLoading(false);
    }
  };
  
  const handleRetry = () => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      setRetryCount(count => count + 1);
      verifySubscription(sessionId, email);
    } else {
      setError('No session ID available for retry');
    }
  };
  
  const handleManualVerification = () => {
    // Store the email in localStorage as pending premium
    try {
      const pendingEmails = JSON.parse(localStorage.getItem('pendingPremiumEmails') || '[]');
      if (!pendingEmails.includes(email)) {
        pendingEmails.push(email);
        localStorage.setItem('pendingPremiumEmails', JSON.stringify(pendingEmails));
      }
    } catch (e) {
      console.error('Error storing pending premium email:', e);
    }
    
    // Redirect to registration with the premium flag
    router.push(`/auth/register-premium?email=${encodeURIComponent(email)}&premium=true`);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Subscription Successful</h1>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="mb-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            </div>
            <p>{message}</p>
            {retryCount > 0 && <p className="text-sm text-gray-500 mt-2">Retry attempt {retryCount}/5</p>}
          </div>
        ) : error ? (
          <div className="mb-6">
            <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
              <p>{error}</p>
            </div>
            
            {showRetry && (
              <button 
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                disabled={retryCount >= 5}
              >
                Retry Verification
              </button>
            )}
            
            <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg mb-4">
              <p className="font-semibold">Alternative Options:</p>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Wait a few minutes and refresh this page</li>
                <li>Try signing in with your email and password</li>
                <li>Click "Complete Registration" below to continue</li>
              </ul>
            </div>
            
            <div className="text-center mt-4">
              <button
                onClick={handleManualVerification}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-center hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mb-4"
              >
                Complete Registration
              </button>
              
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
                  href={`/auth/register-premium?email=${encodeURIComponent(email)}&premium=true`}
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
                  href="/"
                  className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md text-center hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mb-4"
                >
                  Start Using Premium
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
            <div className="mb-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Loading...
                </span>
              </div>
            </div>
            <p>Please wait while we verify your purchase...</p>
          </div>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
} 