'use client';

import { TerminalMode } from '@/types';

interface TopBarProps {
  mode: TerminalMode;
  onModeChange: (mode: TerminalMode) => void;
  disabled?: boolean;
}

export default function TopBar({ mode, onModeChange, disabled }: TopBarProps) {
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.zkproofport.app';
  const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://dashboard.zkproofport.app';

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-terminal-bg border-b border-terminal-dim/30 text-xs md:text-sm font-mono">
      <div className="flex items-center gap-4">
        <span className="text-terminal-text font-bold tracking-wider">ZKProofPort</span>
        <div className="hidden md:flex items-center gap-1 ml-4">
          {(['browse', 'develop', 'chat'] as TerminalMode[]).map((m) => {
            const label: Record<TerminalMode, string> = { browse: 'Browser', develop: 'Develop', chat: 'Chat' };
            return (
              <button
                key={m}
                onClick={() => !disabled && onModeChange(m)}
                className={`px-3 py-1 rounded transition-colors ${
                  mode === m
                    ? 'bg-terminal-text/10 text-terminal-text'
                    : disabled
                      ? 'text-terminal-dim/40 cursor-not-allowed'
                      : 'text-terminal-dim hover:text-terminal-text/70'
                }`}
              >
                {label[m]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-terminal-cyan hover:text-terminal-text transition-colors"
        >
          Demo ↗
        </a>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-terminal-purple hover:text-terminal-text transition-colors"
        >
          Dashboard ↗
        </a>
      </div>
    </div>
  );
}
