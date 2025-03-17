'use client';

import { useRef, useEffect, useState } from 'react';

export default function ConversationControls({
  isPremium,
  savedConversations,
  selectedConversation,
  setSelectedConversation,
  setConversation,
  isDropdownOpen,
  setIsDropdownOpen,
  loadConversation,
  deleteConversation,
  renameConversation,
  saveConversation,
  startNewSession,
  // TTS props
  isTtsEnabled,
  toggleTts,
  ttsVoice,
  setTtsVoice,
  ttsSpeed,
  setTtsSpeed,
  availableTtsVoices,
  isTtsDropdownOpen,
  setIsTtsDropdownOpen,
  isPlaying,
  togglePlayPause
}) {
  const dropdownRef = useRef(null);
  const headerRef = useRef(null);
  const ttsDropdownRef = useRef(null);
  const ttsHeaderRef = useRef(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');
  
  // This function will handle opening and closing the dropdown
  const handleDropdownClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
    // Close the TTS dropdown if open
    if (isTtsDropdownOpen) {
      setIsTtsDropdownOpen(false);
    }
  };
  
  // This function will handle opening and closing the TTS dropdown
  const handleTtsDropdownClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTtsDropdownOpen(!isTtsDropdownOpen);
    // Close the main dropdown if open
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };
  
  // This function handles selecting an item
  const handleItemSelection = (index) => {
    loadConversation(index);
    setIsDropdownOpen(false);
  };
  
  // This function handles resetting the selection
  const handleReset = () => {
    setSelectedConversation(null);
    setConversation([]);
    setIsDropdownOpen(false);
  };

  // This function handles selecting a voice
  const handleVoiceSelection = (voice) => {
    setTtsVoice(voice);
    setIsTtsDropdownOpen(false);
  };
  
  // This function handles cycling through speed options
  const handleSpeedCycle = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(ttsSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setTtsSpeed(speeds[nextIndex]);
  };
  
  // This function handles editing the name of a conversation
  const handleEditClick = (e, index, currentName) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditName(currentName);
  };

  const handleSaveEdit = (e, index) => {
    e.stopPropagation();
    if (editName.trim() !== '') {
      renameConversation(index, editName.trim());
      setEditingIndex(null);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingIndex(null);
  };

  const handleEditNameChange = (e) => {
    setEditName(e.target.value);
  };
  
  // Add an effect to handle clicking outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (ttsDropdownRef.current && !ttsDropdownRef.current.contains(event.target)) {
        setIsTtsDropdownOpen(false);
      }
    };
    
    // Only add the event listener if any dropdown is open
    if (isDropdownOpen || isTtsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isTtsDropdownOpen, setIsDropdownOpen, setIsTtsDropdownOpen]);
  
  // Add an effect to remove any event listeners added by dropdown-fix.js
  useEffect(() => {
    if (headerRef.current) {
      const header = headerRef.current;
      
      // Remove all click event listeners
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
      
      // Add our click handler
      newHeader.onclick = handleDropdownClick;
      
      // Update the ref
      headerRef.current = newHeader;
    }

    if (ttsHeaderRef.current) {
      const header = ttsHeaderRef.current;
      
      // Remove all click event listeners
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);
      
      // Add our click handler
      newHeader.onclick = handleTtsDropdownClick;
      
      // Update the ref
      ttsHeaderRef.current = newHeader;
    }
  }, []);
  
  // If not subscribed, don't render
  if (!isPremium) {
    return null;
  }
  
  return (
    <div className="saved-conversations">
      {/* First row */}
      <div className="controls-container first-row">
        {/* New AMAA button */}
        <button onClick={startNewSession} className="new-session-btn">
          New AMAA
        </button>
        
        {/* Save AMAA button */}
        <button onClick={saveConversation} className="new-session-btn">
          Save AMAA
        </button>
        
        {/* Select an AMAA dropdown */}
        <div className="dropdown-wrapper select-amaa" ref={dropdownRef}>
          <div
            className="dropdown-header"
            ref={headerRef}
            onClick={handleDropdownClick}
            role="button"
            aria-expanded={isDropdownOpen}
            tabIndex={0}
            data-no-dropdown-fix="true"
          >
            {selectedConversation !== null
              ? savedConversations[selectedConversation]?.name || 'Select an AMAA'
              : 'Select an AMAA'}
          </div>
          <ul className={`dropdown-list ${isDropdownOpen ? 'open' : ''}`}>
            <li
              className="dropdown-item"
              onClick={handleReset}
            >
              Select an AMAA
            </li>
            {savedConversations.map((conv, index) => (
              <li key={index} className="dropdown-item">
                {editingIndex === index ? (
                  <div className="edit-mode">
                    <input
                      type="text"
                      value={editName}
                      onChange={handleEditNameChange}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    <div className="edit-buttons">
                      <button
                        onClick={(e) => handleSaveEdit(e, index)}
                        className="save-edit-btn"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="cancel-edit-btn"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span
                      className="dropdown-item-text"
                      onClick={() => handleItemSelection(index)}
                    >
                      {conv.name}
                    </span>
                    <div className="item-actions">
                      <button
                        onClick={(e) => handleEditClick(e, index, conv.name)}
                        className="edit-btn"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(index);
                        }}
                        className="delete-btn"
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Second row */}
      <div className="controls-container second-row">
        {/* Toggle TTS button */}
        <button onClick={toggleTts} className="new-session-btn">
          {isTtsEnabled ? 'OFF' : 'ON'}
        </button>
        
        {/* Speed button */}
        <button 
          onClick={handleSpeedCycle} 
          className="new-session-btn speed-btn"
          disabled={!isTtsEnabled}
        >
          {ttsSpeed}X
        </button>
        
        {/* Play/Pause button with themed icon */}
        <button 
          onClick={togglePlayPause} 
          className="new-session-btn play-pause-btn"
          disabled={!isTtsEnabled}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
              <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 4.75c0-.41.34-.75.75-.75h1.5c.41 0 .75.34.75.75v14.5c0 .41-.34.75-.75.75h-1.5C6.34 20 6 19.66 6 19.25V4.75z" fill="currentColor" />
              <path d="M18 12l-8.5 6V6l8.5 6z" fill="currentColor" />
            </svg>
          )}
        </button>
        
        {/* Text to Speech dropdown */}
        <div className="dropdown-wrapper tts-voices" ref={ttsDropdownRef}>
          <div
            className="dropdown-header"
            ref={ttsHeaderRef}
            onClick={handleTtsDropdownClick}
            role="button"
            aria-expanded={isTtsDropdownOpen}
            tabIndex={0}
            data-no-dropdown-fix="true"
          >
            {isTtsEnabled && ttsVoice ? ttsVoice.name : 'Text to Speech'}
          </div>
          <ul className={`dropdown-list ${isTtsDropdownOpen ? 'open' : ''}`}>
            {availableTtsVoices.map((voice, index) => (
              <li key={index} className="dropdown-item">
                <span
                  className={`dropdown-item-text ${voice.name === ttsVoice?.name ? 'selected-voice' : ''}`}
                  onClick={() => handleVoiceSelection(voice)}
                >
                  {voice.name} {voice.name === ttsVoice?.name ? '✓' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 