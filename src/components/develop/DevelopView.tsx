'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import type { DevelopLine } from '@/components/interactive/InteractiveTerminal';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DevelopViewProps {
  onExecutePrompt: (prompt: string) => void;
  isStreaming: boolean;
  isCreating: boolean;
  lines: DevelopLine[];
}

// ---------------------------------------------------------------------------
// Boot screen (State 1 — no lines yet)
// ---------------------------------------------------------------------------

function BootScreen() {
  return (
    <div className="flex-1 flex items-center justify-center select-none px-4">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        {/* ASCII shield */}
        <pre
          className="font-mono text-[11px] md:text-xs leading-[1.45] shrink-0"
          style={{ color: '#64748b' }}
          aria-hidden="true"
        >
{`    \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
    \u2551  \u2693   \u2551
    \u2551 \u2571   \u2572 \u2551
    \u2551\u2571  \u2b21  \u2572\u2551
    \u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d`}
        </pre>

        {/* Product info */}
        <div className="flex flex-col justify-center gap-1 text-center sm:text-left pt-0 sm:pt-1">
          <span className="text-terminal-cyan font-semibold text-xs md:text-sm tracking-tight">
            ZKProofPort Develop v0.1.0
          </span>
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            Noir Circuit Builder &middot; Gemini 2.5 Flash
          </span>
          <span className="text-xs" style={{ color: '#94a3b8' }}>
            ~/sandbox
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line renderer — Claude Code style
// ---------------------------------------------------------------------------

function DevelopLineRenderer({ line }: { line: DevelopLine }) {
  switch (line.type) {
    case 'user':
      return (
        <div className="flex gap-2 items-start mt-3 mb-1">
          <span className="text-terminal-cyan shrink-0 select-none font-bold">&rsaquo;</span>
          <span className="text-white font-semibold">{line.content}</span>
        </div>
      );

    case 'status':
      return (
        <div className="flex items-center gap-2 ml-4 my-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-terminal-cyan animate-pulse" />
          <span className="text-terminal-dim italic">{line.content}</span>
        </div>
      );

    case 'explanation':
      return (
        <div className="ml-4 my-2 text-[#d4d4d4] leading-relaxed whitespace-pre-wrap">
          {line.content}
        </div>
      );

    case 'step':
      return (
        <div className="flex items-center gap-2 ml-4 mt-3 mb-1">
          <span className="text-terminal-cyan font-bold text-[10px]">
            [{line.step}/{line.total}]
          </span>
          <span className="text-[#94a3b8]">{line.content}</span>
        </div>
      );

    case 'command':
      return (
        <div className="ml-6 my-0.5 px-3 py-1.5 rounded bg-[#1a1f2e] border border-terminal-dim/20">
          <span className="text-terminal-dim select-none">$ </span>
          <span className="text-[#e2e8f0]">{line.content}</span>
        </div>
      );

    case 'stdout':
      return (
        <pre className="ml-8 text-[#a3e635] whitespace-pre-wrap leading-[1.5]">
          {line.content}
        </pre>
      );

    case 'stderr':
      return (
        <pre className="ml-8 text-terminal-warning whitespace-pre-wrap leading-[1.5]">
          {line.content}
        </pre>
      );

    case 'step_done':
      return (
        <div className="flex items-center gap-2 ml-6 my-0.5">
          {line.exitCode === 0 ? (
            <>
              <span className="text-green-400">&#x2713;</span>
              <span className="text-green-400/80">Step {line.step} completed</span>
            </>
          ) : (
            <>
              <span className="text-terminal-error">&#x2717;</span>
              <span className="text-terminal-error/80">Step {line.step} failed (exit {line.exitCode})</span>
            </>
          )}
        </div>
      );

    case 'summary':
      return (
        <div className="ml-4 mt-3 mb-1 py-2 border-t border-terminal-dim/20">
          <span className="text-terminal-cyan">&#x2714;</span>{' '}
          <span className="text-[#d4d4d4]">{line.content}</span>
        </div>
      );

    case 'error':
      return (
        <div className="ml-4 my-1 text-terminal-error">
          <span className="font-bold">Error:</span> {line.content}
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Scrollable output (State 2)
// ---------------------------------------------------------------------------

function OutputArea({ lines }: { lines: DevelopLine[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines.length]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 md:px-6 pt-4 md:pt-6 pb-2 select-text cursor-text"
    >
      {lines.map((line) => (
        <DevelopLineRenderer key={line.id} line={line} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input bar (always visible at bottom)
// ---------------------------------------------------------------------------

interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  disabled: boolean;
  placeholder: string;
}

function InputBar({ value, onChange, onSubmit, disabled, placeholder }: InputBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) {
          onSubmit(trimmed);
        }
      }
    },
    [value, onSubmit],
  );

  // Focus input when wrapper is clicked (but not during text selection)
  const handleWrapperClick = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().length > 0) return;
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="border-t border-terminal-dim/30 px-4 md:px-6 py-3 md:py-4 shrink-0"
      onClick={handleWrapperClick}
    >
      <div className="flex items-center gap-2">
        {/* Prompt glyph */}
        <span className="text-terminal-cyan font-mono font-bold select-none shrink-0" aria-hidden="true">
          &#x203a;
        </span>

        {disabled ? (
          <span className="inline-block w-2 h-4 bg-terminal-text/80 animate-pulse rounded-sm" />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-terminal-text font-mono placeholder:text-terminal-dim/40"
            placeholder={placeholder}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DevelopView (main export)
// ---------------------------------------------------------------------------

export default function DevelopView({
  onExecutePrompt,
  isStreaming,
  isCreating,
  lines,
}: DevelopViewProps) {
  const [inputValue, setInputValue] = useState('');

  const isBoot = lines.length === 0;
  const isDisabled = isStreaming || isCreating;

  const handleSubmit = useCallback(
    (text: string) => {
      if (isDisabled) return;
      setInputValue('');
      onExecutePrompt(text);
    },
    [isDisabled, onExecutePrompt],
  );

  return (
    <div
      className="w-full h-full flex flex-col bg-terminal-bg font-mono text-[11px] md:text-xs overflow-hidden"
    >
      {isBoot ? (
        <>
          {/* Boot screen: centered shield + info */}
          <BootScreen />

          {/* Divider + input pinned at bottom */}
          <InputBar
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={isDisabled}
            placeholder={'Try "compile a simple age circuit"'}
          />
        </>
      ) : (
        <>
          {/* Active mode: scrollable output */}
          <OutputArea lines={lines} />

          {/* Divider + input pinned at bottom */}
          <InputBar
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={isDisabled}
            placeholder={'Describe what to build next...'}
          />
        </>
      )}
    </div>
  );
}
