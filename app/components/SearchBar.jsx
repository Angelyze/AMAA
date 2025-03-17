'use client';

import React, { useState } from 'react';

export default function SearchBar({ 
  question,
  setQuestion,
  handleKeyPress,
  handleVoiceInput,
  handleSearchInput,
  handlePhotoUpload,
  loading,
  isSticky = false,
  themeColor = '#0097b2',
  isDarkMode = false,
  fileUploaded = false
}) {
  const containerClass = isSticky ? "search-box-sticky" : "search-box";
  
  const containerStyle = {
    position: 'relative',
    '--focus-border-color': themeColor, // CSS variable for theming
    '--focus-shadow-color': `rgba(0, 151, 178, ${isDarkMode ? '0.3' : '0.2'})`,
    borderColor: 'transparent', // Default state
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  };
  
  const inputStyle = {
    paddingRight: '120px', // Increased padding to accommodate the new icon
    outlineColor: themeColor // Ensure the outline uses theme color when focused
  };
  
  // Reference to the hidden file input
  const fileInputRef = React.useRef(null);
  
  // Function to trigger the file input click
  const triggerFileUpload = () => {
    fileInputRef.current.click();
  };
  
  // Handle file selection
  const onFileSelected = (e) => {
    const file = e.target.files[0];
    if (file && handlePhotoUpload) {
      handlePhotoUpload(file);
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };
  
  return (
    <div 
      className={containerClass} 
      style={containerStyle}
      onFocus={() => {
        // Extra insurance that focus shows theme color
        const container = document.querySelector(`.${containerClass}`);
        if (container) {
          container.style.borderColor = themeColor;
          container.style.boxShadow = `0 0 0 1px ${themeColor}`;
        }
      }}
      onBlur={() => {
        // Reset on blur
        const container = document.querySelector(`.${containerClass}`);
        if (container) {
          container.style.borderColor = 'transparent';
          container.style.boxShadow = '';
        }
      }}
    >
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={fileUploaded ? "Ask about the uploaded file..." : "Ask me anything about..."}
        disabled={loading}
        style={inputStyle}
      />
      
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelected}
        accept="image/*,.pdf,.doc,.docx"
        style={{ display: 'none' }}
      />
      
      <div style={{ 
        position: 'absolute', 
        right: '10px', 
        top: '50%', 
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          onClick={handleVoiceInput}
          disabled={loading}
          aria-label="Voice input"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            opacity: 0.7,
            color: themeColor // Use theme color for the button
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <img src="/MicIcon.png" alt="Mic" style={{ width: '20px', height: '20px' }} />
        </button>
        
        {/* Photo upload button - changes color when file is uploaded */}
        <button
          onClick={triggerFileUpload}
          disabled={loading}
          aria-label="Upload photo or document"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            opacity: fileUploaded ? 1 : 0.7,
            color: fileUploaded ? '#00bf63' : themeColor // Use green when file is uploaded
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
          onMouseOut={(e) => e.currentTarget.style.opacity = fileUploaded ? 1 : 0.7}
        >
          <img 
            src="/Photo.png" 
            alt="Upload Photo" 
            style={{ 
              width: '20px', 
              height: '20px',
              filter: fileUploaded ? 
                'invert(59%) sepia(89%) saturate(409%) hue-rotate(101deg) brightness(92%) contrast(98%)' : 
                'none' 
            }} 
          />
        </button>
        
        <button
          onClick={handleSearchInput}
          disabled={loading}
          aria-label="Search"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            opacity: 0.7,
            color: themeColor // Use theme color for the button
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <img src="/AskIcon.png" alt="Search" style={{ width: '20px', height: '20px' }} />
        </button>
      </div>
    </div>
  );
} 