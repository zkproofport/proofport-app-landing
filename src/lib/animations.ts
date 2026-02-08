export const TYPING_SPEED = 30; // ms per character
export const FAST_TYPING_SPEED = 15;
export const LINE_DELAY = 100; // ms between lines
export const SECTION_DELAY = 300; // ms before section starts
export const CONNECTION_LINE_DELAY = 600; // ms between connection animation lines
export const PROGRESS_DURATION = 1500; // ms for progress bar fill
export const CURSOR_BLINK_SPEED = 530; // ms

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
