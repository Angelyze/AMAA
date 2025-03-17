import { getAuth } from 'firebase/auth';
import { isTestPremiumEmail } from './config';

/**
 * Utility function to check premium status from Firebase Auth claims
 * @param {Object} user - The Firebase Auth user object
 * @returns {Promise<boolean>} - Whether the user has premium status
 */
export async function checkPremiumStatus(user) {
  if (!user) return false;
  
  try {
    // First try to get premium status from user object if it was already set
    if (user.isPremium === true) {
      return true;
    }
    
    // Get the ID token result which contains custom claims
    const auth = getAuth();
    const idTokenResult = await user.getIdTokenResult(true);
    
    // Check if the premium claim exists
    const isPremium = idTokenResult.claims && idTokenResult.claims.isPremium === true;
    
    // Log the result for debugging
    console.log(`Premium status for ${user.email}: ${isPremium}`);
    
    // Special case for test emails
    if (!isPremium && user.email) {
      if (isTestPremiumEmail(user.email)) {
        console.log(`Test email detected, granting premium status: ${user.email}`);
        return true;
      }
    }
    
    return isPremium;
  } catch (error) {
    console.error('Error checking premium status:', error);
    
    // Fallback for test emails
    if (user.email && isTestPremiumEmail(user.email)) {
      console.log(`Test email fallback premium: ${user.email}`);
      return true;
    }
    
    return false;
  }
} 