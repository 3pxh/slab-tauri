import React from 'react';

interface AnnouncementBarProps {
  title: string;
  body: string;
}

/**
 * Parses text and converts markdown-style links [text](url) and plain URLs to clickable links
 */
const parseLinks = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Pattern for markdown links: [text](url)
  const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownLinkPattern.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add the link
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={`link-${match.index}`}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-700 hover:text-blue-900 underline font-medium"
      >
        {linkText}
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    // Also check for plain URLs in the remaining text
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const remainingText = text.substring(lastIndex);
    let urlMatch;
    let urlLastIndex = 0;
    
    while ((urlMatch = urlPattern.exec(remainingText)) !== null) {
      // Add text before the URL
      if (urlMatch.index > urlLastIndex) {
        parts.push(remainingText.substring(urlLastIndex, urlMatch.index));
      }
      
      // Add the URL link
      const url = urlMatch[1];
      parts.push(
        <a
          key={`url-${lastIndex + urlMatch.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 hover:text-blue-900 underline font-medium"
        >
          {url}
        </a>
      );
      
      urlLastIndex = urlMatch.index + urlMatch[0].length;
    }
    
    // Add remaining text after URLs
    if (urlLastIndex < remainingText.length) {
      parts.push(remainingText.substring(urlLastIndex));
    }
  }
  
  return parts.length > 0 ? parts : [text];
};

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ title, body }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="text-base font-semibold text-blue-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-blue-800 leading-relaxed">
        {parseLinks(body)}
      </p>
    </div>
  );
};

