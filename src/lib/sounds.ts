/**
 * Sound effects for terminal animations
 * - Typewriter: loops an MP3 file during typing, stops when done
 * - Completion chime: Web Audio API generated tone
 */

// ---------------------------------------------------------------------------
// AudioContext singleton (for completion chime)
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

// ---------------------------------------------------------------------------
// Typewriter sound (MP3 loop)
// ---------------------------------------------------------------------------

let typewriterAudio: HTMLAudioElement | null = null;

function getTypewriterAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (!typewriterAudio) {
    typewriterAudio = new Audio('/sounds/typewriter.mp3');
    typewriterAudio.loop = true;
    typewriterAudio.volume = 0.4;
  }

  return typewriterAudio;
}

/** Start playing the typewriter loop. Safe to call multiple times. */
export function startTypewriter(): void {
  const audio = getTypewriterAudio();
  if (!audio) return;

  // If already playing, do nothing
  if (!audio.paused) return;

  // Start from a random position for variety
  audio.currentTime = Math.random() * Math.max(0, audio.duration - 2 || 0);
  audio.play().catch(() => {
    // Autoplay blocked — will work after user interaction
  });
}

/** Stop the typewriter loop with a quick fade-out. */
export function stopTypewriter(): void {
  const audio = getTypewriterAudio();
  if (!audio || audio.paused) return;

  // Quick fade-out over 150ms
  const startVol = audio.volume;
  const fadeSteps = 6;
  const fadeInterval = 25; // 6 * 25ms = 150ms
  let step = 0;

  const fade = setInterval(() => {
    step++;
    audio.volume = Math.max(0, startVol * (1 - step / fadeSteps));
    if (step >= fadeSteps) {
      clearInterval(fade);
      audio.pause();
      audio.volume = startVol; // reset for next play
    }
  }, fadeInterval);
}

// Legacy export — no longer used but kept for compatibility
export function playKeystroke(): void {}

// ---------------------------------------------------------------------------
// Completion chime (Web Audio generated)
// ---------------------------------------------------------------------------

export function playCompletionChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First note: E5 (659.25 Hz)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 659.25;

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.12);

  // Second note: A5 (880 Hz)
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 880;

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now + 0.08);
  gain2.gain.linearRampToValueAtTime(0.15, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.2);
}
