'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '../providers/FirebaseAuthProvider';
import usePremiumStatus from '../hooks/usePremiumStatus';

/**
 * A middleware component to check if a user has valid premium access
 * and redirect them if their subscription has been canceled or expired.
 * 
 * Use this component as a wrapper for premium-only routes.
 */
export default function PremiumAccessCheck({ children, redirectPath = '/pricing' }) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();
  
  // Use the enhanced premium status hook which performs thorough verification
  const { 
    isPremium, 
    loading: premiumLoading, 
    cancelAtPeriodEnd 
  } = usePremiumStatus({
    requirePremium: true,
    redirectTo: redirectPath,
    enforceCheck: true
  });
  
  // While checking any state, show loading indicator
  if (loading || premiumLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Verifying premium access...</span>
      </div>
    );
  }
  
  // If no user is logged in, redirect to login
  if (!user) {
    // Use setTimeout to avoid immediate redirect during SSR
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const loginPath = `/login?redirect=${encodeURIComponent(currentPath)}`;
      
      setTimeout(() => {
        router.push(loginPath);
      }, 0);
    }
    
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }
  
  // If user isn't premium (including former premium users), redirect to pricing
  if (!isPremium) {
    // The usePremiumStatus hook will handle the redirect, but we can
    // show a transitional UI state here
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6">
        <h2 className="text-xl font-semibold mb-4">Premium Access Required</h2>
        <p className="text-gray-600 mb-4">
          {cancelAtPeriodEnd 
            ? "Your subscription has been canceled." 
            : "This feature requires a premium subscription."}
        </p>
        <p className="text-gray-600 mb-6">Redirecting to pricing page...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // User has valid premium access, render the children
  return children;
} 