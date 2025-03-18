'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '../providers/FirebaseAuthProvider';

/**
 * A middleware component to check if a user has valid premium access
 * and redirect them if their subscription has been canceled or expired.
 * 
 * Use this component as a wrapper for premium-only routes.
 */
export default function PremiumAccessCheck({ children }) {
  const { user, loading, userClaims } = useFirebaseAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Skip check if still loading auth state
    if (loading) {
      return;
    }
    
    // If no user is logged in, redirect to login
    if (!user) {
      router.push('/auth/signin?message=' + encodeURIComponent('Please sign in to access premium features'));
      return;
    }
    
    // If user is logged in but doesn't have premium access, redirect to pricing
    if (!userClaims?.isPremium) {
      router.push('/pricing?message=' + encodeURIComponent('Your premium access has expired or been canceled'));
      return;
    }
    
    // If we reach here, user has valid premium access
    setIsChecking(false);
  }, [user, loading, userClaims, router]);
  
  // While checking, we can show a loading state
  if (isChecking) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // User has valid premium access, render the children
  return children;
} 