'use client';

import { useEffect, useCallback } from 'react';
import { TerminalMode } from '@/types';

interface UseKeyboardOptions {
  mode: TerminalMode;
  onEnter: () => void;
  onEscape: () => void;
  onNumberKey: (num: number) => void;
}

export function useKeyboard({ mode, onEnter, onEscape, onNumberKey }: UseKeyboardOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        onEscape();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'Enter':
        if (mode === 'browse') {
          onEnter();
          e.preventDefault();
        }
        break;
      case 'Escape':
        onEscape();
        e.preventDefault();
        break;
      default:
        if (mode === 'browse' && /^[0-8]$/.test(e.key)) {
          onNumberKey(parseInt(e.key, 10));
          e.preventDefault();
        }
        break;
    }
  }, [mode, onEnter, onEscape, onNumberKey]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
