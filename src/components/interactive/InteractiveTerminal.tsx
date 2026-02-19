'use client';

import { useState, useCallback, useRef } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { SSEEvent } from '@/types';

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
  | 'status';       // Status messages (connecting...)

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

function stripProofportBlock(content: string): string {
  let cleaned = content.replace(/\n?\n?```proofport\n[\s\S]*?\n```\s*$/g, '');
  cleaned = cleaned.replace(/\n?\n?```proofport[\s\S]*$/g, '');
  return cleaned.trimEnd();
}

interface SessionInfo {
  sessionId: string;
  sessionSecret: string;
}

// ---------------------------------------------------------------------------
// Hook: useDevelopMode
// ---------------------------------------------------------------------------

export function useDevelopMode() {
  const { stream, isStreaming: isSSEStreaming } = useSSE();
  const [lines, setLines] = useState<DevelopLine[]>([]);
  const isStreamingRef = useRef(false);
  const sessionRef = useRef<SessionInfo | null>(null);
  const contentRef = useRef('');

  const addLine = useCallback((type: DevelopLineType, content: string, extra?: Partial<DevelopLine>) => {
    setLines(prev => [...prev, { id: makeId(), type, content, ...extra }]);
  }, []);

  // Update the last explanation line instead of adding new ones (for streaming text)
  const updateOrAddExplanation = useCallback((text: string) => {
    setLines(prev => {
      const lastIdx = prev.length - 1;
      if (lastIdx >= 0 && prev[lastIdx].type === 'explanation') {
        const updated = [...prev];
        updated[lastIdx] = { ...updated[lastIdx], content: text };
        return updated;
      }
      return [...prev, { id: makeId(), type: 'explanation', content: text }];
    });
  }, []);

  const executePrompt = useCallback(async (prompt: string) => {
    if (isSSEStreaming || isStreamingRef.current || !prompt.trim()) return;
    isStreamingRef.current = true;
    contentRef.current = '';

    // Show user prompt
    addLine('user', prompt);
    addLine('status', 'Connecting to proveragent.eth...');

    const reqBody: Record<string, string> = { prompt };
    if (sessionRef.current) {
      reqBody.sessionId = sessionRef.current.sessionId;
      reqBody.sessionSecret = sessionRef.current.sessionSecret;
    }

    let stepCount = 0;

    await stream('/api/ai-develop', reqBody, (event: SSEEvent) => {
      // Session event
      if (event.type === 'session') {
        const ev = event as SSEEvent & { sessionId?: string; sessionSecret?: string };
        if (ev.sessionId) {
          sessionRef.current = {
            sessionId: ev.sessionId,
            sessionSecret: ev.sessionSecret || '',
          };
        }
        return;
      }

      // Step event — show as command-style step
      if (event.type === 'step') {
        stepCount++;
        const stepMsg = event.message || event.content || '';
        addLine('command', stepMsg);
        return;
      }

      // Content chunk — OpenAI delta format
      const ev = event as SSEEvent & { choices?: Array<{ delta?: { content?: string } }> };
      if (ev.choices?.[0]?.delta?.content) {
        contentRef.current += ev.choices[0].delta.content;
        updateOrAddExplanation(stripProofportBlock(contentRef.current));
        return;
      }

      // Done
      if (event.type === 'done') {
        if (stepCount > 0) {
          addLine('summary', `Completed with ${stepCount} step(s)`);
        }
        return;
      }

      // Error
      if (event.type === 'error') {
        const errMsg = event.message || 'Unknown error';
        addLine('error', errMsg);
        return;
      }
    });

    isStreamingRef.current = false;
  }, [stream, isSSEStreaming, addLine, updateOrAddExplanation]);

  return {
    lines,
    executePrompt,
    isStreaming: isSSEStreaming,
    isCreating: false, // No more session creation needed
  };
}
