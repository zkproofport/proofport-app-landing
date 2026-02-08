'use client';

import { useState, useEffect, useCallback } from 'react';
import TypewriterText from './TypewriterText';
import ProgressBar from './ProgressBar';

interface ConnectionAnimationProps {
  onComplete: () => void;
}

interface TextStep {
  delay: number;
  text: string;
  color: string;
  type?: undefined;
}

interface ProgressStep {
  delay: number;
  type: 'progress';
  text?: undefined;
  color?: undefined;
}

interface CompleteStep {
  delay: number;
  type: 'complete';
  text?: undefined;
  color?: undefined;
}

type ConnectionStep = TextStep | ProgressStep | CompleteStep;

const connectionSteps: ConnectionStep[] = [
  { delay: 200, text: '$ ssh visitor@zkproofport.app', color: 'text-terminal-text' },
  { delay: 800, text: 'Connecting to zkproofport.app port 22...', color: 'text-terminal-cyan' },
  { delay: 600, text: 'SSH-2.0-ZKProofPort_1.0', color: 'text-terminal-cyan' },
  { delay: 400, text: 'Authenticating with public key...', color: 'text-terminal-cyan' },
  { delay: 500, text: 'Authentication successful.', color: 'text-terminal-text' },
  { delay: 300, type: 'progress' },
  { delay: 500, text: 'Connection established. Welcome to ZKProofPort.', color: 'text-terminal-text' },
  { delay: 300, text: '', color: 'text-white' },
  { delay: 200, type: 'complete' },
];

export default function ConnectionAnimation({ onComplete }: ConnectionAnimationProps) {
  const [visibleSteps, setVisibleSteps] = useState<ConnectionStep[]>([]);
  const [progressDone, setProgressDone] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    if (animationDone) return;

    let cancelled = false;
    const showSteps = async () => {
      for (let i = 0; i < connectionSteps.length; i++) {
        if (cancelled) return;
        const step = connectionSteps[i];

        await new Promise((resolve) => setTimeout(resolve, step.delay));
        if (cancelled) return;

        if (step.type === 'complete') {
          setAnimationDone(true);
          return;
        }

        if (step.type === 'progress') {
          setVisibleSteps((prev) => [...prev, step]);
          // Wait for progress bar to complete
          await new Promise<void>((resolve) => {
            const check = () => {
              // We'll use a ref-based approach via state
              // The progress bar takes ~1500ms
              setTimeout(resolve, 1800);
            };
            check();
          });
        } else {
          setVisibleSteps((prev) => [...prev, step]);
          // Wait for typewriter to finish (approximate: text.length * speed + buffer)
          const typingTime = (step.text?.length || 0) * 20 + 100;
          await new Promise((resolve) => setTimeout(resolve, typingTime));
        }
      }
    };

    showSteps();
    return () => { cancelled = true; };
  }, [animationDone]);

  useEffect(() => {
    if (animationDone) {
      onComplete();
    }
  }, [animationDone, onComplete]);

  const handleProgressComplete = useCallback(() => {
    setProgressDone(true);
  }, []);

  return (
    <div className="space-y-0.5">
      {visibleSteps.map((step, index) => (
        <div key={index}>
          {step.type === 'progress' ? (
            <ProgressBar
              progress={100}
              width={40}
              label="Initializing"
              animated
              onComplete={handleProgressComplete}
            />
          ) : (
            <pre className={`${step.color} font-mono`}>
              <TypewriterText
                text={step.text || ''}
                speed={20}
              />
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
