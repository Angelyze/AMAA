/**
 * Verifies premium status by checking multiple sources
 * 
 * This function performs a multi-tier check for premium status:
 * 1. Local user object (already checked by auth provider)
 * 2. Verify against server API (optional extra verification)
 * 
 * @param {Object} user - The user object from auth context
 * @param {boolean} refreshFromServer - Whether to refresh from server API
 * @returns {Promise<{isPremium: boolean, source: string}>} Premium status and source
 */
export async function verifyPremiumStatus(user, refreshFromServer = false) {
  // No user means not premium
  if (!user) {
    return { isPremium: false, source: 'none' };
  }
  
  // Check user object first (fastest)
  if (user.isPremium === true) {
    console.log(`User ${user.email} is premium according to user object`);
    
    // If not requesting server verification, return local result
    if (!refreshFromServer) {
      return { isPremium: true, source: 'local' };
    }
  }
  
  // If we need to verify with server or user object says not premium
  if (refreshFromServer || user.isPremium !== true) {
    try {
      console.log(`Verifying premium status with server for ${user.email}`);
      const response = await fetch(`/api/check-premium-status?email=${encodeURIComponent(user.email)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Server premium status for ${user.email}: ${data.isPremium}`);
        return { 
          isPremium: data.isPremium === true,
          source: data.source || 'server'
        };
      } else {
        console.error('Error verifying premium status with server:', response.statusText);
      }
    } catch (error) {
      console.error('Error checking premium status with server:', error);
    }
  }
  
  // Fallback to user object if server check fails
  return { 
    isPremium: user.isPremium === true, 
    source: 'local-fallback'
  };
}

/**
 * Handles what happens when a user doesn't have premium access
 * 
 * @param {Object} router - Next.js router
 * @param {string} redirectTo - Where to redirect
 * @param {Function} onShowModal - Function to call to show a modal instead
 */
export function handleNonPremiumUser(router, redirectTo = '/pricing', onShowModal = null) {
  if (onShowModal && typeof onShowModal === 'function') {
    // Show a modal instead of redirecting
    onShowModal();
  } else if (router) {
    // Redirect to the upgrade page
    router.push(redirectTo);
  }
}

/**
 * Cleans up Firestore database records for a user being deleted
 * 
 * @param {string} email - User's email address
 * @param {string} uid - User's UID
 */
export async function cleanupUserRecords(email, uid) {
  try {
    console.log(`Cleaning up records for ${email} (${uid})`);
    
    const response = await fetch('/api/cleanup-user-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, uid }),
    });
    
    if (response.ok) {
      console.log(`Successfully cleaned up records for ${email}`);
      return true;
    } else {
      console.error(`Failed to clean up records for ${email}:`, response.statusText);
      return false;
    }
  } catch (error) {
    console.error(`Error cleaning up records for ${email}:`, error);
    return false;
  }
} 