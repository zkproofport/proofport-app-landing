'use client';

import { useState, useCallback } from 'react';
import Terminal from '@/components/terminal/Terminal';
import ConnectionAnimation from '@/components/terminal/ConnectionAnimation';
import ChatView from '@/components/chat/ChatView';
import DevelopView from '@/components/develop/DevelopView';
import TopBar from '@/components/ui/TopBar';
import StatusBar from '@/components/ui/StatusBar';
import { useTerminal } from '@/hooks/useTerminal';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useChatMode } from '@/components/chat/ChatMode';
import { useDevelopMode } from '@/components/interactive/InteractiveTerminal';
import { sections } from '@/lib/terminal-content';

export default function Home() {
  const terminal = useTerminal();
  const [showConnection, setShowConnection] = useState(true);

  const chatMode = useChatMode();
  const developMode = useDevelopMode();

  const handleConnectionComplete = useCallback(() => {
    setShowConnection(false);
    terminal.onConnectionComplete();
  }, [terminal]);

  const handleEscape = useCallback(() => {
    if (terminal.mode !== 'browse') {
      terminal.setMode('browse');
    }
  }, [terminal]);

  const handleNumberKey = useCallback((num: number) => {
    terminal.navigateToSection(num);
  }, [terminal]);

  const handleInput = useCallback((input: string) => {
    const trimmed = input.trim();

    if (trimmed === '/exit' || trimmed === 'exit') {
      terminal.setMode('browse');
      return;
    }

    terminal.handleInput(input);
  }, [terminal]);

  const handleEnter = useCallback(() => {
    if (terminal.mode === 'browse') {
      terminal.handleEnter();
    }
  }, [terminal]);

  const handleChatMessage = useCallback((message: string) => {
    if (message.trim() === '/exit' || message.trim() === 'exit') {
      terminal.setMode('browse');
      return;
    }
    chatMode.sendMessage(message);
  }, [chatMode, terminal]);

  const handleDevelopPrompt = useCallback((prompt: string) => {
    if (prompt.trim() === '/exit' || prompt.trim() === 'exit') {
      terminal.setMode('browse');
      return;
    }
    developMode.executePrompt(prompt);
  }, [developMode, terminal]);

  useKeyboard({
    mode: terminal.mode,
    onEnter: handleEnter,
    onEscape: handleEscape,
    onNumberKey: handleNumberKey,
  });

  if (showConnection) {
    return (
      <div className="h-screen w-screen bg-terminal-bg flex flex-col">
        <div className="flex-1 p-4 md:p-8 font-mono text-[11px] md:text-xs">
          <ConnectionAnimation onComplete={handleConnectionComplete} />
        </div>
      </div>
    );
  }

  const isInputDisabled =
    terminal.isAnimating ||
    developMode.isStreaming ||
    developMode.isCreating;

  const isTabSwitchDisabled =
    terminal.isAnimating ||
    chatMode.isStreaming ||
    developMode.isStreaming ||
    developMode.isCreating;

  return (
    <div className="h-screen w-screen bg-terminal-bg flex flex-col">
      <TopBar mode={terminal.mode} onModeChange={terminal.setMode} disabled={isTabSwitchDisabled} />
      <div className="flex-1 overflow-hidden">
        {terminal.mode === 'browse' && (
          <Terminal
            lines={terminal.lines}
            mode={terminal.mode}
            isAnimating={terminal.isAnimating}
            onInput={handleInput}
            onEnter={handleEnter}
            inputValue={terminal.inputValue}
            onInputChange={terminal.setInputValue}
            inputDisabled={isInputDisabled}
          />
        )}
        {terminal.mode === 'chat' && (
          <ChatView
            messages={chatMode.messages}
            onSendMessage={handleChatMessage}
            isStreaming={chatMode.isStreaming}
            streamingContent={chatMode.streamingContent}
            isProcessing={chatMode.isProcessing}
            followUpSuggestions={chatMode.followUpSuggestions}
          />
        )}
        {terminal.mode === 'develop' && (
          <DevelopView
            onExecutePrompt={handleDevelopPrompt}
            isStreaming={developMode.isStreaming}
            isCreating={developMode.isCreating}
            lines={developMode.lines}
          />
        )}
      </div>
      <StatusBar
        mode={terminal.mode}
        sectionIndex={terminal.currentSectionIndex}
        totalSections={sections.length}
      />
    </div>
  );
}
