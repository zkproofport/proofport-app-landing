'use client';

interface Command {
  name: string;
  description: string;
  category: 'section' | 'mode' | 'utility';
}

const COMMANDS: Command[] = [
  { name: '/home', description: 'Welcome to ZKProofport', category: 'section' },
  { name: '/about', description: 'What is ZKProofport?', category: 'section' },
  { name: '/tech', description: 'Technology Stack', category: 'section' },
  { name: '/architecture', description: 'System Architecture', category: 'section' },
  { name: '/demos', description: 'Live Demonstrations', category: 'section' },
  { name: '/usecases', description: 'Use Cases & Applications', category: 'section' },
  { name: '/stats', description: 'Network Statistics', category: 'section' },
  { name: '/team', description: 'About Us', category: 'section' },
  { name: '/contact', description: 'Get in Touch', category: 'section' },
  { name: '/chat', description: 'Ask questions about ZKProofport', category: 'mode' },
  { name: '/develop', description: 'Interactive ZK proof playground', category: 'mode' },
  { name: '/demo', description: 'Open live demo (external)', category: 'mode' },
  { name: '/help', description: 'Show all commands', category: 'utility' },
  { name: '/clear', description: 'Clear terminal', category: 'utility' },
];

interface CommandPickerProps {
  filter: string;
  onSelect: (command: string) => void;
  onClose: () => void;
  selectedIndex: number;
}

export { COMMANDS };
export type { Command };

export default function CommandPicker({ filter, onSelect, onClose, selectedIndex }: CommandPickerProps) {
  const filtered = COMMANDS.filter(cmd =>
    cmd.name.slice(1).toLowerCase().startsWith(filter.toLowerCase())
  );

  if (filtered.length === 0) return null;

  const sections = filtered.filter(c => c.category === 'section');
  const modes = filtered.filter(c => c.category === 'mode');
  const utilities = filtered.filter(c => c.category === 'utility');

  let flatIndex = 0;

  const renderGroup = (label: string, items: Command[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="text-terminal-dim text-xs px-3 py-1 uppercase tracking-wider">{label}</div>
        {items.map((cmd) => {
          const idx = flatIndex++;
          const isSelected = idx === selectedIndex;
          return (
            <div
              key={cmd.name}
              className={`px-3 py-1 cursor-pointer flex justify-between gap-4 ${
                isSelected ? 'bg-terminal-text/10 text-terminal-text' : 'text-terminal-dim hover:bg-terminal-text/5'
              }`}
              onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.name); }}
            >
              <span className="text-terminal-cyan">{cmd.name}</span>
              <span className="text-terminal-dim text-sm truncate">{cmd.description}</span>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-terminal-bg border border-terminal-dim/30 rounded max-h-64 overflow-y-auto font-mono text-sm">
      {renderGroup('Sections', sections)}
      {renderGroup('Modes', modes)}
      {renderGroup('Utility', utilities)}
    </div>
  );
}
