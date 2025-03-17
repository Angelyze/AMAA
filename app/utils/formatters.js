import React from 'react';

/**
 * Formats AI response text with markdown-like syntax into React components
 * @param {string} text - The text to format
 * @returns {JSX.Element} - Formatted JSX
 */
export function formatAnswer(text) {
  if (!text) return null;
  
  // Handle code blocks first (they might contain markdown symbols)
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const textWithCodeBlocks = text.replace(codeBlockRegex, (match, code) => {
    return `<div class="code-block">${code.trim()}</div>`;
  });
  
  // Clean up markdown symbols - only keep bold and links
  let cleanedText = textWithCodeBlocks
    .replace(/#{1,6}\s+([^\n]+)/g, '<strong>$1</strong>') // Convert headings to bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
    .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); // Links
  
  // Split into paragraphs
  const paragraphs = cleanedText.split('\n\n').filter(p => p.trim());
  
  if (paragraphs.length > 0) {
    return (
      <div className="formatted-answer">
        {paragraphs.map((para, idx) => {
          // Check if this paragraph is a list that we want to preserve
          if (para.trim().match(/^[*-]\s/m) && para.split('\n').length > 2) {
            // Only format as a list if there are multiple items
            const listItems = para.split(/\n[*-]\s/).filter(item => item.trim());
            return (
              <ul key={idx} className="answer-list">
                {listItems.map((item, i) => (
                  <li key={i} className="answer-list-item" 
                      dangerouslySetInnerHTML={{ __html: item.replace(/^[*-]\s/, '') }} />
                ))}
              </ul>
            );
          } else if (para.trim().match(/^\d+\.\s/m) && para.split('\n').length > 2) {
            // Only format as a numbered list if there are multiple items
            const listItems = para.split(/\n\d+\.\s/).filter(item => item.trim());
            return (
              <ol key={idx} className="answer-list numbered">
                {listItems.map((item, i) => (
                  <li key={i} className="answer-list-item" 
                      dangerouslySetInnerHTML={{ __html: item.replace(/^\d+\.\s/, '') }} />
                ))}
              </ol>
            );
          } else if (para.includes('<div class="code-block">')) {
            // This is a code block
            return <div key={idx} dangerouslySetInnerHTML={{ __html: para }} />;
          } else {
            // Convert any single-line bullet points to regular text
            const cleanPara = para
              .replace(/^[*-]\s+(.*?):/g, '<strong>$1</strong>: ') // Convert "- Term:" to bold
              .replace(/^[*-]\s+/gm, '') // Remove bullet points
              .replace(/^\d+\.\s+/gm, ''); // Remove numbered points
              
            // Regular paragraph
            return (
              <p key={idx} className="answer-paragraph" 
                 dangerouslySetInnerHTML={{ __html: cleanPara }} />
            );
          }
        })}
      </div>
    );
  }
  
  // Single paragraph case
  return (
    <p className="answer-paragraph" dangerouslySetInnerHTML={{ __html: cleanedText }} />
  );
} 