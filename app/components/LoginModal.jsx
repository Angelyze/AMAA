'use client';

import { useState } from 'react';

export default function LoginModal({ 
  showLoginModal, 
  setShowLoginModal, 
  handleLogin, 
  handleSocialLogin 
}) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  if (!showLoginModal) return null;
  
  const onSubmit = (e) => {
    e.preventDefault();
    
    if (!loginEmail || !loginEmail.includes('@')) {
      setLoginError('Please enter a valid email address');
      return;
    }
    
    // Call the login handler with email and password
    handleLogin(e, loginEmail, loginPassword, setLoginError);
  };
  
  const redirectToSubscribe = () => {
    // Redirect to the subscription page
    window.location.href = '/subscribe';
  };
  
  return (
    <div className="popup-overlay" onClick={() => setShowLoginModal(false)}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <img 
          src="/AMAA.png" 
          alt="AMAA Premium" 
          className="modal-logo" 
          style={{ width: '240px' }} // Double the size
        />
        <h3>Log In</h3>
        <p className="modal-description">
          Log In to access Premium features
        </p>
        
        <form onSubmit={onSubmit} className="premium-form">
          <div className="input-container">
            <input
              type="email"
              className="premium-input"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email address"
              required
            />
            
            <input
              type="password"
              className="premium-input"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              style={{ marginTop: '10px' }}
            />
            
            {loginError && <p className="error-message">{loginError}</p>}
          </div>
          
          <div className="social-login">
            <p className="or-divider"><span>Or log in with</span></p>
            <div className="social-buttons">
              <button 
                type="button" 
                className="social-btn google"
                onClick={() => handleSocialLogin('google')}
              >
                <img src="/Google.png" alt="Google" className="social-icon" /> Google
              </button>
              <button 
                type="button" 
                className="social-btn facebook"
                onClick={() => handleSocialLogin('facebook')}
              >
                <img src="/Facebook.png" alt="Facebook" className="social-icon" /> Facebook
              </button>
              <button 
                type="button" 
                className="social-btn twitter"
                onClick={() => handleSocialLogin('twitter')}
              >
                <img src="/X01.png" alt="X" className="social-icon" /> X
              </button>
            </div>
          </div>
          
          <div className="button-group">
            <button type="submit" className="new-session-btn">
              Log In
            </button>
            <button
              type="button"
              className="new-session-btn"
              onClick={redirectToSubscribe}
            >
              Subscribe
            </button>
            <button
              type="button"
              className="new-session-btn"
              onClick={() => setShowLoginModal(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 