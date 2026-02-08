import { mkdirSync, rmSync, existsSync, statSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const SESSION_DIR = '/tmp/sessions';
const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_MINUTES || '15', 10) * 60 * 1000;
const MAX_SESSIONS_PER_IP = parseInt(process.env.MAX_SESSIONS_PER_IP || '3', 10);
const MAX_DISK_MB = parseInt(process.env.SESSION_MAX_DISK_MB || '500', 10);

interface Session {
  id: string;
  ip: string;
  createdAt: number;
  expiresAt: number;
  dir: string;
}

// Use globalThis to persist sessions across Next.js dev hot-reloads
const globalForSessions = globalThis as unknown as {
  __sessions: Map<string, Session>;
  __ipSessionCount: Map<string, number>;
};

if (!globalForSessions.__sessions) {
  globalForSessions.__sessions = new Map<string, Session>();
}
if (!globalForSessions.__ipSessionCount) {
  globalForSessions.__ipSessionCount = new Map<string, number>();
}

const sessions = globalForSessions.__sessions;
const ipSessionCount = globalForSessions.__ipSessionCount;

const STARTER_NARGO_TOML = `[package]
name = "example"
type = "bin"
authors = ["visitor"]

[dependencies]
`;

const STARTER_MAIN_NR = `fn main(x : Field, y : pub Field) {
    assert(x != y);
}
`;

const STARTER_PROVER_TOML = `x = "1"
y = "2"
`;

export function createSession(ip: string): Session | { error: string } {
  const count = ipSessionCount.get(ip) || 0;
  if (count >= MAX_SESSIONS_PER_IP) {
    return { error: `Maximum ${MAX_SESSIONS_PER_IP} sessions per IP. Please wait for existing sessions to expire.` };
  }

  const id = randomUUID();
  const dir = join(SESSION_DIR, id);
  const now = Date.now();

  try {
    mkdirSync(SESSION_DIR, { recursive: true });
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'src'), { recursive: true });

    writeFileSync(join(dir, 'Nargo.toml'), STARTER_NARGO_TOML);
    writeFileSync(join(dir, 'src', 'main.nr'), STARTER_MAIN_NR);
    writeFileSync(join(dir, 'Prover.toml'), STARTER_PROVER_TOML);
  } catch (err) {
    return { error: 'Failed to create session directory' };
  }

  const session: Session = {
    id,
    ip,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    dir,
  };

  sessions.set(id, session);
  ipSessionCount.set(ip, count + 1);

  return session;
}

export function getSession(sessionId: string): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  if (Date.now() > session.expiresAt) {
    cleanupSession(sessionId);
    return undefined;
  }
  return session;
}

export function getSessionDir(sessionId: string): string | undefined {
  return getSession(sessionId)?.dir;
}

function cleanupSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  try {
    if (existsSync(session.dir)) {
      rmSync(session.dir, { recursive: true, force: true });
    }
  } catch {
    // ignore cleanup errors
  }

  const count = ipSessionCount.get(session.ip) || 1;
  ipSessionCount.set(session.ip, Math.max(0, count - 1));
  sessions.delete(sessionId);
}

function getDirSizeMB(dir: string): number {
  let totalSize = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = join(entry.parentPath || dir, entry.name);
        try {
          totalSize += statSync(filePath).size;
        } catch {
          // skip unreadable files
        }
      }
    }
  } catch {
    return 0;
  }
  return totalSize / (1024 * 1024);
}

export function checkDiskQuota(sessionId: string): boolean {
  const session = getSession(sessionId);
  if (!session) return false;
  return getDirSizeMB(session.dir) < MAX_DISK_MB;
}

// Periodic cleanup of expired sessions
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now > session.expiresAt) {
        cleanupSession(id);
      }
    }
  }, 60_000);
}
