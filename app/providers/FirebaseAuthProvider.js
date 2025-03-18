'use client';

import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { 
  auth, 
  db,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from '../utils/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Create context
export const FirebaseAuthContext = createContext(null);

// Hook to use the auth context
export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}

export function FirebaseAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use the directly imported auth and db instances
  // No need for initialization via useMemo as they're already initialized in firebase.js

  // Ensure user exists in Firestore when authenticated with Firebase Auth
  const syncUserWithFirestore = async (firebaseUser) => {
    if (!firebaseUser) return null;
    
    try {
      console.log(`Syncing user data for ${firebaseUser.email} between Auth and Firestore`);
      
      // Safety check for db
      if (!db) {
        console.error('Firestore db not initialized in syncUserWithFirestore');
        return firebaseUser;
      }
      
      // Try to get user document with error handling
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      } catch (docError) {
        console.error(`Error getting user document for ${firebaseUser.email}:`, docError);
        // Return the original user rather than failing
        return firebaseUser;
      }
      
      // Current timestamp
      const timestamp = new Date().toISOString();
      
      if (!userDoc.exists()) {
        // User doesn't exist in Firestore yet, create record
        console.log(`Creating new Firestore record for ${firebaseUser.email}`);
        
        // Create basic user profile
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL,
          createdAt: timestamp,
          updatedAt: timestamp,
          isPremium: false, // Default to false
        };
        
        // Check for premium status in paid_emails
        try {
          const emailKey = firebaseUser.email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
          const paidEmailDoc = await getDoc(doc(db, 'paid_emails', emailKey));
          
          if (paidEmailDoc.exists()) {
            const paidData = paidEmailDoc.data();
            if (paidData?.isPremium) {
              // User has premium status
              userData.isPremium = true;
              userData.premiumSince = paidData.premiumSince || timestamp;
              
              // Try to update paid_emails but don't block if it fails
              try {
                await setDoc(doc(db, 'paid_emails', emailKey), {
                  ...paidData,
                  registered: true,
                  uid: firebaseUser.uid,
                  updatedAt: timestamp
                }, { merge: true });
                
                console.log(`Applied premium status for ${firebaseUser.email} from paid_emails`);
              } catch (updateError) {
                console.error(`Error updating paid_emails for ${firebaseUser.email}:`, updateError);
                // Continue anyway
              }
            }
          }
        } catch (premiumCheckError) {
          console.error(`Error checking premium status for ${firebaseUser.email}:`, premiumCheckError);
          // Continue without premium status
        }
        
        // Try to create the user document but don't block if it fails
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), userData);
          console.log(`Created new Firestore record for ${firebaseUser.email}`);
        } catch (createError) {
          console.error(`Error creating user document for ${firebaseUser.email}:`, createError);
          // Return merged data anyway so user can still log in
        }
        
        return { ...firebaseUser, ...userData };
      } else {
        // User exists in Firestore, make sure it's up to date with Auth
        const userData = userDoc.data();
        
        // Try to check premium status but don't block if it fails
        try {
          const emailKey = firebaseUser.email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
          const paidEmailDoc = await getDoc(doc(db, 'paid_emails', emailKey));
          
          if (paidEmailDoc.exists()) {
            const paidData = paidEmailDoc.data();
            if (paidData?.isPremium && !userData.isPremium) {
              // Update premium status if needed
              userData.isPremium = true;
              userData.premiumSince = paidData.premiumSince || userData.premiumSince || timestamp;
              
              // Try to update records but don't block if it fails
              try {
                // Update paid_emails to mark as registered
                await setDoc(doc(db, 'paid_emails', emailKey), {
                  ...paidData,
                  registered: true,
                  uid: firebaseUser.uid,
                  updatedAt: timestamp
                }, { merge: true });
                
                // Update user document
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                  ...userData,
                  updatedAt: timestamp
                }, { merge: true });
                
                console.log(`Updated premium status for ${firebaseUser.email} from paid_emails`);
              } catch (updateError) {
                console.error(`Error updating premium records for ${firebaseUser.email}:`, updateError);
                // Continue anyway
              }
            }
          }
        } catch (premiumCheckError) {
          console.error(`Error checking premium status for ${firebaseUser.email}:`, premiumCheckError);
          // Continue with existing userData
        }
        
        return { ...firebaseUser, ...userData };
      }
    } catch (error) {
      console.error('Error in syncUserWithFirestore:', error);
      // Don't fail login, just return the original user
      return firebaseUser;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log(`User authenticated: ${firebaseUser.email}`);
          
          // Step 1: First get Firestore data which is our source of truth
          let firestoreData = null;
          let isPremium = false;
          
          try {
            // Get user document from Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            
            if (userDoc.exists()) {
              // Firestore record exists
              firestoreData = userDoc.data();
              console.log(`Firestore data found for ${firebaseUser.email}:`, firestoreData);
              
              // Check premium status in Firestore first (source of truth)
              isPremium = firestoreData.isPremium === true;
              console.log(`Premium status from Firestore for ${firebaseUser.email}: ${isPremium}`);
            } else {
              console.log(`No Firestore record found for ${firebaseUser.email}. Will create one via sync.`);
            }
            
            // If not premium in Firestore, check paid_emails as fallback
            if (!isPremium) {
              const emailKey = firebaseUser.email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
              const paidEmailDoc = await getDoc(doc(db, 'paid_emails', emailKey));
              
              if (paidEmailDoc.exists()) {
                const paidData = paidEmailDoc.data();
                isPremium = paidData.isPremium === true;
                console.log(`Premium status from paid_emails for ${firebaseUser.email}: ${isPremium}`);
              }
            }
          } catch (firestoreError) {
            console.error('Error getting Firestore data:', firestoreError);
            // Continue with auth data only
          }
          
          // Step 2: Create merged user object with premium status
          const mergedUser = {
            ...firebaseUser,
            isPremium: isPremium,
            // Use Firestore data if available, otherwise set defaults
            displayName: firestoreData?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            photoURL: firestoreData?.photoURL || firebaseUser.photoURL || '/profile-placeholder.png',
            premiumSince: firestoreData?.premiumSince || null
          };
          
          // Step 3: Sync with Firestore if needed
          const syncedUser = await syncUserWithFirestore(mergedUser);
          
          // Step 4: Set the user in state
          setUser(syncedUser);
          
          // Step 5: Update the UI immediately while token refreshes in background
          // Force a token refresh in the background to ensure claims are up-to-date
          try {
            firebaseUser.getIdToken(true);
          } catch (tokenError) {
            console.error('Error refreshing token:', tokenError);
          }
        } else {
          console.log('No authenticated user');
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setError(error.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if auth is initialized
      if (!auth) {
        console.error("Firebase auth not initialized");
        throw new Error("Authentication service unavailable");
      }
      
      // Regular sign-in for non-demo accounts - BASIC AUTH ONLY VERSION
      console.log(`Attempting basic sign in with email: ${email}`);
      
      // Try the authentication - this is the core operation
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful with auth');
      
      // Check if this user has premium access
      let isPremium = false;
      let premiumSince = null;
      
      try {
        // 1. Check users collection first
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          isPremium = userData.isPremium === true;
          premiumSince = userData.premiumSince || null;
          console.log(`Premium status from users collection: ${isPremium}`);
        }
        
        // 2. If not premium, check paid_emails collection as fallback
        if (!isPremium) {
          const emailKey = email.toLowerCase().replace(/[.#$\/\[\]]/g, '_');
          const paidEmailDoc = await getDoc(doc(db, 'paid_emails', emailKey));
          
          if (paidEmailDoc.exists()) {
            const paidData = paidEmailDoc.data();
            isPremium = paidData.isPremium === true;
            premiumSince = paidData.premiumSince || null;
            console.log(`Premium status from paid_emails collection: ${isPremium}`);
            
            // Update users collection if needed
            if (isPremium) {
              await setDoc(doc(db, 'users', userCredential.user.uid), {
                isPremium: true,
                premiumSince: premiumSince || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          }
        }
      } catch (premiumCheckError) {
        console.error('Error checking premium status:', premiumCheckError);
        // Continue without stopping login
      }
      
      // Create a user object with basic fields
      const basicUser = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || userCredential.user.email.split('@')[0],
        photoURL: userCredential.user.photoURL || '/profile-placeholder.png',
        isPremium: isPremium,
        premiumSince: premiumSince
      };
      
      // Update user state with basic info
      setUser(basicUser);
      setLoading(false);
      
      return { 
        success: true, 
        user: basicUser,
        isPremium: isPremium
      };
    } catch (error) {
      console.error('Sign-in error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'An error occurred during sign-in. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please check your email or sign up.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid login credentials. Please check your email and password.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Create a generic function to update premium status
  const updatePremiumStatus = async (userId, email, isPremium = true) => {
    try {
      if (!userId || !email) return;
      
      // 1. Update in Firestore
      const userDoc = doc(db, 'users', userId);
      await setDoc(userDoc, { 
        email: email,
        isPremium: isPremium, 
        premiumSince: isPremium ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // 2. Set local state if it matches current user
      if (user && user.email === email) {
        setUser({
          ...user,
          isPremium: isPremium,
          premiumSince: isPremium ? (user.premiumSince || new Date().toISOString()) : null
        });
      }
      
      console.log(`Premium status set to ${isPremium} for user: ${email}`);
    } catch (error) {
      console.error('Error setting premium status:', error);
      // Don't throw - this is an enhancement, not a blocker
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    setError(null);
    try {
      console.log(`Starting signup process for email: ${email}`);
      
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase();
      
      // First check if this email has already paid for premium (via Stripe)
      let isPremiumUser = false;
      let premiumSince = null;
      
      try {
        console.log(`Checking if ${normalizedEmail} has premium status before registration`);
        
        // Check paid_emails collection first (faster lookup)
        const emailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
        const paidEmailRef = doc(db, "paid_emails", emailKey);
        const paidEmailSnap = await getDoc(paidEmailRef);
        
        if (paidEmailSnap.exists()) {
          const paidData = paidEmailSnap.data();
          if (paidData.isPremium) {
            console.log(`Found premium status for ${normalizedEmail} in paid_emails collection`);
            isPremiumUser = true;
            premiumSince = paidData.premiumSince || new Date().toISOString();
          }
        } else {
          // Check environment variable fallback for premium users
          try {
            const premiumUsersEnv = process.env.NEXT_PUBLIC_PREMIUM_USERS;
            if (premiumUsersEnv) {
              const premiumUsers = JSON.parse(premiumUsersEnv);
              if (Array.isArray(premiumUsers) && premiumUsers.includes(normalizedEmail)) {
                console.log(`Email ${normalizedEmail} found in environment variable premium list`);
                isPremiumUser = true;
                premiumSince = new Date().toISOString();
              }
            }
          } catch (envError) {
            console.error('Error checking environment variable for premium users:', envError);
          }
        }
      } catch (premiumCheckError) {
        console.error('Error checking premium status:', premiumCheckError);
        // Continue with registration even if premium check fails
      }
      
      console.log(`Creating new user account for ${normalizedEmail}, premium status: ${isPremiumUser}`);
      
      // Create the user account with detailed error handling
      let result;
      try {
        // Verify Firebase Auth is initialized
        if (!auth) {
          console.error('Firebase Auth not initialized');
          throw new Error('Authentication service unavailable');
        }
        
        console.log('Calling createUserWithEmailAndPassword...');
        result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        console.log(`User created successfully with UID: ${result.user.uid}`);
      } catch (authError) {
        console.error('Firebase Auth createUser error:', authError);
        
        // Check for specific Firebase Auth errors
        if (authError.code === 'auth/email-already-in-use') {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        } else if (authError.code === 'auth/invalid-email') {
          return { success: false, error: 'Invalid email address format.' };
        } else if (authError.code === 'auth/weak-password') {
          return { success: false, error: 'Password is too weak. Please use a stronger password.' };
        } else if (authError.code === 'auth/network-request-failed') {
          return { success: false, error: 'Network error. Please check your internet connection and try again.' };
        } else if (authError.code === 'auth/operation-not-allowed') {
          console.error('Email/password accounts are not enabled in Firebase console');
          return { success: false, error: 'Registration is temporarily unavailable. Please try again later.' };
        }
        
        // Generic error
        return { 
          success: false, 
          error: authError.message || 'Registration failed. Please try again later.' 
        };
      }
      
      // Set display name if provided
      if (displayName && result.user) {
        try {
          await updateProfile(result.user, {
            displayName: displayName
          });
          console.log(`Display name set for user: ${displayName}`);
        } catch (profileError) {
          console.error('Error setting display name:', profileError);
          // Continue anyway as this is not critical
        }
      }
      
      // Prepare user data for Firestore
      const timestamp = new Date().toISOString();
      const userData = {
        uid: result.user.uid,
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0],
        isPremium: isPremiumUser,
        premiumSince: isPremiumUser ? (premiumSince || timestamp) : null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Save user data to Firestore
      try {
        if (db) {
          await setDoc(doc(db, 'users', result.user.uid), userData);
          console.log(`User data saved to Firestore for ${normalizedEmail}`);
        } else {
          console.error('Firestore not initialized, skipping user data save');
        }
      } catch (firestoreError) {
        console.error('Error saving user data to Firestore:', firestoreError);
        // Continue anyway as Auth is the source of truth
      }
      
      // If premium user, update the paid_emails record
      if (isPremiumUser) {
        try {
          if (db) {
            const emailKey = normalizedEmail.replace(/[.#$\/\[\]]/g, '_');
            const paidEmailRef = doc(db, "paid_emails", emailKey);
            await setDoc(paidEmailRef, {
              email: normalizedEmail,
              isPremium: true,
              premiumSince: premiumSince || timestamp,
              updatedAt: timestamp,
              registered: true,
              uid: result.user.uid
            }, { merge: true });
            
            console.log(`Updated paid_emails record for ${normalizedEmail} with registered status`);
          } else {
            console.error('Firestore not initialized, skipping paid_emails update');
          }
        } catch (updateError) {
          console.error('Error updating paid_emails record:', updateError);
          // Continue even if this update fails
        }
      }
      
      console.log(`Registration successful for ${normalizedEmail}`);
      return { success: true, user: result.user, isPremium: isPremiumUser };
    } catch (err) {
      console.error('Firebase signup error:', err);
      
      let errorMessage = 'Registration failed';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Clear Firebase auth
      await firebaseSignOut(auth);
      
      // Clear cookies via API call
      try {
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (cookieError) {
        console.error('Error clearing auth cookie:', cookieError);
        // Continue even if cookie clear fails
      }
      
      // Clear localStorage items related to auth
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('savedConversations');
        localStorage.removeItem('isPremium');
      } catch (localStorageError) {
        console.error('Error clearing localStorage:', localStorageError);
        // Continue even if localStorage clear fails
      }
      
      console.log('User signed out successfully');
      return { success: true };
    } catch (err) {
      console.error('Error during sign out:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updatePremiumStatus
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
} 