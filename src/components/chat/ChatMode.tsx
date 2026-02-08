'use client';

import { useState, useCallback, useRef } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { ChatMessage } from '@/types';

export function useChatMode() {
  const { stream, isStreaming: isSSEStreaming } = useSSE();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2));
  const fullResponseRef = useRef('');
  const isProcessingRef = useRef(false);

  const sendMessage = useCallback(async (message: string) => {
    if (isSSEStreaming || isProcessingRef.current || !message.trim()) return;

    // Clear follow-up suggestions
    setFollowUpSuggestions([]);

    // Add user message immediately
    const userMsg: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);

    // Reset streaming state
    setStreamingContent('');
    fullResponseRef.current = '';
    isProcessingRef.current = true;
    setIsProcessing(true);

    const currentHistory = [...messages, userMsg];

    await stream('/api/chat', { message, sessionId, history: currentHistory }, (event) => {
      if (event.type === 'token' && event.content) {
        if (isProcessingRef.current) {
          isProcessingRef.current = false;
          setIsProcessing(false);
        }
        fullResponseRef.current += event.content;
        setStreamingContent(fullResponseRef.current);
      }

      if (event.type === 'done') {
        isProcessingRef.current = false;
        setIsProcessing(false);
        // Move streaming content to messages
        if (fullResponseRef.current) {
          setMessages(prev => [...prev, { role: 'assistant', content: fullResponseRef.current }]);
        }
        setStreamingContent('');
      }

      if (event.type === 'suggestions' && event.suggestions) {
        setFollowUpSuggestions(event.suggestions);
      }

      if (event.type === 'error' && event.message) {
        isProcessingRef.current = false;
        setIsProcessing(false);
        setStreamingContent('');
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${event.message}` }]);
      }
    });
  }, [stream, isSSEStreaming, messages, sessionId]);

  return {
    messages,
    streamingContent,
    isProcessing,
    isStreaming: isSSEStreaming || streamingContent.length > 0,
    sendMessage,
    followUpSuggestions,
  };
}
