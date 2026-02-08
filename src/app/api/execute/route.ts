import { interpretCommand } from '@/lib/llm-client';
import { executeCommand } from '@/lib/sandbox';
import { getSession } from '@/lib/session-manager';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isCompileCommand } from '@/lib/command-whitelist';
import { logEvent } from '@/lib/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const rateCheck = checkRateLimit(ip, 'execute');
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: rateCheck.message }), { status: 429 });
  }

  let body: { sessionId: string; prompt: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  if (!body.sessionId || !body.prompt || body.prompt.length > 500) {
    return new Response(JSON.stringify({ error: 'sessionId and prompt required (max 500 chars)' }), { status: 400 });
  }

  const session = getSession(body.sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found or expired' }), { status: 404 });
  }

  logEvent('build_command', { sessionId: body.sessionId }, request);

  const interpretation = await interpretCommand(body.prompt, body.sessionId);

  if ('error' in interpretation) {
    return new Response(JSON.stringify({ error: interpretation.error }), { status: 500 });
  }

  const { explanation, steps: rawSteps } = interpretation;
  const steps = rawSteps.slice(0, 5);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      send({ type: 'explanation', content: explanation });

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        // Only check compile rate limit when an actual compile command is encountered
        if (isCompileCommand(step.command)) {
          const compileCheck = checkRateLimit(ip, 'compile');
          if (!compileCheck.allowed) {
            send({ type: 'error', message: compileCheck.message });
            break;
          }
        }

        send({
          type: 'command',
          step: i + 1,
          total: steps.length,
          command: step.command,
          description: step.description,
        });

        await executeCommand(body.sessionId, step.command, {
          onStdout: (data) => send({ type: 'stdout', content: data }),
          onStderr: (data) => send({ type: 'stderr', content: data }),
          onDone: (exitCode) => send({ type: 'command_done', step: i + 1, exitCode }),
          onError: (error) => send({ type: 'error', message: error }),
        });
      }

      send({ type: 'done', summary: `All ${steps.length} steps completed` });
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
