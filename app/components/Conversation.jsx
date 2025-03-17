'use client';

import Message from './Message';

export default function Conversation({
  conversation,
  loading,
  fontSize,
  decreaseFontSize,
  increaseFontSize,
  copyAnswerToClipboard
}) {
  return (
    <div className="conversation">
      {[...conversation].reverse().map((msg, index) => (
        <Message
          key={index}
          message={msg}
          fontSize={fontSize}
          decreaseFontSize={decreaseFontSize}
          increaseFontSize={increaseFontSize}
          copyAnswerToClipboard={copyAnswerToClipboard}
        />
      ))}
      
      {loading && (
        <div className="message assistant loading-message">
          <div className="message-header">
            <strong className="message-role">AMAA:</strong>
          </div>
          <div className="message-content">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 