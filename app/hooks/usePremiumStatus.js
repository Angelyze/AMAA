'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirebaseAuth } from '../providers/FirebaseAuthProvider';
import { useRouter } from 'next/navigation';

/**
 * Custom hook to check and maintain premium status
 * 
 * This hook provides:
 * 1. Regular checks of premium status
 * 2. Forces premium verification if needed
 * 3. Can redirect non-premium users if needed
 * 4. Adds aggressive refresh logic for potential mismatches
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
  const { user, userClaims, loading: authLoading, refreshPremiumStatus } = useFirebaseAuth();
  const router = useRouter();
  
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [verified, setVerified] = useState(false);
  const [lastVerified, setLastVerified] = useState(null);
  
  // Initial check based on user claims
  useEffect(() => {
    if (!authLoading) {
      // If we have userClaims, use that information as the initial state
      if (userClaims) {
        // Only consider premium if the claims say premium AND not canceled
        const claimsPremium = userClaims.isPremium === true && !userClaims.cancelAtPeriodEnd;
        setIsPremium(claimsPremium);
        setCancelAtPeriodEnd(userClaims.cancelAtPeriodEnd === true);
        
        console.log(`Initial premium status from claims: ${claimsPremium}`);
        if (userClaims.cancelAtPeriodEnd) {
          console.log('User has canceled their subscription (from claims)');
        }
        
        setLoading(false);
      } else if (!user) {
        // If no user is logged in, we're not premium
        setIsPremium(false);
        setCancelAtPeriodEnd(false);
        setLoading(false);
      }
    }
  }, [user, userClaims, authLoading]);
  
  // Memoize the verify function to avoid recreation on every render
  const verifyPremiumStatus = useCallback(async (force = false) => {
    if (!user || !user.email) return;
    
    // Don't check too frequently unless forced
    const now = Date.now();
    if (!force && lastVerified && (now - lastVerified < 30000)) {
      console.log('Skipping verification - checked recently');
      return;
    }
    
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
      setLastVerified(now);
      
      // Handle premium status mismatch between client and server
      const mismatch = (userClaims?.isPremium === true && !data.eligible) || 
                       (userClaims?.isPremium === false && data.eligible);
      
      if (mismatch) {
        console.warn(`Premium status mismatch: Auth says ${userClaims?.isPremium ? 'premium' : 'not premium'} but server says ${data.eligible ? 'premium' : 'not premium'}`);
        
        // Force a token refresh and re-verify with Firebase Auth provider
        if (refreshPremiumStatus && user) {
          try {
            console.log('Forcing auth refresh due to status mismatch...');
            const refreshResult = await refreshPremiumStatus(user);
            console.log(`Auth refresh result: ${refreshResult ? 'premium' : 'not premium'}`);
            
            // Update state again after the refresh
            if (refreshResult !== undefined) {
              setIsPremium(refreshResult);
            }
          } catch (refreshError) {
            console.error('Error during forced auth refresh:', refreshError);
          }
        }
        
        // Last resort: Force a token refresh directly
        try {
          if (user.getIdToken) {
            await user.getIdToken(true);
            console.log('Force refreshed auth token directly');
          }
        } catch (tokenError) {
          console.error('Error refreshing token directly:', tokenError);
        }
      }
      
      return data.eligible;
    } catch (error) {
      console.error('Error verifying premium status:', error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, lastVerified, userClaims, refreshPremiumStatus]);
  
  // Verify premium status with the server
  useEffect(() => {
    // Only run this check if:
    // 1. User is logged in
    // 2. We haven't verified yet OR we're enforcing a check
    // 3. Not still loading auth state
    if (user && !authLoading && (!verified || enforceCheck)) {
      verifyPremiumStatus(enforceCheck);
    }
    
    // Force re-verification when the component mounts, when the user changes,
    // or when enforceCheck changes
  }, [user, authLoading, enforceCheck, verified, verifyPremiumStatus]);
  
  // Additional check specifically for users who think they're premium
  // This adds extra verification for potential stale premium status
  useEffect(() => {
    // If user is logged in and claims to be premium, double-check with server
    if (user && userClaims?.isPremium && !authLoading && !loading) {
      // Set up a regular check every 2 minutes for premium users
      // This ensures we catch cancellations promptly
      const checkInterval = setInterval(() => {
        console.log('Running scheduled premium verification check...');
        verifyPremiumStatus(true);
      }, 2 * 60 * 1000); // 2 minutes
      
      return () => clearInterval(checkInterval);
    }
  }, [user, userClaims, authLoading, loading, verifyPremiumStatus]);
  
  // Redirect if premium is required but user doesn't have it
  useEffect(() => {
    if (!loading && requirePremium && !isPremium && user) {
      // Only redirect if we've fully verified and user is logged in
      console.log('User does not have premium access, redirecting to', redirectTo);
      router.push(redirectTo);
    }
  }, [isPremium, loading, requirePremium, router, redirectTo, user]);
  
  return {
    isPremium,
    loading,
    error,
    cancelAtPeriodEnd,
    verified,
    verifyPremiumStatus: () => verifyPremiumStatus(true),  // Expose the function so it can be called on demand with force=true
  };
} 