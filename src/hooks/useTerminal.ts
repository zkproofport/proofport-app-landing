'use client';

import { useReducer, useCallback, useRef } from 'react';
import { TerminalLine, TerminalMode, SectionId } from '@/types';
import { sections, sectionMenuItems } from '@/lib/terminal-content';
import { startTypewriter, stopTypewriter } from '@/lib/sounds';
interface TerminalState {
  lines: Record<TerminalMode, TerminalLine[]>;
  mode: TerminalMode;
  currentSectionIndex: number;
  isAnimating: boolean;
  connectionComplete: boolean;
  inputValue: Record<TerminalMode, string>;
}

type TerminalAction =
  | { type: 'ADD_LINES'; lines: TerminalLine[]; targetMode?: TerminalMode }
  | { type: 'REMOVE_LAST_LINES'; count: number }
  | { type: 'UPDATE_LAST_LINE'; content: string }
  | { type: 'SET_MODE'; mode: TerminalMode }
  | { type: 'SET_SECTION_INDEX'; index: number }
  | { type: 'SET_ANIMATING'; isAnimating: boolean }
  | { type: 'SET_CONNECTION_COMPLETE' }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'CLEAR' };

const initialState: TerminalState = {
  lines: { browse: [], chat: [], develop: [] },
  mode: 'browse',
  currentSectionIndex: -1,
  isAnimating: false,
  connectionComplete: false,
  inputValue: { browse: '', chat: '', develop: '' },
};

function makeLine(type: TerminalLine['type'], content: string, color?: string): TerminalLine {
  return { id: Math.random().toString(36).slice(2), type, content, color };
}

function reducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'ADD_LINES': {
      const target = action.targetMode ?? state.mode;
      return {
        ...state,
        lines: {
          ...state.lines,
          [target]: [...state.lines[target], ...action.lines],
        },
      };
    }
    case 'REMOVE_LAST_LINES': {
      const mode = state.mode;
      return {
        ...state,
        lines: {
          ...state.lines,
          [mode]: state.lines[mode].slice(0, -action.count),
        },
      };
    }
    case 'UPDATE_LAST_LINE': {
      const mode = state.mode;
      const modeLines = [...state.lines[mode]];
      if (modeLines.length > 0) {
        modeLines[modeLines.length - 1] = { ...modeLines[modeLines.length - 1], content: action.content };
      }
      return {
        ...state,
        lines: { ...state.lines, [mode]: modeLines },
      };
    }
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_SECTION_INDEX':
      return { ...state, currentSectionIndex: action.index };
    case 'SET_ANIMATING':
      return { ...state, isAnimating: action.isAnimating };
    case 'SET_CONNECTION_COMPLETE':
      return { ...state, connectionComplete: true };
    case 'SET_INPUT':
      return {
        ...state,
        inputValue: { ...state.inputValue, [state.mode]: action.value },
      };
    case 'CLEAR':
      return {
        ...state,
        lines: { ...state.lines, [state.mode]: [] },
      };
    default:
      return state;
  }
}

export function useTerminal() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const animationRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const addLines = useCallback((lines: TerminalLine[]) => {
    dispatch({ type: 'ADD_LINES', lines });
  }, []);

  const removeLastLines = useCallback((count: number) => {
    dispatch({ type: 'REMOVE_LAST_LINES', count });
  }, []);

  const updateLastLine = useCallback((content: string) => {
    dispatch({ type: 'UPDATE_LAST_LINE', content });
  }, []);

  const addSystemLine = useCallback((content: string) => {
    addLines([makeLine('system', content)]);
  }, [addLines]);

  const addOutputLine = useCallback((content: string, color?: string) => {
    addLines([makeLine('output', content, color)]);
  }, [addLines]);

  const addErrorLine = useCallback((content: string) => {
    addLines([makeLine('error', content)]);
  }, [addLines]);

  const setMode = useCallback((mode: TerminalMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  const navigateToSection = useCallback((index: number) => {
    if (index < 0 || index >= sections.length) return;

    // Cancel any ongoing animation and stop sound
    animationRef.current.cancelled = true;
    stopTypewriter();
    const animation = { cancelled: false };
    animationRef.current = animation;

    dispatch({ type: 'SET_ANIMATING', isAnimating: true });
    dispatch({ type: 'SET_SECTION_INDEX', index });

    const section = sections[index];

    // Show command echo immediately
    addLines([makeLine('input', `visitor@zkproofport:~$ ${section.path}`)]);

    // Start typewriter sound loop
    startTypewriter();

    // Stream section lines character-by-character
    const allLines = section.lines;
    let lineIndex = 0;

    const streamNextLine = () => {
      if (animation.cancelled) {
        stopTypewriter();
        return;
      }

      if (lineIndex < allLines.length) {
        const currentLine = allLines[lineIndex];

        // ASCII art and empty lines appear instantly
        if (currentLine.type === 'ascii' || !currentLine.content.trim()) {
          addLines([currentLine]);
          lineIndex++;
          setTimeout(streamNextLine, 35);
          return;
        }

        // Character-by-character typing for regular content
        const lineContent = currentLine.content;
        let charIndex = 0;

        // Add empty line first
        addLines([makeLine(currentLine.type, '', currentLine.color)]);

        const typeNextChar = () => {
          if (animation.cancelled) {
            stopTypewriter();
            return;
          }

          if (charIndex < lineContent.length) {
            updateLastLine(lineContent.slice(0, charIndex + 1));
            charIndex++;
            // Human-like rhythm: base 18ms + random jitter 0-14ms
            const delay = 18 + Math.floor(Math.random() * 15);
            setTimeout(typeNextChar, delay);
          } else {
            lineIndex++;
            setTimeout(streamNextLine, 35);
          }
        };

        typeNextChar();
      } else {
        // All lines done — stop typewriter sound
        stopTypewriter();
        addLines([
          makeLine('info', ''),
          makeLine('info', `  Press [Enter] for next section, or type a command.`),
        ]);
        dispatch({ type: 'SET_ANIMATING', isAnimating: false });
      }
    };

    // Start streaming after a short delay
    setTimeout(streamNextLine, 50);
  }, [addLines, updateLastLine]);

  const handleEnter = useCallback(() => {
    if (state.isAnimating) return;
    const nextIndex = state.currentSectionIndex + 1;
    if (nextIndex < sections.length) {
      navigateToSection(nextIndex);
    }
  }, [state.isAnimating, state.currentSectionIndex, navigateToSection]);

  const handleInput = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      handleEnter();
      return;
    }

    addLines([makeLine('input', `visitor@zkproofport:~$ ${trimmed}`)]);

    if (trimmed === '/chat' || trimmed === 'chat') {
      setMode('chat');
      return;
    }
    if (trimmed === '/develop' || trimmed === 'develop') {
      setMode('develop');
      return;
    }
    if (trimmed === '/exit' || trimmed === 'exit') {
      setMode('browse');
      return;
    }
    if (trimmed === '/demo' || trimmed === 'demo') {
      window.open(process.env.NEXT_PUBLIC_DEMO_URL || '/demo', '_blank');
      addLines([makeLine('system', 'Opening demo page in a new tab...')]);
      return;
    }
    if (trimmed === 'help' || trimmed === '/help') {
      addLines([
        makeLine('info', ''),
        ...sectionMenuItems.map((s) =>
          makeLine('info', `  [${s.index}] ${s.path.padEnd(16)} ${s.title}`)
        ),
        makeLine('info', ''),
        makeLine('info', '  /chat              Ask questions about ZKProofport'),
        makeLine('info', '  /develop           MCP interactive playground'),
        makeLine('info', '  /demo              Open live demo (external)'),
        makeLine('info', ''),
        makeLine('info', '  Press [Enter] to advance, or type a command.'),
      ]);
      return;
    }
    if (trimmed === 'clear') {
      dispatch({ type: 'CLEAR' });
      return;
    }

    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 0 && num <= 8) {
      navigateToSection(num);
      return;
    }

    const sectionIndex = sections.findIndex(s => s.path === `/${trimmed}` || s.path === trimmed || s.id === trimmed);
    if (sectionIndex !== -1) {
      navigateToSection(sectionIndex);
      return;
    }

    addLines([makeLine('error', `  Command not found: ${trimmed}. Type 'help' for available commands.`)]);
  }, [handleEnter, addLines, setMode, navigateToSection]);

  const onConnectionComplete = useCallback(() => {
    dispatch({ type: 'SET_CONNECTION_COMPLETE' });
    navigateToSection(0);
  }, [navigateToSection]);

  const setInputValue = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', value });
  }, []);

  return {
    ...state,
    lines: state.lines[state.mode],
    inputValue: state.inputValue[state.mode],
    addLines,
    removeLastLines,
    updateLastLine,
    addSystemLine,
    addOutputLine,
    addErrorLine,
    setMode,
    navigateToSection,
    handleEnter,
    handleInput,
    onConnectionComplete,
    setInputValue,
  };
}
