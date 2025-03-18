'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../providers';
import { useRouter } from 'next/navigation';
import usePremiumStatus from '../hooks/usePremiumStatus';

/**
 * PremiumGuard - A component that enforces premium access restrictions
 * 
 * This component will check if the current user has premium access and redirect
 * them to an upgrade page or show a modal if they don't.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Content to render if the user has premium access
 * @param {boolean} props.showUpgradeModal - Whether to show a modal instead of redirecting
 * @param {string} props.redirectTo - Where to redirect non-premium users (defaults to /upgrade)
 */
export default function PremiumGuard({ 
  children, 
  showUpgradeModal = false,
  redirectTo = '/pricing'
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  
  // Use the enhanced usePremiumStatus hook which performs thorough verification
  const { isPremium, loading: checkingPremium } = usePremiumStatus({
    requirePremium: true,
    redirectTo: redirectTo,
    enforceCheck: true
  });
  
  // Show upgrade modal instead of redirecting if that option is enabled
  useEffect(() => {
    if (showUpgradeModal && !checkingPremium && !isPremium && user) {
      setShowModal(true);
    }
  }, [isPremium, checkingPremium, user, showUpgradeModal]);
  
  // Show loading indicator while checking premium status
  if (checkingPremium) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Verifying access...</span>
      </div>
    );
  }
  
  // If no user is logged in, redirect to login
  if (!user) {
    // Use Next.js router to redirect
    router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Redirecting to login...</span>
      </div>
    );
  }
  
  // Show upgrade modal if enabled and user is not premium
  if (showModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Premium Access Required</h2>
          <p className="mb-4">
            This feature requires a premium subscription. Upgrade now to access all premium features.
          </p>
          <div className="flex justify-end space-x-2">
            <button 
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button 
              onClick={() => router.push(redirectTo)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If user is premium, render the children
  if (isPremium) {
    return children;
  }
  
  // Default case - should not normally reach here due to the redirects
  return null;
} 