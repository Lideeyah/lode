/**
 * Session context. Lifts the session above the navigator so the
 * verification tab can read live features while the session screen runs,
 * which is what makes verification a real tab rather than a debug drawer.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useSession } from './useSession';
import { useChain } from '../chain/context';

type SessionContext = ReturnType<typeof useSession>;

const Ctx = createContext<SessionContext | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { challenge, authority } = useChain();
  const session = useSession(
    challenge?.challenge ?? null,
    authority ? new Uint8Array(authority.toBytes()) : null,
  );
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}

export function useSessionContext(): SessionContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSessionContext must be used inside SessionProvider');
  return v;
}
