'use client';

import type { TerminalLine } from '@/types';

interface TerminalLineProps {
  line: TerminalLine;
}

const colorMap: Record<string, string> = {
  system: 'text-terminal-cyan',
  input: 'text-terminal-text',
  output: 'text-white',
  error: 'text-terminal-error',
  info: 'text-terminal-dim',
  ascii: 'text-terminal-text',
  progress: 'text-terminal-cyan',
  prompt: 'text-terminal-purple',
};

export default function TerminalLine({ line }: TerminalLineProps) {
  const isRawColor = line.color?.startsWith('#') || line.color?.startsWith('rgb');
  const colorClass = isRawColor ? '' : (line.color || colorMap[line.type] || 'text-white');
  const style = isRawColor ? { color: line.color } : undefined;

  return (
    <pre className={`${colorClass} whitespace-pre-wrap font-mono`} style={style}>
      {line.content}
    </pre>
  );
}
