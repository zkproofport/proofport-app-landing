import { getClientIp } from '@/lib/rate-limiter';

interface AnalyticsEvent {
  event: string;
  data?: Record<string, unknown>;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

export function logEvent(event: string, data?: Record<string, unknown>, request?: Request): void {
  const entry: AnalyticsEvent = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  if (request) {
    entry.ip = getClientIp(request);
    entry.userAgent = request.headers.get('user-agent') || 'unknown';
  }

  console.log(JSON.stringify({ type: 'analytics', ...entry }));
}
