'use client';

import { useState, useEffect, useRef } from 'react';

interface ProgressBarProps {
  progress: number;
  width?: number;
  label?: string;
  animated?: boolean;
  onComplete?: () => void;
}

export default function ProgressBar({
  progress,
  width = 30,
  label,
  animated = false,
  onComplete,
}: ProgressBarProps) {
  const [currentProgress, setCurrentProgress] = useState(animated ? 0 : progress);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!animated || currentProgress >= progress) {
      if (currentProgress >= progress && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const duration = 1500;
    const steps = 30;
    const increment = progress / steps;
    const stepDuration = duration / steps;

    const timer = setInterval(() => {
      setCurrentProgress((prev) => {
        const next = prev + increment;
        if (next >= progress) {
          clearInterval(timer);
          return progress;
        }
        return next;
      });
    }, stepDuration);

    return () => clearInterval(timer);
  }, [animated, progress, currentProgress, onComplete]);

  const filledCount = Math.round((currentProgress / 100) * width);
  const emptyCount = width - filledCount;

  const filled = '#'.repeat(filledCount);
  const empty = '-'.repeat(emptyCount);

  return (
    <pre className="text-terminal-text font-mono">
      {label && <>{label} </>}
      [<span className="text-terminal-cyan">{filled}</span>
      <span className="text-terminal-dim">{empty}</span>] {Math.round(currentProgress)}%
    </pre>
  );
}
