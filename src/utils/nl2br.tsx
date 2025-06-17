import React from 'react';

/**
 * Converts newline characters (\n) in text to React JSX <br /> elements
 * @param text - The text string containing newline characters
 * @returns React Fragment with text and <br /> elements
 * 
 * @example
 * nl2br("Hello\nWorld") // Returns: Hello<br />World<br />
 */
export function nl2br(text: string) {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      <br />
    </React.Fragment>
  ));
}

/**
 * Enhanced function for formatting text with better handling of edge cases
 * Safely handles null, undefined, and empty strings while converting newlines to JSX
 * @param text - The text to format (can be string, null, or undefined)
 * @returns Formatted React node or empty string for invalid inputs
 * 
 * @example
 * formatText("Hello\nWorld") // Returns: Hello<br />World<br />
 * formatText(null) // Returns: ""
 * formatText("") // Returns: ""
 * formatText("   ") // Returns: ""
 * 
 * @usage Use this for AI responses, user messages, task descriptions, etc.
 */
export function formatText(text: string | undefined | null): React.ReactNode {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Handle empty or whitespace-only strings
  if (!text.trim()) {
    return '';
  }
  
  // Convert newlines to JSX line breaks
  return nl2br(text);
}

/**
 * For text that should preserve formatting but not convert to JSX (useful for CSS)
 * @param text - The text to format (can be string, null, or undefined)
 * @returns Trimmed string or empty string for invalid inputs
 * 
 * @example
 * formatTextForCSS("  Hello\nWorld  ") // Returns: "Hello\nWorld"
 * formatTextForCSS(null) // Returns: ""
 * 
 * @usage Use this for CSS content, data attributes, or when you need plain text
 */
export function formatTextForCSS(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text.trim();
}

