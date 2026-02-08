const ALLOWED_BINARIES = new Set(['nargo', 'bb', 'cat', 'ls']);
const DANGEROUS_PATTERNS = /[;&|$`\n]|\$\(|\.\.|\.\//;

interface ParsedCommand {
  binary: string;
  args: string[];
  raw: string;
}

export function validateCommand(command: string): { valid: boolean; parsed?: ParsedCommand; error?: string } {
  const trimmed = command.trim();
  if (!trimmed) return { valid: false, error: 'Empty command' };
  if (trimmed.length > 500) return { valid: false, error: 'Command too long' };

  if (DANGEROUS_PATTERNS.test(trimmed)) {
    return { valid: false, error: 'Command contains disallowed characters' };
  }

  const parts = trimmed.split(/\s+/);
  const binary = parts[0];
  const args = parts.slice(1);

  if (!ALLOWED_BINARIES.has(binary)) {
    return { valid: false, error: `Command not allowed: ${binary}. Allowed: ${[...ALLOWED_BINARIES].join(', ')}` };
  }

  // Path traversal check
  for (const arg of args) {
    if (arg.includes('..') || arg.startsWith('/')) {
      return { valid: false, error: 'Path traversal not allowed' };
    }
  }

  return { valid: true, parsed: { binary, args, raw: trimmed } };
}

export function isCompileCommand(command: string): boolean {
  return command.trim().startsWith('nargo compile');
}
