import { createSession } from '@/lib/session-manager';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { logEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const rateCheck = checkRateLimit(ip, 'execute');
  if (!rateCheck.allowed) {
    return Response.json({ error: rateCheck.message }, { status: 429 });
  }

  const result = createSession(ip);
  if ('error' in result) {
    return Response.json({ error: result.error }, { status: 429 });
  }

  logEvent('session_created', { sessionId: result.id }, request);

  return Response.json({
    sessionId: result.id,
    createdAt: result.createdAt,
    expiresAt: result.expiresAt,
  });
}
