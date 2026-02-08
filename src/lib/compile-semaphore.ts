let activeCompilations = 0;
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_COMPILES || '1', 10);

export function acquireCompileSemaphore(): boolean {
  if (activeCompilations >= MAX_CONCURRENT) return false;
  activeCompilations++;
  return true;
}

export function releaseCompileSemaphore(): void {
  activeCompilations = Math.max(0, activeCompilations - 1);
}

export function getActiveCompilations(): number {
  return activeCompilations;
}
