'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar';

export default function StickyHeader({ 
  question, 
  setQuestion,
  handleSearchInput,
  handleVoiceInput,
  handlePhotoUpload,
  handleKeyPress,
  loading,
  scrollToTop,
  fileUploaded
}) {
  const [visible, setVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Add a mounting state to control animations
  const [isMounted, setIsMounted] = useState(false);
  
  // Define the theme color
  const themeColor = '#0097b2';
  
  useEffect(() => {
    const handleScroll = () => {
      // Get the position of the main search box specifically
      const mainSearchContainer = document.getElementById('main-search-container');
      if (mainSearchContainer) {
        const rect = mainSearchContainer.getBoundingClientRect();
        // Show the sticky header when the main search container is scrolled out of view
        const shouldBeVisible = rect.bottom < 0;
        
        if (shouldBeVisible !== visible) {
          setVisible(shouldBeVisible);
          // Set isMounted after a tiny delay when becoming visible
          if (shouldBeVisible) {
            setTimeout(() => setIsMounted(true), 10);
          } else {
            setIsMounted(false);
          }
        }
      }
    };
    
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark-theme'));
    };
    
    window.addEventListener('scroll', handleScroll);
    // Initial check to ensure correct starting state
    handleScroll();
    
    // Set up dark mode detection
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [visible]);

  // Don't render anything if not visible
  if (!visible) return null;

  // Using the specific theme color #0097b2 for shadows
  const headerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '60px',
    backgroundColor: isDarkMode ? '#111111' : '#ffffff',
    boxShadow: `0 2px 6px rgba(0, 151, 178, ${isDarkMode ? '0.3' : '0.2'})`,
    zIndex: 1000,
    transition: 'background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease, opacity 0.3s ease',
    transform: isMounted ? 'translateY(0)' : 'translateY(-100%)',
    opacity: isMounted ? 1 : 0
  };

  // Apply theme color to the search container
  const searchContainerStyle = {
    "--theme-color": themeColor,
    "--theme-focus-color": themeColor
  };

  return (
    <div style={headerStyle}>
      <div className="sticky-content">
        <div className="sticky-logo">
          <Link href="/">
            <img 
              src="/AMAA.png" 
              alt="AMAA" 
              style={{
                height: "50px", /* Maximized height to fill the sticky header */
                width: "auto",
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
                padding: "5px 0" /* Small padding to avoid touching the edges */
              }}
            />
          </Link>
        </div>
        
        <div className="sticky-center" style={searchContainerStyle}>
          <SearchBar
            question={question}
            setQuestion={setQuestion}
            handleKeyPress={handleKeyPress}
            handleVoiceInput={handleVoiceInput}
            handleSearchInput={handleSearchInput}
            handlePhotoUpload={handlePhotoUpload}
            loading={loading}
            isSticky={true}
            themeColor={themeColor}
            isDarkMode={isDarkMode}
            fileUploaded={fileUploaded}
          />
        </div>
        
        <div style={{
          position: 'absolute', 
          right: '30px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          zIndex: 9999
        }}>
          <img 
            src="/backtotop.png" 
            alt="Back to Top"
            onClick={scrollToTop}
            style={{
              width: '35px',
              height: '35px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              display: 'block'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        </div>
      </div>
    </div>
  );
} 