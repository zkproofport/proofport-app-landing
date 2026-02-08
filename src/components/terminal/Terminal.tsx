'use client';

import { useEffect, useRef } from 'react';
import type { TerminalLine, TerminalMode } from '@/types';
import TerminalLineComponent from './TerminalLine';
import TerminalInput from './TerminalInput';

interface TerminalProps {
  lines: TerminalLine[];
  mode: TerminalMode;
  isAnimating: boolean;
  onInput: (input: string) => void;
  onEnter: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  inputDisabled: boolean;
}

export default function Terminal({
  lines,
  mode,
  isAnimating,
  onInput,
  onEnter,
  inputValue,
  onInputChange,
  inputDisabled,
}: TerminalProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new lines
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when clicking anywhere in terminal, but not when selecting text
  const handleTerminalClick = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    inputRef.current?.focus();
  };

  return (
    <div
      ref={terminalRef}
      className="w-full h-full flex flex-col bg-terminal-bg font-mono text-[11px] md:text-xs overflow-hidden"
      onClick={handleTerminalClick}
    >
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-0.5 select-text cursor-text"
      >
        {lines.map((line, index) => (
          <TerminalLineComponent key={index} line={line} />
        ))}
      </div>

      <div className="border-t border-terminal-dim/20 p-4 md:p-6">
        <TerminalInput
          ref={inputRef}
          mode={mode}
          value={inputValue}
          onChange={onInputChange}
          onSubmit={(value: string) => {
            if (value.trim()) {
              onInput(value);
            } else {
              onEnter();
            }
            onInputChange('');
          }}
          disabled={inputDisabled}
        />
      </div>
    </div>
  );
}
