'use client';

import { forwardRef, KeyboardEvent, useState } from 'react';
import type { TerminalMode } from '@/types';
import TerminalPrompt from './TerminalPrompt';
import CommandPicker, { COMMANDS } from './CommandPicker';

interface TerminalInputProps {
  mode: TerminalMode;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled: boolean;
}

const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ mode, value, onChange, onSubmit, disabled }, ref) => {
    const [showPicker, setShowPicker] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commandCount = COMMANDS.length;

    const selectCommand = (command: string) => {
      setShowPicker(false);
      onChange('');
      onSubmit(command);
    };

    const closePicker = () => {
      setShowPicker(false);
      onChange('');
    };

    const handleChange = (newValue: string) => {
      if (mode === 'browse') {
        // In browse mode, only '/' opens the picker. No other input allowed.
        if (newValue === '/' && !showPicker) {
          setShowPicker(true);
          setSelectedIndex(0);
          onChange('/');
        }
        // Block all other input in browse mode
        return;
      }
      // Chat and build modes: allow everything
      onChange(newValue);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (showPicker) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % commandCount);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + commandCount) % commandCount);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (COMMANDS[selectedIndex]) {
            selectCommand(COMMANDS[selectedIndex].name);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closePicker();
          return;
        }
        // Block all other keys while picker is open
        e.preventDefault();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'browse') {
          // Empty enter in browse mode - advance section
          onSubmit('');
          return;
        }
        onSubmit(value);
      }
    };

    const placeholder = mode === 'browse'
      ? '/'
      : mode === 'chat'
      ? 'Ask a question about ZKProofPort...'
      : 'Describe what you want to develop...';

    return (
      <div className="relative flex items-center gap-2">
        <TerminalPrompt mode={mode} />

        {disabled ? (
          <span className="inline-block w-2 h-4 bg-terminal-text animate-pulse" />
        ) : (
          <>
            {showPicker && (
              <CommandPicker
                filter=""
                onSelect={selectCommand}
                onClose={closePicker}
                selectedIndex={selectedIndex}
              />
            )}
            <input
              ref={ref}
              type="text"
              value={showPicker ? '/' : (mode === 'browse' ? '' : value)}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-terminal-text font-mono placeholder:text-terminal-dim/40"
              placeholder={placeholder}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              readOnly={showPicker}
            />
          </>
        )}
      </div>
    );
  }
);

TerminalInput.displayName = 'TerminalInput';

export default TerminalInput;
