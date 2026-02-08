import { getSystemPrompt } from '@/lib/knowledge-base';
import { streamChatResponse, generateFollowUpQuestions } from '@/lib/llm-client';
import { checkRateLimit, checkSessionLimit, getClientIp } from '@/lib/rate-limiter';
import { logEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const rateCheck = checkRateLimit(ip, 'chat');
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: rateCheck.message }), { status: 429 });
  }

  let body: { message: string; sessionId?: string; history?: { role: 'user' | 'assistant'; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  if (!body.message || typeof body.message !== 'string' || body.message.length > 500) {
    return new Response(JSON.stringify({ error: 'Message required (max 500 chars)' }), { status: 400 });
  }

  if (body.sessionId) {
    const sessionCheck = checkSessionLimit(body.sessionId);
    if (!sessionCheck.allowed) {
      return new Response(JSON.stringify({ error: sessionCheck.message }), { status: 429 });
    }
  }

  logEvent('chat_message', { ip }, request);

  const systemPrompt = getSystemPrompt();
  const messages = [
    ...(body.history || []),
    { role: 'user' as const, content: body.message },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let hadError = false;

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      await streamChatResponse(systemPrompt, messages, {
        onToken: (token) => send({ type: 'token', content: token }),
        onDone: () => {
          send({ type: 'done' });
        },
        onError: (error) => {
          hadError = true;
          send({ type: 'error', message: error });
        },
      }, body.sessionId);

      // Generate follow-up suggestions only on success
      if (!hadError) {
        try {
          const suggestions = await generateFollowUpQuestions(messages, body.sessionId);
          if (suggestions.length > 0) {
            send({ type: 'suggestions', suggestions });
          }
        } catch {
          // Suggestions are optional, don't fail the response
        }
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
