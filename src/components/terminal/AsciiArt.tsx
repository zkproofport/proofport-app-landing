'use client';

interface AsciiArtProps {
  art: string;
  color?: string;
  className?: string;
}

export default function AsciiArt({ art, color = 'text-terminal-text', className = '' }: AsciiArtProps) {
  return (
    <pre className={`${color} font-mono ${className} overflow-x-auto`}>
      {art}
    </pre>
  );
}
