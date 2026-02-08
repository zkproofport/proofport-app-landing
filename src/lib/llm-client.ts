import { getProviderForSession, getFallbackProvider } from './provider-router';
import { ProviderLimitError, type StreamCallbacks } from './llm-providers';

export type { StreamCallbacks };

export async function streamChatResponse(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  callbacks: StreamCallbacks,
  sessionId?: string,
): Promise<void> {
  const sid = sessionId || 'default';
  try {
    const provider = getProviderForSession(sid);
    console.log(`[LLM] session=${sid} provider=${provider.name}`);
    await provider.streamChat(systemPrompt, messages, callbacks);
  } catch (err) {
    if (err instanceof ProviderLimitError) {
      const fallback = getFallbackProvider(sid, err.provider);
      if (fallback) {
        console.log(`[LLM] session=${sid} fallback ${err.provider} → ${fallback.name}`);
        try {
          await fallback.streamChat(systemPrompt, messages, callbacks);
          return;
        } catch (fallbackErr) {
          callbacks.onError(fallbackErr instanceof Error ? fallbackErr.message : 'Fallback provider failed');
          return;
        }
      }
    }
    callbacks.onError(err instanceof Error ? err.message : 'No LLM provider available');
  }
}

export async function generateFollowUpQuestions(
  messages: { role: 'user' | 'assistant'; content: string }[],
  sessionId?: string,
): Promise<string[]> {
  const sid = sessionId || 'default';
  const systemPrompt = `Based on the conversation, generate exactly 3 follow-up questions the user might want to ask about ZKProofPort.

RULES:
- LANGUAGE: Match the language of the user's last message. If Korean, write in Korean. If English, write in English.
- Questions must be relevant to the conversation context
- Questions should be concise (under 40 characters each)
- Questions must be in question format (end with ?)
- Cover different aspects (don't repeat similar questions)
- Focus on: technology details, use cases, integration, pricing, security, architecture
- Return ONLY a JSON array of 3 strings, no markdown, no code blocks
- Example: ["Nullifier는 어떻게 작동해?", "SDK 설치 방법은?", "가격 정책이 어떻게 돼?"]`;

  const config = { maxOutputTokens: 150, temperature: 0.8 };

  try {
    const provider = getProviderForSession(sid);
    let text: string;
    try {
      text = await provider.generateJSON(systemPrompt, messages, config);
    } catch (err) {
      if (err instanceof ProviderLimitError) {
        const fallback = getFallbackProvider(sid, err.provider);
        if (fallback) {
          text = await fallback.generateJSON(systemPrompt, messages, config);
        } else {
          return [];
        }
      } else {
        return [];
      }
    }

    try {
      const parsed = JSON.parse(text.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3).filter((q: unknown) => typeof q === 'string');
      }
    } catch {
      // not valid JSON
    }
    return [];
  } catch {
    return [];
  }
}

export async function interpretCommand(
  userPrompt: string,
  sessionId?: string,
): Promise<{ explanation: string; steps: { description: string; command: string }[] } | { error: string }> {
  const sid = sessionId || 'default';
  const systemPrompt = `You are a ZK development assistant. The user describes what they want to do in natural language. Translate their request into a sequence of whitelisted commands.

Available commands:
- nargo new <name> -- Create a new Noir project
- nargo compile -- Compile a Noir circuit (outputs to target/<project_name>.json)
- nargo test -- Run circuit tests
- nargo check -- Check circuit for errors
- bb write_vk -b target/<project_name>.json -o target/vk -- Generate verification key (input MUST be target/<project_name>.json from nargo compile)
- cat <file> -- View a file (within session directory only)
- ls -- List files in current directory
- ls <dir> -- List files in a subdirectory

The default starter project name is "example", so nargo compile produces target/example.json.

Return ONLY a JSON object (no markdown, no code blocks):
{
  "explanation": "Brief explanation of what we'll do",
  "steps": [
    { "description": "Step description", "command": "the command" }
  ]
}

RULES:
- ONLY use commands from the whitelist above
- NEVER include commands that access network, environment vars, or files outside the session
- NEVER include rm -rf, sudo, or destructive commands
- For bb commands, always use the exact paths shown above (target/<project_name>.json, target/vk, target/Verifier.sol)
- Maximum 5 commands per request
- Note: nargo compile will NOT resolve external dependencies (no network access in sandbox). Only self-contained circuits will compile successfully.`;

  try {
    const provider = getProviderForSession(sid);
    let text: string;
    try {
      text = await provider.generateJSON(systemPrompt, [{ role: 'user', content: userPrompt }], {
        maxOutputTokens: 500,
      });
    } catch (err) {
      if (err instanceof ProviderLimitError) {
        const fallback = getFallbackProvider(sid, err.provider);
        if (fallback) {
          text = await fallback.generateJSON(systemPrompt, [{ role: 'user', content: userPrompt }], {
            maxOutputTokens: 500,
          });
        } else {
          return { error: 'All LLM providers are rate limited' };
        }
      } else {
        return { error: err instanceof Error ? err.message : 'Unknown error' };
      }
    }

    try {
      return JSON.parse(text);
    } catch {
      return { error: 'Failed to parse command interpretation' };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
