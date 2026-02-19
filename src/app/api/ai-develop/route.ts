import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AI_CHAT_URL = process.env.AI_CHAT_URL || 'https://stg-ai.zkproofport.app/v1/chat/completions';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip, 'execute');
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: rateCheck.message }), { status: 429 });
  }

  let body: { prompt: string; sessionId?: string; sessionSecret?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.length > 2000) {
    return new Response(JSON.stringify({ error: 'Prompt required (max 2000 chars)' }), { status: 400 });
  }

  // Build upstream request headers
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (body.sessionId) headers['X-Session-Id'] = body.sessionId;
  if (body.sessionSecret) headers['X-Session-Secret'] = body.sessionSecret;

  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: body.prompt }],
        model: 'zkproofport',
        stream: true,
      }),
    });
  } catch {
    return new Response(JSON.stringify({ error: 'AI service unavailable' }), { status: 502 });
  }

  if (!upstreamResp.ok) {
    const errorText = await upstreamResp.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: `AI error: ${upstreamResp.status}`, details: errorText }),
      { status: upstreamResp.status }
    );
  }

  // Extract session headers from upstream response
  const newSessionId = upstreamResp.headers.get('x-session-id');
  const newSessionSecret = upstreamResp.headers.get('x-session-secret');

  const reader = upstreamResp.body?.getReader();
  if (!reader) {
    return new Response(JSON.stringify({ error: 'No response body' }), { status: 502 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send session info as first event if present
      if (newSessionId) {
        const sessionEvent = JSON.stringify({
          type: 'session',
          sessionId: newSessionId,
          sessionSecret: newSessionSecret,
        });
        controller.enqueue(encoder.encode(`event: session\ndata: ${sessionEvent}\n\n`));
      }

      // Forward upstream SSE stream as-is (preserves event: step\ndata: ... format)
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch {
        // Stream error, close gracefully
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  });
}
