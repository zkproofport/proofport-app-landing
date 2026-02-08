'use client';

import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  skipAll?: boolean;
}

export default function TypewriterText({
  text,
  speed = 30,
  onComplete,
  className = '',
  skipAll = false,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (skipAll) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete, isComplete, skipAll]);

  const showCursor = !isComplete && !skipAll;

  return (
    <span className={className}>
      {displayedText}
      {showCursor && (
        <span className="inline-block w-2 h-4 bg-terminal-text animate-pulse ml-0.5" />
      )}
    </span>
  );
}
