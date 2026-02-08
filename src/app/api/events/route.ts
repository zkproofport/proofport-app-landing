import { logEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.event || typeof body.event !== 'string') {
      return Response.json({ error: 'Event name required' }, { status: 400 });
    }
    logEvent(body.event, body.data, request);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}
