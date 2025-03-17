'use client';

import { formatAnswer } from '../utils/formatters';

export default function Message({ 
  message, 
  decreaseFontSize, 
  increaseFontSize, 
  fontSize, 
  copyAnswerToClipboard 
}) {
  return (
    <div className={`message ${message.role}`}>
      <div className="message-header">
        <strong className="message-role">{message.role === 'user' ? 'YOU:' : 'AMAA:'}</strong>
        
        {message.role === 'assistant' && (
          <div className="message-controls">
            <span className="size-control-btn" onClick={decreaseFontSize}>[ - ]</span>
            <span className="text-label">TEXT</span>
            <span className="size-control-btn" onClick={increaseFontSize}>[ + ]</span>
            <span 
              className="copy-link" 
              onClick={() => copyAnswerToClipboard(message.content)}
            >
              [COPY]
            </span>
          </div>
        )}
      </div>
      
      <div className="message-content" style={{ fontSize: `${fontSize}px` }}>
        {formatAnswer(message.content)}
      </div>
    </div>
  );
} 