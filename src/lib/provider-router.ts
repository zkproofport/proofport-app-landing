import { getAvailableProviders, type LLMProvider, type ProviderName } from './llm-providers';

const sessionProviderMap = new Map<string, ProviderName>();

export function getProviderForSession(sessionId: string): LLMProvider {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    throw new Error(
      'No LLM providers configured. Set at least one of: GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY',
    );
  }

  // Check existing assignment
  const assigned = sessionProviderMap.get(sessionId);
  if (assigned) {
    const provider = providers.find((p) => p.name === assigned);
    if (provider) return provider;
    // Provider no longer available or disabled, reassign
    sessionProviderMap.delete(sessionId);
  }

  // Priority-based: always use the first (highest priority) provider
  const provider = providers[0];
  sessionProviderMap.set(sessionId, provider.name);

  return provider;
}

/** Get a fallback provider for a session, excluding the failed one. Updates session mapping. */
export function getFallbackProvider(sessionId: string, failedProvider: ProviderName): LLMProvider | null {
  const providers = getAvailableProviders().filter((p) => p.name !== failedProvider);
  if (providers.length === 0) return null;

  const provider = providers[0];
  sessionProviderMap.set(sessionId, provider.name);

  return provider;
}

// Cleanup: cap session map size every 10 minutes to prevent unbounded growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (sessionProviderMap.size > 10000) {
      const entries = [...sessionProviderMap.entries()];
      const toRemove = entries.slice(0, entries.length - 5000);
      for (const [key] of toRemove) {
        sessionProviderMap.delete(key);
      }
    }
  }, 600_000);
}
