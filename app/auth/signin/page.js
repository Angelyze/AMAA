'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { useAuth } from '../../providers';

// Create a component that uses searchParams
function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Check for error or success messages in URL
  useEffect(() => {
    const errorMessage = searchParams.get('error');
    const premiumSuccess = searchParams.get('premium');
    const premiumEmail = searchParams.get('email');
    
    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
    }
    
    if (premiumSuccess === 'true' && premiumEmail) {
      setSuccess(`Successfully subscribed! Please sign in with ${premiumEmail} to access premium features.`);
      setEmail(premiumEmail);
    }
    
    // For debugging
    console.log('SignIn page initialized with params:', {
      errorMessage,
      premiumSuccess,
      premiumEmail
    });
  }, [searchParams]);
  
  // Update error from auth provider
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    console.log(`Handling ${isNewUser ? 'sign-up' : 'sign-in'} form submission for email: ${email}`);

    // Validation for new users
    if (isNewUser) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }
    }

    try {
      console.log(`Attempting to ${isNewUser ? 'register' : 'sign in'} with email: ${email}`);
      
      let result;
      // For regular users
      if (isNewUser) {
        // Sign up
        result = await signUp(email, password, displayName);
        if (result.success) {
          setSuccess('Account created! Signing you in...');
        }
      } else {
        // Sign in
        result = await signIn(email, password);
        if (result.success) {
          setSuccess('Sign in successful! Redirecting...');
        }
      }

      if (result?.success) {
        // Redirect after successful authentication
        const redirectTo = searchParams.get('redirect') || '/';
        console.log(`Login successful, redirecting to: ${redirectTo}`);
        router.push(redirectTo);
      } else {
        setError(result?.error || 'Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Authentication exception:', error);
      setError(error.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-container">
        <Link href="/" className="logo-link">
          <img src="/AMAA.png" alt="AMAA Premium" className="modal-logo" />
        </Link>
        
        <h1>{isNewUser ? 'Create Account' : 'Sign In'}</h1>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit} className="premium-form">
          <div className="input-container">
            <input
              type="email"
              className="premium-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              required
            />
            
            {isNewUser && (
              <input
                type="text"
                className="premium-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name (optional)"
                style={{ marginTop: '10px' }}
              />
            )}
            
            <input
              type="password"
              className="premium-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{ marginTop: '10px' }}
              required
            />
            
            {isNewUser && (
              <input
                type="password"
                className="premium-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                style={{ marginTop: '10px' }}
                required
              />
            )}
          </div>
          
          <button 
            type="submit" 
            className="new-session-btn" 
            disabled={isLoading}
          >
            {isLoading ? (isNewUser ? 'Creating Account...' : 'Signing in...') : (isNewUser ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        
        <div className="auth-toggle">
          <button 
            type="button" 
            className="toggle-btn"
            onClick={() => setIsNewUser(!isNewUser)}
          >
            {isNewUser ? 'Already have an account? Sign In' : 'New user? Create an account'}
          </button>
        </div>
        
        <div className="back-to-home">
          <Link href="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="auth-container"><p>Loading authentication...</p></div>}>
      <SignInContent />
    </Suspense>
  );
} 