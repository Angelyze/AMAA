'use client';

import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '../providers/FirebaseAuthProvider';
import { useRouter } from 'next/navigation';

/**
 * Custom hook to check and maintain premium status
 * 
 * This hook provides:
 * 1. Regular checks of premium status
 * 2. Forces premium verification if needed
 * 3. Can redirect non-premium users if needed
 * 
 * @param {Object} options Configuration options
 * @param {boolean} options.requirePremium If true, redirects non-premium users
 * @param {string} options.redirectTo Where to redirect non-premium users
 * @param {boolean} options.enforceCheck If true, forces a server check regardless of cached status
 * @returns {Object} Status information and utility functions
 */
export default function usePremiumStatus({
  requirePremium = false,
  redirectTo = '/pricing',
  enforceCheck = false
} = {}) {
  const { user, userClaims, loading: authLoading } = useFirebaseAuth();
  const router = useRouter();
  
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [verified, setVerified] = useState(false);
  
  // Initial check based on user claims
  useEffect(() => {
    if (!authLoading) {
      // If we have userClaims, use that information as the initial state
      if (userClaims) {
        setIsPremium(userClaims.isPremium === true);
        setCancelAtPeriodEnd(userClaims.cancelAtPeriodEnd === true);
        setLoading(false);
      } else if (!user) {
        // If no user is logged in, we're not premium
        setIsPremium(false);
        setCancelAtPeriodEnd(false);
        setLoading(false);
      }
    }
  }, [user, userClaims, authLoading]);
  
  // Verify premium status with the server
  useEffect(() => {
    // Only run this check if:
    // 1. User is logged in
    // 2. We haven't verified yet OR we're enforcing a check
    // 3. Not still loading auth state
    if (user && !authLoading && (!verified || enforceCheck)) {
      verifyPremiumStatus();
    }
    
    // Force re-verification when the component mounts, when the user changes,
    // or when enforceCheck changes
  }, [user, authLoading, enforceCheck]);
  
  // Redirect if premium is required but user doesn't have it
  useEffect(() => {
    if (!loading && requirePremium && !isPremium && user) {
      // Only redirect if we've fully verified and user is logged in
      console.log('User does not have premium access, redirecting to', redirectTo);
      router.push(redirectTo);
    }
  }, [isPremium, loading, requirePremium, router, redirectTo, user]);
  
  // Function to verify premium status with the server
  const verifyPremiumStatus = async () => {
    if (!user || !user.email) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Verifying premium status with server...');
      
      const response = await fetch('/api/verify-premium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          uid: user.uid,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify premium status');
      }
      
      const data = await response.json();
      console.log('Premium verification result:', data);
      
      // Update state based on server response
      setIsPremium(data.eligible === true);
      setCancelAtPeriodEnd(data.cancelAtPeriodEnd === true);
      setVerified(true);
      
      // If user isn't premium anymore, we may need to update Auth state
      if (!data.eligible && userClaims?.isPremium === true) {
        console.warn('Premium status mismatch: Auth says premium but server says not');
        
        // Force a token refresh to get updated claims
        if (user.getIdToken) {
          try {
            await user.getIdToken(true);
            console.log('Force refreshed auth token');
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
          }
        }
      }
    } catch (error) {
      console.error('Error verifying premium status:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return {
    isPremium,
    loading,
    error,
    cancelAtPeriodEnd,
    verified,
    verifyPremiumStatus,  // Expose the function so it can be called on demand
  };
} 