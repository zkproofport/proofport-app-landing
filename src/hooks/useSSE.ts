'use client';

import { useState, useCallback, useRef } from 'react';
import { SSEEvent } from '@/types';

export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (
    url: string,
    body: object,
    onEvent: (event: SSEEvent) => void,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Skip SSE comments / heartbeat
          if (line.startsWith(':')) continue;

          // Track named event type (e.g. "event: step")
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);

            // Handle [DONE] sentinel
            if (dataStr === '[DONE]') {
              onEvent({ type: 'done' } as SSEEvent);
              currentEventType = null;
              continue;
            }

            try {
              const event: SSEEvent = JSON.parse(dataStr);
              // Override type if this data line was preceded by a named event
              if (currentEventType) {
                event.type = currentEventType;
              }
              onEvent(event);
            } catch {
              // skip malformed events
            }
            currentEventType = null;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { stream, abort, isStreaming, error };
}
