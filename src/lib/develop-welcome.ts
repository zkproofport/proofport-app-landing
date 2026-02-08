import { TerminalLine } from '@/types';

function makeLine(type: TerminalLine['type'], content: string, color?: string): TerminalLine {
  return { id: Math.random().toString(36).slice(2), type, content, color };
}

export function getDevelopWelcomeLines(): TerminalLine[] {
  return [
    // Shield/anchor ASCII art
    makeLine('ascii', '        ╔═══════╗', '#64748b'),
    makeLine('ascii', '        ║   ⚓   ║        ZKProofPort Develop v0.1.0', '#64748b'),
    makeLine('ascii', '        ║  ╱ ╲  ║        Noir Circuit Builder · Gemini 2.5 Flash', '#64748b'),
    makeLine('ascii', '        ║ ╱ ⬡ ╲ ║        ~/sandbox', '#64748b'),
    makeLine('ascii', '        ║╱     ╲║', '#64748b'),
    makeLine('ascii', '        ║╲     ╱║', '#64748b'),
    makeLine('ascii', '        ║ ╲   ╱ ║', '#64748b'),
    makeLine('ascii', '        ╚═══════╝', '#64748b'),

    // Empty separator
    makeLine('ascii', '', undefined),

    // Hint line
    makeLine('info', '    › Try "compile a simple age circuit" or "what is noir?"', 'text-terminal-dim'),
  ];
}
