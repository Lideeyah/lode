/**
 * Session context. Lifts the session above the navigator so the
 * verification tab can read live features while the session screen runs,
 * which is what makes verification a real tab rather than a debug drawer.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSession } from './useSession';
import { useChain } from '../chain/context';

type SessionContext = ReturnType<typeof useSession>;

const Ctx = createContext<SessionContext | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { challenge, authority, miner } = useChain();

  /**
   * Both of these must be referentially stable.
   *
   * Building them inline produced a fresh object every render, and the
   * mining effect depends on them — so its ten second interval was torn
   * down and recreated on every render. The session republishes once a
   * second, so the interval never survived long enough to fire and
   * mining never ran at all, on any platform.
   */
  const authorityBytes = useMemo(
    () => (authority ? new Uint8Array(authority.toBytes()) : null),
    [authority?.toBase58()],
  );
  const challengeBytes = useMemo(
    () => challenge?.challenge ?? null,
    [challenge?.challenge],
  );

  const session = useSession(challengeBytes, authorityBytes, miner?.nonceCounter ?? 0n);
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}

export function useSessionContext(): SessionContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSessionContext must be used inside SessionProvider');
  return v;
}
