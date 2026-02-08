export type ProviderName = 'gemini' | 'openai' | 'anthropic';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

/** Thrown when a provider hits rate/token/quota limits. Signals fallback is needed. */
export class ProviderLimitError extends Error {
  constructor(public provider: ProviderName, public status: number, message: string) {
    super(message);
    this.name = 'ProviderLimitError';
  }
}

const LIMIT_STATUS_CODES = new Set([429, 413, 529, 503]);

function isLimitError(status: number): boolean {
  return LIMIT_STATUS_CODES.has(status);
}

/** Check if an error response body indicates a billing/quota issue (e.g. Anthropic 400 with credit balance error). */
async function isBillingError(response: Response): Promise<boolean> {
  try {
    const text = await response.clone().text();
    return text.includes('credit balance') || text.includes('insufficient_quota') || text.includes('billing');
  } catch {
    return false;
  }
}

export interface LLMProvider {
  name: ProviderName;
  streamChat(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    callbacks: StreamCallbacks,
  ): Promise<void>;
  generateJSON(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    config?: { maxOutputTokens?: number; temperature?: number },
  ): Promise<string>;
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

const GEMINI_MODEL = 'gemini-2.5-flash';

class GeminiProvider implements LLMProvider {
  name: ProviderName = 'gemini';

  private url(stream: boolean): string {
    const apiKey = process.env.GEMINI_API_KEY;
    const method = stream ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:${method}key=${apiKey}`;
  }

  private toContents(messages: { role: 'user' | 'assistant'; content: string }[]) {
    return messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  }

  async streamChat(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const response = await fetch(this.url(true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: this.toContents(messages),
        generationConfig: { maxOutputTokens: 500 },
      }),
    });

    if (!response.ok) {
      if (isLimitError(response.status)) {
        throw new ProviderLimitError('gemini', response.status, `Gemini rate/quota limit: ${response.status}`);
      }
      callbacks.onError(`Gemini API error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) callbacks.onToken(text);
          } catch {
            // skip malformed events
          }
        }
      }
    }
    callbacks.onDone();
  }

  async generateJSON(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    config?: { maxOutputTokens?: number; temperature?: number },
  ): Promise<string> {
    const response = await fetch(this.url(false), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: this.toContents(messages),
        generationConfig: {
          maxOutputTokens: config?.maxOutputTokens ?? 500,
          ...(config?.temperature !== undefined && { temperature: config.temperature }),
        },
      }),
    });

    if (!response.ok) {
      if (isLimitError(response.status)) {
        throw new ProviderLimitError('gemini', response.status, `Gemini rate/quota limit: ${response.status}`);
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

const OPENAI_MODEL = 'gpt-4.1-mini';

class OpenAIProvider implements LLMProvider {
  name: ProviderName = 'openai';

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async streamChat(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (isLimitError(response.status) || await isBillingError(response)) {
        throw new ProviderLimitError('openai', response.status, `OpenAI rate/quota limit: ${response.status}`);
      }
      callbacks.onError(`OpenAI API error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) callbacks.onToken(text);
          } catch {
            // skip malformed events
          }
        }
      }
    }
    callbacks.onDone();
  }

  async generateJSON(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    config?: { maxOutputTokens?: number; temperature?: number },
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: false,
        max_tokens: config?.maxOutputTokens ?? 500,
        ...(config?.temperature !== undefined && { temperature: config.temperature }),
      }),
    });

    if (!response.ok) {
      if (isLimitError(response.status) || await isBillingError(response)) {
        throw new ProviderLimitError('openai', response.status, `OpenAI rate/quota limit: ${response.status}`);
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

class AnthropicProvider implements LLMProvider {
  name: ProviderName = 'anthropic';

  private headers(): Record<string, string> {
    return {
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }

  async streamChat(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        system: systemPrompt,
        messages,
        stream: true,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (isLimitError(response.status) || await isBillingError(response)) {
        throw new ProviderLimitError('anthropic', response.status, `Anthropic rate/quota limit: ${response.status}`);
      }
      callbacks.onError(`Anthropic API error: ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ') && currentEvent === 'content_block_delta') {
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.delta?.text;
            if (text) callbacks.onToken(text);
          } catch {
            // skip malformed events
          }
        }
      }
    }
    callbacks.onDone();
  }

  async generateJSON(
    systemPrompt: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    config?: { maxOutputTokens?: number; temperature?: number },
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        system: systemPrompt,
        messages,
        stream: false,
        max_tokens: config?.maxOutputTokens ?? 500,
        ...(config?.temperature !== undefined && { temperature: config.temperature }),
      }),
    });

    if (!response.ok) {
      if (isLimitError(response.status) || await isBillingError(response)) {
        throw new ProviderLimitError('anthropic', response.status, `Anthropic rate/quota limit: ${response.status}`);
      }
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }
}

// ---------------------------------------------------------------------------
// Provider Configuration (priority order: lower = higher priority)
// ---------------------------------------------------------------------------

interface ProviderConfig {
  name: ProviderName;
  enabled: boolean;
  envKey: string;
  factory: () => LLMProvider;
}

const PROVIDER_CONFIG: ProviderConfig[] = [
  { name: 'gemini', enabled: true, envKey: 'GEMINI_API_KEY', factory: () => new GeminiProvider() },
  { name: 'openai', enabled: true, envKey: 'OPENAI_API_KEY', factory: () => new OpenAIProvider() },
  { name: 'anthropic', enabled: false, envKey: 'ANTHROPIC_API_KEY', factory: () => new AnthropicProvider() },
];

// ---------------------------------------------------------------------------
// Factory — returns providers in priority order (first = primary)
// ---------------------------------------------------------------------------

export function getAvailableProviders(): LLMProvider[] {
  return PROVIDER_CONFIG
    .filter((cfg) => cfg.enabled && process.env[cfg.envKey])
    .map((cfg) => cfg.factory());
}
