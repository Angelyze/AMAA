'use client';

import React, { createContext, useContext, useState, useEffect, lazy } from 'react';
import { FirebaseAuthProvider, useFirebaseAuth } from './providers/FirebaseAuthProvider';

// Create auth context
const AuthContext = createContext(null);

// This hook should only be used inside functional components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Main App Provider that wraps your app with all necessary providers
export function AppProvider({ children }) {
  return (
    <FirebaseAuthProvider>
      <AuthProvider>
        <AppContent>{children}</AppContent>
      </AuthProvider>
    </FirebaseAuthProvider>
  );
}

// AppContent wraps the application with common UI elements like banners
function AppContent({ children }) {
  const [hydrated, setHydrated] = useState(false);
  
  // Wait until after client-side hydration to show
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  if (!hydrated) {
    // Return a placeholder with the same structure to avoid layout shift
    return <>{children}</>;
  }
  
  return (
    <>
      {/* Dynamic import of SubscriptionStatusBanner to avoid SSR issues */}
      {hydrated && (
        <React.Suspense fallback={null}>
          <SubscriptionStatusBanner />
        </React.Suspense>
      )}
      {children}
    </>
  );
}

// Dynamically import the SubscriptionStatusBanner to avoid SSR issues
const SubscriptionStatusBanner = lazy(() => 
  import('./components/SubscriptionStatusBanner').catch(() => ({
    default: () => null // Fallback to empty component if import fails
  }))
);

export function AuthProvider({ children }) {
  const firebaseAuth = useFirebaseAuth();
  const [user, setUser] = useState(firebaseAuth?.user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Debug logs
  useEffect(() => {
    console.log('AuthProvider initialized');
    console.log('Initial user state:', firebaseAuth?.user ? 'Logged in' : 'Not logged in');
    return () => console.log('AuthProvider unmounted');
  }, []);

  // Keep local state in sync with Firebase user
  useEffect(() => {
    console.log('Firebase auth state changed:', firebaseAuth?.user ? 'User logged in' : 'No user');
    
    if (firebaseAuth?.user) {
      // Update the user state with the Firebase user
      setUser({
        ...firebaseAuth.user,
        // Convert to match the expected format in the app
        name: firebaseAuth.user.displayName || firebaseAuth.user.email?.split('@')[0],
        image: firebaseAuth.user.photoURL || '/profile-placeholder.png',
        email: firebaseAuth.user.email,
        isPremium: firebaseAuth.user.isPremium === true
      });
      
      // Save to localStorage for persistence
      try {
        localStorage.setItem('user', JSON.stringify({
          ...firebaseAuth.user,
          name: firebaseAuth.user.displayName || firebaseAuth.user.email?.split('@')[0],
          image: firebaseAuth.user.photoURL || '/profile-placeholder.png',
          email: firebaseAuth.user.email,
          isPremium: firebaseAuth.user.isPremium === true
        }));
      } catch (err) {
        console.error('Error saving user to localStorage:', err);
      }
    } else {
      setUser(null);
      // Clear from localStorage
      try {
        localStorage.removeItem('user');
      } catch (err) {
        console.error('Error removing user from localStorage:', err);
      }
    }
  }, [firebaseAuth.user]);

  // Custom login function
  const signIn = async (email, password) => {
    try {
      console.log('AuthProvider: Starting simple sign-in process');
      setLoading(true);
      setError(null);
      
      // Make sure Firebase auth provider is available
      if (!firebaseAuth || !firebaseAuth.signIn) {
        console.error('Firebase auth provider not available');
        throw new Error('Authentication service unavailable');
      }
      
      console.log(`AuthProvider: Attempting to sign in user: ${email}`);
      
      // Call the Firebase signIn method directly
      const result = await firebaseAuth.signIn(email, password);
      console.log('AuthProvider: Sign-in result received:', result?.success ? 'Success' : 'Failed');
      
      if (result.success) {
        // Set user and close modal on success
        if (result.user) {
          console.log('AuthProvider: Setting user state after successful login');
          setUser(result.user);
          
          // Save to localStorage for persistence
          try {
            localStorage.setItem('user', JSON.stringify(result.user));
          } catch (err) {
            console.error('Error saving to localStorage:', err);
          }
        }
        
        return { success: true, user: result.user };
      } else {
        console.error('Login failed:', result.error);
        setError(result.error || 'Login failed');
        return result; // Pass through the error
      }
    } catch (error) {
      console.error('Login error in AuthProvider:', error);
      setError(error.message || 'Login failed');
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };
  
  // Sign up function
  const signUp = async (email, password, displayName) => {
    try {
      setLoading(true);
      setError(null);
      
      // Make sure Firebase auth provider is available
      if (!firebaseAuth || !firebaseAuth.signUp) {
        console.error('Firebase auth provider not available');
        throw new Error('Authentication service unavailable');
      }
      
      console.log(`Attempting to sign up user: ${email}`);
      
      // Use Firebase auth provider
      const result = await firebaseAuth.signUp(email, password, displayName);
      console.log('Sign up result:', result ? 'Success' : 'Failed');
      
      return { success: true };
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message || 'Registration failed');
      return { success: false, error: error.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Make sure Firebase auth provider is available
      if (!firebaseAuth || !firebaseAuth.signOut) {
        console.error('Firebase auth provider not available');
        throw new Error('Authentication service unavailable');
      }
      
      console.log('Attempting to sign out user');
      
      // Use Firebase signOut
      await firebaseAuth.signOut();
      console.log('Sign out successful');
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message || 'Logout failed');
      return { success: false, error: error.message || 'Logout failed' };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 