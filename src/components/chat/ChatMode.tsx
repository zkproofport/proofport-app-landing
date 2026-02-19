'use client';

import { useState, useCallback, useRef } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { ChatMessage } from '@/types';

interface AISessionInfo {
  sessionId: string;
  sessionSecret: string;
}

export function useChatMode() {
  const { stream, isStreaming: isSSEStreaming } = useSSE();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<string[]>([]);
  const sessionRef = useRef<AISessionInfo | null>(null);
  const fullResponseRef = useRef('');
  const isProcessingRef = useRef(false);
  const stepsRef = useRef<string[]>([]);

  const sendMessage = useCallback(async (message: string) => {
    if (isSSEStreaming || isProcessingRef.current || !message.trim()) return;

    // Add user message immediately
    const userMsg: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);

    // Reset streaming state
    setStreamingContent('');
    setCurrentSteps([]);
    stepsRef.current = [];
    fullResponseRef.current = '';
    isProcessingRef.current = true;
    setIsProcessing(true);

    const reqBody: Record<string, string> = { message };
    if (sessionRef.current) {
      reqBody.sessionId = sessionRef.current.sessionId;
      reqBody.sessionSecret = sessionRef.current.sessionSecret;
    }

    await stream('/api/ai-chat', reqBody, (event) => {
      // Session event — save credentials for subsequent requests
      if (event.type === 'session') {
        const evt = event as unknown as { sessionId: string; sessionSecret: string };
        sessionRef.current = {
          sessionId: evt.sessionId,
          sessionSecret: evt.sessionSecret,
        };
        return;
      }

      // Step event (named SSE event from staging AI)
      if (event.type === 'step') {
        const stepMsg = event.message || event.content || '';
        if (stepMsg) {
          stepsRef.current = [...stepsRef.current, stepMsg];
          setCurrentSteps([...stepsRef.current]);
        }
        return;
      }

      // Done
      if (event.type === 'done') {
        isProcessingRef.current = false;
        setIsProcessing(false);
        if (fullResponseRef.current) {
          setMessages(prev => [...prev, { role: 'assistant', content: fullResponseRef.current }]);
        }
        setStreamingContent('');
        return;
      }

      // Error
      if (event.type === 'error') {
        isProcessingRef.current = false;
        setIsProcessing(false);
        setStreamingContent('');
        const errMsg = event.message || 'Unknown error';
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}` }]);
        return;
      }

      // Content chunk — OpenAI delta format or raw content
      // Try OpenAI format first: { choices: [{ delta: { content: "..." } }] }
      const raw = event as unknown as Record<string, unknown>;
      const delta = raw.choices
        ? (raw.choices as Array<{ delta?: { content?: string } }>)?.[0]?.delta
        : null;
      const chunk = delta?.content || event.content;

      if (chunk) {
        if (isProcessingRef.current) {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
        fullResponseRef.current += chunk;
        setStreamingContent(fullResponseRef.current);
      }
    });
  }, [stream, isSSEStreaming]);

  return {
    messages,
    streamingContent,
    isProcessing,
    isStreaming: isSSEStreaming || streamingContent.length > 0,
    sendMessage,
    followUpSuggestions: [] as string[],
    currentSteps,
  };
}
