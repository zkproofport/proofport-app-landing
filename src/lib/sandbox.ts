import { spawn } from 'child_process';
import { getSessionDir, checkDiskQuota } from './session-manager';
import { validateCommand, isCompileCommand } from './command-whitelist';
import { acquireCompileSemaphore, releaseCompileSemaphore } from './compile-semaphore';

const COMPILE_TIMEOUT = parseInt(process.env.COMPILE_TIMEOUT_SECONDS || '120', 10) * 1000;
const COMMAND_TIMEOUT = parseInt(process.env.COMMAND_TIMEOUT_SECONDS || '30', 10) * 1000;

interface ExecutionCallbacks {
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onDone: (exitCode: number) => void;
  onError: (error: string) => void;
}

export async function executeCommand(
  sessionId: string,
  command: string,
  callbacks: ExecutionCallbacks,
): Promise<void> {
  const sessionDir = getSessionDir(sessionId);
  if (!sessionDir) {
    callbacks.onError('Session not found or expired');
    return;
  }

  if (!checkDiskQuota(sessionId)) {
    callbacks.onError(`Disk quota exceeded (${process.env.SESSION_MAX_DISK_MB || '500'}MB limit)`);
    return;
  }

  const validation = validateCommand(command);
  if (!validation.valid || !validation.parsed) {
    callbacks.onError(validation.error || 'Invalid command');
    return;
  }

  const { binary, args } = validation.parsed;
  const isCompile = isCompileCommand(command);
  const timeout = isCompile ? COMPILE_TIMEOUT : COMMAND_TIMEOUT;

  if (isCompile) {
    if (!acquireCompileSemaphore()) {
      callbacks.onError('Compilation server busy, please try again in a moment');
      return;
    }
  }

  return new Promise<void>((resolve) => {
    const proc = spawn(binary, args, {
      cwd: sessionDir,
      timeout,
      env: { PATH: '/usr/local/bin:/usr/bin:/bin', HOME: '/tmp/bb-cache' } as unknown as NodeJS.ProcessEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let killed = false;

    const timeoutId = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, timeout);

    proc.stdout.on('data', (data: Buffer) => {
      callbacks.onStdout(data.toString());
    });

    proc.stderr.on('data', (data: Buffer) => {
      callbacks.onStderr(data.toString());
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      if (isCompile) releaseCompileSemaphore();
      if (killed) {
        callbacks.onError(`Command timed out after ${timeout / 1000}s`);
      } else {
        callbacks.onDone(code ?? 1);
      }
      resolve();
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      if (isCompile) releaseCompileSemaphore();
      callbacks.onError(`Execution error: ${err.message}`);
      resolve();
    });
  });
}
