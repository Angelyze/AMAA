'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../providers';
import { useRouter } from 'next/navigation';

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
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    // Check premium status
    const checkPremiumStatus = async () => {
      try {
        setChecking(true);
        
        // Wait a moment to ensure auth state is loaded
        if (user === undefined) {
          // Still loading auth state, wait a bit
          return;
        }
        
        if (!user) {
          // No user is logged in
          console.log('No user logged in - redirecting to login');
          router.push('/login');
          return;
        }
        
        // Check premium access
        const isPremium = user.isPremium === true;
        
        if (!isPremium) {
          console.log('User does not have premium access');
          if (showUpgradeModal) {
            setShowModal(true);
          } else {
            console.log(`Redirecting to ${redirectTo}`);
            router.push(redirectTo);
          }
        }
      } catch (error) {
        console.error('Error checking premium status:', error);
        // Default to showing upgrade option on error
        if (showUpgradeModal) {
          setShowModal(true);
        } else {
          router.push(redirectTo);
        }
      } finally {
        setChecking(false);
      }
    };
    
    checkPremiumStatus();
  }, [user, router, redirectTo, showUpgradeModal]);
  
  // Show loading state while checking
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" 
               role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
          <p className="mt-2 text-gray-600">Verifying your subscription...</p>
        </div>
      </div>
    );
  }
  
  // If showing a modal for upgrade
  if (showModal) {
    return (
      <>
        {/* Render the main content in the background */}
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        
        {/* Premium upgrade modal */}
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Premium Access Required</h2>
            <p className="mb-4">
              This feature requires a premium subscription. Upgrade now to unlock all premium features.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={() => router.push('/pricing')} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // User has premium access, render children
  return <>{children}</>;
} 