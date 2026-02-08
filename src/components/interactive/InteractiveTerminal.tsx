'use client';

import { useState, useCallback, useRef } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { useSession } from '@/hooks/useSession';
import { playCompletionChime } from '@/lib/sounds';

// ---------------------------------------------------------------------------
// DevelopLine: the atomic unit for the Develop tab's Claude Code-style UI
// ---------------------------------------------------------------------------

export type DevelopLineType =
  | 'user'          // User's prompt (shown as "> prompt")
  | 'explanation'   // AI explanation text
  | 'step'          // Step header (e.g. "[1/3] Creating file...")
  | 'command'       // The actual command (e.g. "$ nargo compile")
  | 'stdout'        // Command stdout
  | 'stderr'        // Command stderr
  | 'step_done'     // Step result indicator
  | 'summary'       // Final summary
  | 'error'         // Error message
  | 'status';       // Status messages (creating session, interpreting...)

export interface DevelopLine {
  id: string;
  type: DevelopLineType;
  content: string;
  step?: number;
  total?: number;
  exitCode?: number;
}

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

// ---------------------------------------------------------------------------
// Hook: useDevelopMode
// ---------------------------------------------------------------------------

export function useDevelopMode() {
  const { stream, isStreaming: isSSEStreaming } = useSSE();
  const { session, createSession, isCreating } = useSession();
  const [lines, setLines] = useState<DevelopLine[]>([]);
  const isStreamingRef = useRef(false);

  const addLine = useCallback((type: DevelopLineType, content: string, extra?: Partial<DevelopLine>) => {
    setLines(prev => [...prev, { id: makeId(), type, content, ...extra }]);
  }, []);

  const executePrompt = useCallback(async (prompt: string) => {
    if (isSSEStreaming || isStreamingRef.current || !prompt.trim()) return;
    isStreamingRef.current = true;

    // Show user prompt
    addLine('user', prompt);

    // Ensure session exists
    let currentSession = session;
    if (!currentSession) {
      addLine('status', 'Initializing sandbox...');
      currentSession = await createSession();
      if (!currentSession) {
        addLine('error', 'Failed to create session. Please try again.');
        isStreamingRef.current = false;
        return;
      }
    }

    addLine('status', 'Thinking...');

    await stream('/api/execute', { sessionId: currentSession.sessionId, prompt }, (event) => {
      switch (event.type) {
        case 'explanation':
          if (event.content) {
            addLine('explanation', event.content);
          }
          break;
        case 'command':
          addLine('step', event.description || '', {
            step: event.step,
            total: event.total,
          });
          if (event.command) {
            addLine('command', event.command);
          }
          break;
        case 'stdout':
          if (event.content) {
            event.content.split('\n').forEach(line => {
              if (line.trim()) addLine('stdout', line);
            });
          }
          break;
        case 'stderr':
          if (event.content) {
            event.content.split('\n').forEach(line => {
              if (line.trim()) addLine('stderr', line);
            });
          }
          break;
        case 'command_done':
          addLine('step_done', event.exitCode === 0 ? 'completed' : 'failed', {
            step: event.step,
            exitCode: event.exitCode,
          });
          break;
        case 'done':
          if (event.summary) {
            addLine('summary', event.summary);
          }
          playCompletionChime();
          break;
        case 'error':
          addLine('error', event.message || 'Unknown error');
          break;
      }
    });

    isStreamingRef.current = false;
  }, [stream, isSSEStreaming, session, createSession, addLine]);

  return {
    lines,
    executePrompt,
    isStreaming: isSSEStreaming,
    isCreating,
  };
}
