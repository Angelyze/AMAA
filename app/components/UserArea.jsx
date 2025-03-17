'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserArea({ toggleTheme, isDarkTheme, user, handleSignOut, handleAuth, handleSubscribe }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="auth-links">
      {user ? (
        <div className="user-profile">
          <div className="avatar-container">
            <img 
              src={user.image || "/profile-placeholder.png"} 
              alt="Profile" 
              className="profile-pic" 
            />
            {user?.isPremium && (
              <div className="premium-badge" title="Premium Member">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
                </svg>
              </div>
            )}
          </div>
          <span className="user-name">{user.name}</span>
          <div className="menu-container" ref={menuRef}>
            <button 
              className="menu-button" 
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="User menu"
            >
              <img src="/Menu.png" alt="Menu" className="menu-icon" />
            </button>
            
            {showUserMenu && (
              <div className="user-menu">
                {user?.isPremium && (
                  <>
                    <button 
                      className="menu-item theme-toggle" 
                      onClick={toggleTheme}
                    >
                      {isDarkTheme ? (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="menu-icon">
                          <path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18Z" fill="currentColor" />
                        </svg> Light Theme</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="menu-icon">
                          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                        </svg> Dark Theme</>
                      )}
                    </button>
                    <div className="menu-divider"></div>
                  </>
                )}
                <button 
                  className="menu-item sign-out" 
                  onClick={() => {
                    setShowUserMenu(false);
                    handleSignOut();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="menu-icon">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
                    <path d="M16 17L21 12L16 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
                    <path d="M21 12H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <button onClick={handleAuth} className="auth-btn login-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="btn-icon">
              <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
              <path d="M10 17L15 12L10 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
              <path d="M15 12H3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
            </svg>
            Log In
          </button>
          <button onClick={handleSubscribe} className="auth-btn subscribe-btn">
            Subscribe
          </button>
        </>
      )}
    </div>
  );
} 