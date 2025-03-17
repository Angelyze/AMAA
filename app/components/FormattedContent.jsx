'use client';

import { useRef, useEffect } from 'react';
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from '../utils/formatters';

export default function FormattedContent({ content, fontSize }) {
  // Ensure fontSize is within allowed range
  const sanitizedFontSize = Math.min(Math.max(fontSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
  
  const contentRef = useRef(null);
  
  useEffect(() => {
    if (contentRef.current) {
      // Set font size directly on the element and all its children
      const applyFontSize = (element, size) => {
        element.style.fontSize = `${size}px`;
        Array.from(element.children).forEach(child => {
          applyFontSize(child, size);
        });
      };
      
      applyFontSize(contentRef.current, sanitizedFontSize);
    }
  }, [sanitizedFontSize, content]);
  
  // Format content to HTML (simplified version)
  const formatContentToHTML = (text) => {
    if (!text) return '';
    
    return text
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  };
  
  return (
    <div 
      ref={contentRef}
      className="formatted-content"
      style={{ fontSize: `${sanitizedFontSize}px` }}
      dangerouslySetInnerHTML={{ __html: formatContentToHTML(content) }}
    />
  );
} 