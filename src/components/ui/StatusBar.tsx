'use client';

import { TerminalMode } from '@/types';

interface StatusBarProps {
  mode: TerminalMode;
  sectionIndex: number;
  totalSections: number;
}

export default function StatusBar({ mode, sectionIndex, totalSections }: StatusBarProps) {
  const modeLabel = {
    browse: 'BROWSE',
    chat: 'CHAT',
    develop: 'MCP',
  }[mode];

  const modeColor = {
    browse: 'text-terminal-text',
    chat: 'text-terminal-purple',
    develop: 'text-terminal-warning',
  }[mode];

  return (
    <div className="flex items-center justify-between px-4 py-1 bg-terminal-bg border-t border-terminal-dim/30 text-xs font-mono text-terminal-dim">
      <div className="flex items-center gap-4">
        <span className={modeColor}>[{modeLabel}]</span>
        {mode === 'browse' && sectionIndex >= 0 && (
          <span>Section {sectionIndex + 1}/{totalSections}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>Press [Enter] to continue</span>
        <span className="hidden md:inline">Type &apos;help&apos; for commands</span>
      </div>
    </div>
  );
}
