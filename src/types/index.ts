export type TerminalMode = 'browse' | 'chat' | 'develop';

export type LineType = 'system' | 'input' | 'output' | 'error' | 'info' | 'ascii' | 'progress' | 'prompt';

export interface TerminalLine {
  id: string;
  type: LineType;
  content: string;
  color?: string;
  animated?: boolean;
  delay?: number;
}

export interface Section {
  id: string;
  path: string;
  title: string;
  lines: TerminalLine[];
}

export type SectionId = 'home' | 'about' | 'tech' | 'architecture' | 'demos' | 'usecases' | 'stats' | 'team' | 'contact';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SSEEvent {
  type: string;
  content?: string;
  message?: string;
  step?: number;
  total?: number;
  command?: string;
  description?: string;
  exitCode?: number;
  summary?: string;
  suggestions?: string[];
}

export interface SessionInfo {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}
