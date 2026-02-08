'use client';

interface Section {
  id: string;
  path: string;
  title: string;
}

interface NavigationMenuProps {
  sections: Section[];
  currentIndex: number;
}

export default function NavigationMenu({ sections, currentIndex }: NavigationMenuProps) {
  return (
    <div className="space-y-0.5 font-mono">
      {sections.map((section, index) => {
        const isCurrent = index === currentIndex;
        return (
          <pre
            key={section.id}
            className={isCurrent ? 'text-terminal-text' : 'text-terminal-dim'}
          >
            {isCurrent ? '> ' : '  '}[{index}] {section.path.padEnd(15)} {section.title}
          </pre>
        );
      })}

      <pre className="text-terminal-dim mt-4">
        {''}
      </pre>

      <pre className="text-terminal-cyan">
        {'  /chat              Ask questions about ZKProofport'}
      </pre>
      <pre className="text-terminal-cyan">
        {'  /develop           Interactive ZK proof playground'}
      </pre>
      <pre className="text-terminal-cyan">
        {'  /demo              Open live demo (external)'}
      </pre>

      <pre className="text-terminal-dim mt-4">
        {''}
      </pre>

      <pre className="text-terminal-info">
        {'Press [Enter] to advance, or type a command.'}
      </pre>
    </div>
  );
}
