'use client';

import { useState, useCallback } from 'react';
import { SessionInfo } from '@/types';

export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createSession = useCallback(async (): Promise<SessionInfo | null> => {
    if (session && session.expiresAt > Date.now()) return session;

    setIsCreating(true);
    try {
      const res = await fetch('/api/session', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create session');
      const data: SessionInfo = await res.json();
      setSession(data);
      return data;
    } catch {
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [session]);

  return { session, createSession, isCreating };
}
