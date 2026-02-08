const ipRequests = new Map<string, { count: number; resetAt: number }>();
const sessionMessages = new Map<string, number>();

/** Extract client IP from request headers. Handles proxies, Cloudflare, and direct connections. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function checkRateLimit(ip: string, type: 'chat' | 'execute' | 'compile'): { allowed: boolean; message?: string } {
  const now = Date.now();
  const limits = {
    chat: { max: 30, windowMs: 60_000, label: '30 messages per minute' },
    execute: { max: 10, windowMs: 3600_000, label: '10 executions per hour' },
    compile: { max: 5, windowMs: 3600_000, label: '5 compilations per hour' },
  };

  const limit = limits[type];
  const key = `${ip}:${type}`;
  const entry = ipRequests.get(key);

  if (!entry || now > entry.resetAt) {
    ipRequests.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit.max) {
    return { allowed: false, message: `Rate limit exceeded: ${limit.label}. Please try again later.` };
  }

  entry.count++;
  return { allowed: true };
}

export function checkSessionLimit(sessionId: string, maxMessages: number = 20): { allowed: boolean; message?: string } {
  const count = sessionMessages.get(sessionId) || 0;
  if (count >= maxMessages) {
    return { allowed: false, message: `Session message limit reached (${maxMessages}). Please refresh the page.` };
  }
  sessionMessages.set(sessionId, count + 1);
  return { allowed: true };
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipRequests) {
      if (now > entry.resetAt) ipRequests.delete(key);
    }
  }, 300_000);
}
