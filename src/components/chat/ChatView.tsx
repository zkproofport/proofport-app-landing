'use client';

import { useState, useMemo, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isStreaming: boolean;
  streamingContent: string;
  isProcessing: boolean;
  followUpSuggestions?: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SPINNER_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];
const SPINNER_SPEED = 80;

const ALL_SUGGESTIONS = [
  // Product
  'ZKProofPort\uAC00 \uBB50\uC57C?',
  'How does ZKProofPort work?',
  // Technology
  'Noir \uD68C\uB85C\uAC00 \uBB54\uAC00\uC694?',
  '\uC99D\uBA85 \uC0DD\uC131\uC5D0 \uC5BC\uB9C8\uB098 \uAC78\uB824?',
  'What is Barretenberg?',
  // Use Cases
  'KYC\uB97C \uC5B4\uB5BB\uAC8C \uD504\uB77C\uC774\uBC84\uC2DC \uBCF4\uD638\uD558\uB098\uC694?',
  '\uC5B4\uB5A4 dApp\uC5D0 \uD65C\uC6A9\uD560 \uC218 \uC788\uC5B4?',
  'ZKPSwap\uC774 \uBB50\uC57C?',
  // Integration
  'SDK \uC5F0\uB3D9\uC740 \uC5B4\uB5BB\uAC8C \uD574?',
  'API \uD0A4\uB294 \uC5B4\uB5BB\uAC8C \uBC1C\uAE09\uBC1B\uC544?',
  // Pricing
  '\uAC00\uACA9 \uC815\uCC45\uC774 \uC5B4\uB5BB\uAC8C \uB3FC?',
  'Is there a free tier?',
  // Security
  'Nullifier\uB294 \uC5B4\uB5BB\uAC8C \uC791\uB3D9\uD574?',
  '\uC628\uCCB4\uC778 \uAC80\uC99D\uC740 \uC5B4\uB5BB\uAC8C \uC774\uB8E8\uC5B4\uC838?',
  // Architecture
  '\uC804\uCCB4 \uC544\uD0A4\uD14D\uCC98\uB97C \uC124\uBA85\uD574\uC918',
  'What circuits are supported?',
];

/** Pick `count` random items from an array (Fisher-Yates partial shuffle). */
function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
    result.push(copy[i]);
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Braille spinner hook                                               */
/* ------------------------------------------------------------------ */

function useSpinner(active: boolean) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) { setFrame(0); return; }
    const id = setInterval(() => {
      setFrame(prev => (prev + 1) % SPINNER_FRAMES.length);
    }, SPINNER_SPEED);
    return () => clearInterval(id);
  }, [active]);

  return SPINNER_FRAMES[frame];
}

/* ------------------------------------------------------------------ */
/*  Auto-scroll hook                                                   */
/* ------------------------------------------------------------------ */

function useAutoScroll(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Use requestAnimationFrame so DOM has painted the new content first
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Rounded input bar shared by both welcome and chat states. */
function InputBar({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  autoFocus,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder: string;
  autoFocus?: boolean;
  suggestions?: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Cycle through suggestions every 3 seconds when input is empty
  useEffect(() => {
    if (!suggestions || suggestions.length === 0 || value.length > 0) {
      return;
    }
    const id = setInterval(() => {
      setSuggestionIndex(prev => (prev + 1) % suggestions.length);
    }, 3000);
    return () => clearInterval(id);
  }, [suggestions, value.length]);

  // Reset suggestion index when user types
  useEffect(() => {
    if (value.length > 0) {
      setSuggestionIndex(0);
    }
  }, [value.length]);

  const currentSuggestion = suggestions && suggestions.length > 0 ? suggestions[suggestionIndex] : placeholder;
  const showTabHint = suggestions && suggestions.length > 0 && value.length === 0;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      // Tab key handling for suggestion auto-fill
      if (e.key === 'Tab' && showTabHint && suggestions && suggestions.length > 0) {
        e.preventDefault();
        onChange(suggestions[suggestionIndex]);
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, showTabHint, suggestions, suggestionIndex, onChange],
  );

  // Focus the input when it mounts or when disabled flips to false
  useEffect(() => {
    if (!disabled && autoFocus) {
      // Small delay so transition animations don't steal focus
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [disabled, autoFocus]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={[
          'flex items-center gap-3 rounded-xl px-4 py-3',
          'bg-[#111827] border border-terminal-dim/30',
          'transition-colors duration-200',
          'focus-within:border-terminal-cyan/50',
          disabled ? 'opacity-60' : '',
        ].join(' ')}
      >
        {/* Diamond accent */}
        <span className="text-terminal-cyan text-sm shrink-0 select-none" aria-hidden>
          &#x25C6;
        </span>

        <div className="flex-1 relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={currentSuggestion}
            className={[
              'w-full bg-transparent border-none outline-none',
              'font-mono text-sm text-[#d4d4d4]',
              'placeholder:text-terminal-dim/50',
              'disabled:cursor-not-allowed',
            ].join(' ')}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoFocus={autoFocus}
          />
          {showTabHint && (
            <span className="absolute right-0 text-xs font-mono text-terminal-dim/30 pointer-events-none select-none">
              Tab ↵
            </span>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || value.trim().length === 0}
          aria-label="Send message"
          className={[
            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
            'transition-all duration-150',
            value.trim().length > 0 && !disabled
              ? 'bg-terminal-cyan/20 text-terminal-cyan hover:bg-terminal-cyan/30 cursor-pointer'
              : 'text-terminal-dim/30 cursor-not-allowed',
          ].join(' ')}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="translate-x-[0.5px]"
            aria-hidden
          >
            <path
              d="M3 13V3L14 8L3 13Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Single suggestion chip. */
function Chip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-full text-xs font-mono',
        'border border-terminal-dim/30 text-terminal-dim',
        'hover:border-terminal-cyan/50 hover:text-terminal-cyan',
        'active:scale-[0.97]',
        'transition-all duration-150 cursor-pointer',
        'whitespace-nowrap',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/** User message bubble (right-aligned). */
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className={[
          'max-w-[85%] md:max-w-[70%] px-4 py-3 rounded-2xl rounded-br-sm',
          'bg-[#1a1f3a] text-[#d4d4d4] text-sm font-mono',
          'leading-relaxed whitespace-pre-wrap break-words',
        ].join(' ')}
      >
        {content}
      </div>
    </div>
  );
}

/** Assistant message block (left-aligned, sparkle prefix). */
function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3 items-start max-w-[90%] md:max-w-[80%]">
      <span
        className="text-terminal-cyan text-sm mt-0.5 shrink-0 select-none"
        aria-hidden
      >
        &#x2726;
      </span>
      <div
        className={[
          'text-sm font-mono text-[#d4d4d4] leading-relaxed',
          'whitespace-pre-wrap break-words',
        ].join(' ')}
      >
        {content}
      </div>
    </div>
  );
}

/** Streaming assistant message with typewriter cursor. */
function AssistantStreaming({ content }: { content: string }) {
  return (
    <div className="flex gap-3 items-start max-w-[90%] md:max-w-[80%]">
      <span
        className="text-terminal-cyan text-sm mt-0.5 shrink-0 select-none"
        aria-hidden
      >
        &#x2726;
      </span>
      <div
        className={[
          'text-sm font-mono text-[#d4d4d4] leading-relaxed',
          'whitespace-pre-wrap break-words',
        ].join(' ')}
      >
        {content}
        <span className="inline-block w-[0.55em] h-[1.1em] bg-terminal-cyan/80 ml-[1px] align-middle cursor-blink" />
      </div>
    </div>
  );
}

/** Processing indicator (Braille spinner). */
function ProcessingIndicator({ spinner }: { spinner: string }) {
  return (
    <div className="flex gap-3 items-center">
      <span
        className="text-terminal-cyan text-sm shrink-0 select-none"
        aria-hidden
      >
        &#x2726;
      </span>
      <span className="text-sm font-mono text-terminal-cyan">
        {spinner}{' '}
        <span className="text-terminal-dim">Processing</span>
        <span className="inline-block animate-pulse text-terminal-dim">...</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Welcome screen                                                     */
/* ------------------------------------------------------------------ */

function WelcomeScreen({
  inputValue,
  onInputChange,
  onSubmit,
  onChipClick,
  disabled,
  initialChips,
}: {
  inputValue: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onChipClick: (text: string) => void;
  disabled: boolean;
  initialChips: string[];
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 min-h-0">
      {/* Top spacer */}
      <div className="flex-1 min-h-0" />

      {/* Greeting */}
      <div className="text-center mb-8 select-none">
        <h1 className="text-2xl md:text-3xl font-mono font-bold mb-3 tracking-tight">
          <span className="text-terminal-cyan">&#x25C6;</span>{' '}
          <span className="text-[#d4d4d4]">{'\uC548\uB155\uD558\uC138\uC694'}</span>
        </h1>
        <p className="text-lg md:text-xl font-mono text-terminal-dim">
          {'\uBB34\uC5C7\uC744 \uB3C4\uC640\uB4DC\uB9B4\uAE4C\uC694?'}
        </p>
      </div>

      {/* Input */}
      <div className="w-full mb-6">
        <InputBar
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={disabled}
          placeholder={'ZKProofPort\uC5D0\uAC8C \uBB3C\uC5B4\uBCF4\uAE30'}
          autoFocus
          suggestions={initialChips}
        />
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
        {initialChips.map(chip => (
          <Chip key={chip} label={chip} onClick={() => onChipClick(chip)} />
        ))}
      </div>

      {/* Bottom spacer */}
      <div className="flex-1 min-h-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat screen                                                        */
/* ------------------------------------------------------------------ */

function ChatScreen({
  messages,
  isStreaming,
  streamingContent,
  isProcessing,
  spinner,
  inputValue,
  onInputChange,
  onSubmit,
  onChipClick,
  disabled,
  followUpSuggestions,
  placeholderSuggestions,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isProcessing: boolean;
  spinner: string;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  onChipClick: (text: string) => void;
  disabled: boolean;
  followUpSuggestions: string[];
  placeholderSuggestions: string[];
}) {
  const showFollowUps = followUpSuggestions.length > 0 && !isStreaming && !isProcessing;

  const scrollRef = useAutoScroll([
    messages.length,
    streamingContent,
    isProcessing,
    followUpSuggestions.length,
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Scrollable message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5"
      >
        {/* Center content with max width */}
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.map((msg, idx) =>
            msg.role === 'user' ? (
              <UserBubble key={idx} content={msg.content} />
            ) : (
              <AssistantMessage key={idx} content={msg.content} />
            ),
          )}

          {/* Streaming response */}
          {isStreaming && streamingContent.length > 0 && (
            <AssistantStreaming content={streamingContent} />
          )}

          {/* Processing spinner (before first token) */}
          {isProcessing && !isStreaming && (
            <ProcessingIndicator spinner={spinner} />
          )}

          {/* Follow-up suggestion chips */}
          {showFollowUps && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {followUpSuggestions.map(suggestion => (
                <Chip key={suggestion} label={suggestion} onClick={() => onChipClick(suggestion)} />
              ))}
            </div>
          )}

          {/* Spacer so last message isn't glued to input */}
          <div className="h-2" aria-hidden />
        </div>
      </div>

      {/* Bottom input bar */}
      <div className="shrink-0 px-4 md:px-8 pb-4 pt-2 border-t border-terminal-dim/15">
        <InputBar
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          disabled={disabled}
          placeholder={'ZKProofPort\uC5D0\uAC8C \uBB3C\uC5B4\uBCF4\uAE30'}
          autoFocus
          suggestions={placeholderSuggestions}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ChatView component                                            */
/* ------------------------------------------------------------------ */

export default function ChatView({
  messages,
  onSendMessage,
  isStreaming,
  streamingContent,
  isProcessing,
  followUpSuggestions = [],
}: ChatViewProps) {
  const [inputValue, setInputValue] = useState('');
  const spinner = useSpinner(isProcessing && !isStreaming);

  // Pick 4 random suggestions on mount (stable across re-renders)
  const initialChips = useMemo(() => pickRandom(ALL_SUGGESTIONS, 4), []);

  // Use follow-up suggestions for placeholder cycling when available, else random selection
  const placeholderSuggestions = followUpSuggestions.length > 0
    ? followUpSuggestions
    : initialChips;

  const isBusy = isStreaming || isProcessing;
  const isWelcome = messages.length === 0 && !isProcessing && !isStreaming;

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isBusy) return;
    onSendMessage(trimmed);
    setInputValue('');
  }, [inputValue, isBusy, onSendMessage]);

  const handleChipClick = useCallback(
    (text: string) => {
      if (isBusy) return;
      onSendMessage(text);
    },
    [isBusy, onSendMessage],
  );

  return (
    <div className="w-full h-full flex flex-col bg-terminal-bg font-mono">
      {isWelcome ? (
        <WelcomeScreen
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          onChipClick={handleChipClick}
          disabled={isBusy}
          initialChips={initialChips}
        />
      ) : (
        <ChatScreen
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          isProcessing={isProcessing}
          spinner={spinner}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          onChipClick={handleChipClick}
          disabled={isBusy}
          followUpSuggestions={followUpSuggestions}
          placeholderSuggestions={placeholderSuggestions}
        />
      )}
    </div>
  );
}
