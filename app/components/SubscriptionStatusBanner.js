'use client';

import { useState, useEffect } from 'react';
import { useFirebaseAuth } from '../providers/FirebaseAuthProvider';
import Link from 'next/link';

/**
 * Component to display a banner notification when a user's subscription 
 * is scheduled to be canceled at the end of the billing period.
 */
export default function SubscriptionStatusBanner() {
  const { user, loading, userClaims } = useFirebaseAuth();
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Only show the banner if:
    // 1. The user is logged in
    // 2. The user has premium access currently (isPremium = true)
    // 3. The subscription is scheduled to be canceled (cancelAtPeriodEnd = true)
    if (
      !loading && 
      user && 
      userClaims?.isPremium && 
      userClaims?.cancelAtPeriodEnd
    ) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [user, loading, userClaims]);
  
  if (!showBanner) {
    return null;
  }
  
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            Your premium subscription is scheduled to be canceled at the end of your current billing period. 
            You will continue to have premium access until then.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/pricing" className="font-medium underline text-yellow-700 hover:text-yellow-600">
              Renew your subscription
            </Link>
          </p>
        </div>
        <button 
          onClick={() => setShowBanner(false)}
          className="ml-auto -mx-1.5 -my-1.5 bg-yellow-100 text-yellow-500 rounded-lg focus:ring-2 focus:ring-yellow-400 p-1.5 inline-flex items-center justify-center h-8 w-8"
        >
          <span className="sr-only">Dismiss</span>
          <svg className="h-3 w-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
} 