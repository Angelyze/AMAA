'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFirebaseAuth } from '@/app/providers/FirebaseAuthProvider';

// Create a dedicated component that uses searchParams
function RegisterPremiumContent() {
  const { signUp, user, loading: authLoading, signIn } = useFirebaseAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [verificationDetails, setVerificationDetails] = useState(null);
  
  // Get email from URL parameters and verify it's eligible
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      verifyPremiumEligibility(emailParam);
    } else {
      setVerifying(false);
      setError('No email provided. Please use the link from your confirmation email.');
    }
    
    // Redirect if already logged in
    if (user) {
      router.push('/dashboard');
    }
  }, [searchParams, user, router]);
  
  const verifyPremiumEligibility = async (email) => {
    try {
      setVerifying(true);
      console.log(`Verifying premium eligibility for: ${email}`);
      
      // Call our API to verify if this email has paid for premium
      const response = await fetch('/api/verify-premium-eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      console.log('Verification response:', data);
      
      if (data.eligible) {
        setVerified(true);
        setVerificationDetails(data);
      } else {
        setError(`This email (${email}) is not eligible for premium registration. Please purchase a premium subscription first.`);
        console.log('Verification failed:', data.error || 'Not eligible');
      }
    } catch (error) {
      console.error('Error verifying premium eligibility:', error);
      setError('Error verifying premium status. Please try again or contact support.');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!verified) {
      setError('Please verify your premium status first.');
      return;
    }
    
    // Validate input
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log(`Registering premium user: ${email}`);
      
      // First try client-side registration
      let result;
      try {
        result = await signUp(email, password, name);
        console.log('Client-side registration result:', result);
      } catch (clientError) {
        console.error('Client-side registration failed:', clientError);
        // If client-side fails, we'll try server-side as fallback
        result = { success: false, error: clientError.message };
      }
      
      // If client-side registration failed, try server-side
      if (!result.success) {
        console.log('Attempting server-side registration as fallback');
        try {
          const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              displayName: name
            }),
          });
          
          const serverResult = await response.json();
          console.log('Server-side registration result:', serverResult);
          
          if (serverResult.success) {
            // If server-side registration succeeded, try to sign in
            try {
              await signIn(email, password);
              result = { success: true };
            } catch (signInError) {
              console.error('Auto sign-in after registration failed:', signInError);
              // Continue anyway, user can sign in manually
              result = { 
                success: true, 
                message: 'Account created successfully, but automatic sign-in failed. Please sign in manually.' 
              };
            }
          } else {
            result = serverResult;
          }
        } catch (serverError) {
          console.error('Server-side registration failed:', serverError);
          result = { 
            success: false, 
            error: 'Registration failed. Please try again or contact support.' 
          };
        }
      }
      
      if (!result.success) {
        setError(result.error || 'Error creating account. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('Registration successful, redirecting to dashboard');
      
      // Redirect to dashboard or sign-in page based on result
      if (result.message) {
        // If we have a message, show it to the user on the sign-in page
        router.push(`/auth/signin?message=${encodeURIComponent(result.message)}&email=${encodeURIComponent(email)}`);
      } else {
        // Otherwise go straight to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Loading...</h1>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Complete Your Premium Registration</h1>
        
        {verifying ? (
          <div className="text-center py-4">
            <p>Verifying your premium status...</p>
          </div>
        ) : error && !verified ? (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
            <div className="mt-4 text-center">
              <Link href="/pricing" className="text-blue-600 hover:underline">
                View Premium Plans
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {verified && (
              <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
                <p>Your premium status has been verified! Complete your registration below.</p>
                {verificationDetails && verificationDetails.source && (
                  <p className="text-xs mt-1">Verified via: {verificationDetails.source}</p>
                )}
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
                <p>{error}</p>
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Email address cannot be changed</p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                minLength={6}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={loading || !verified}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}

            </button>
            
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function RegisterPremiumPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Loading...</h1>
        </div>
      </div>
    }>
      <RegisterPremiumContent />
    </Suspense>
  );
} 
