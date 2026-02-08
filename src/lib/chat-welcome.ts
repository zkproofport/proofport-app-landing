import { TerminalLine } from '@/types';

function makeLine(type: TerminalLine['type'], content: string, color?: string): TerminalLine {
  return { id: Math.random().toString(36).slice(2), type, content, color };
}

export function getChatWelcomeLines(): TerminalLine[] {
  return [
    makeLine('system', '', undefined),
    makeLine('system', '', undefined),
    makeLine('system', '                    ┌──────────────────────┐', 'text-terminal-purple'),
    makeLine('system', '                    │    ◆ ZKProofPort     │', 'text-terminal-cyan'),
    makeLine('system', '                    │       AI Chat        │', 'text-terminal-purple'),
    makeLine('system', '                    └──────────────────────┘', 'text-terminal-purple'),
    makeLine('system', '', undefined),
    makeLine('system', '        Zero-Knowledge Proof 전문 AI 어시스턴트입니다.', '#94a3b8'),
    makeLine('system', '        ZKProofPort의 기술, 활용 사례, 통합 방법에 대해', '#94a3b8'),
    makeLine('system', '        무엇이든 물어보세요.', '#94a3b8'),
    makeLine('system', '', undefined),
    makeLine('system', '', undefined),
    makeLine('system', '        ┌─ Quick Start ─────────────────────────────┐', 'text-terminal-cyan'),
    makeLine('system', '        │                                            │', 'text-terminal-dim'),
    makeLine('system', '        │  "ZKProofPort가 뭐야?"                      │', '#d4d4d4'),
    makeLine('system', '        │  "How does the proof generation work?"      │', '#d4d4d4'),
    makeLine('system', '        │  "SDK 연동 코드를 보여줘"                     │', '#d4d4d4'),
    makeLine('system', '        │                                            │', 'text-terminal-dim'),
    makeLine('system', '        └────────────────────────────────────────────┘', 'text-terminal-dim'),
    makeLine('system', '', undefined),
    makeLine('system', '', undefined),
  ];
}
