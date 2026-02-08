'use client';

import type { TerminalMode } from '@/types';

interface TerminalPromptProps {
  mode: TerminalMode;
}

export default function TerminalPrompt({ mode }: TerminalPromptProps) {
  const prompts = {
    browse: <span className="text-terminal-cyan">visitor@zkproofport:~$</span>,
    chat: <span className="text-terminal-purple">visitor@zkproofport:/chat$</span>,
    develop: <span className="text-terminal-warning">dev@zkproofport:~/sandbox$</span>,
  };

  return <span className="whitespace-nowrap">{prompts[mode]} </span>;
}
