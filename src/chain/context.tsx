/**
 * Chain context. Holds the config account, the current challenge, balances
 * and the miner record, refreshed on demand rather than polled.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useWallet } from '../wallet/useWallet';
import type { PublicKey } from '@solana/web3.js';
import { ChainAdapter, type Balances, type ChallengeInfo, type MinerInfo } from './adapter';

type ChainState = {
  adapter: ChainAdapter | null;
  authority: PublicKey | null;
  challenge: ChallengeInfo | null;
  miner: MinerInfo | null;
  balances: Balances;
  /** False when the program has not been deployed/initialised on devnet. */
  programReady: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<ChainState | null>(null);

export function ChainProvider({ children }: { children: ReactNode }) {
  const { account, connection } = useWallet();
  const authority = account?.publicKey ?? null;

  const adapter = useMemo(
    () => (connection ? new ChainAdapter(connection) : null),
    [connection],
  );

  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [miner, setMiner] = useState<MinerInfo | null>(null);
  const [balances, setBalances] = useState<Balances>({ sol: 0, lode: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!adapter) return;
    setLoading(true);
    try {
      const ch = await adapter.getChallenge();
      // Never erase a known-good challenge because one read failed. A
      // rate-limited response is not evidence the program went away, and
      // nulling it disables submission on a session that already mined.
      if (ch) setChallenge(ch);
      if (authority) {
        const [m, b] = await Promise.all([
          adapter.getMiner(authority),
          adapter.getBalances(authority, ch?.mint ?? null),
        ]);
        setMiner(m);
        setBalances(b);
      }
    } finally {
      setLoading(false);
    }
  }, [adapter, authority]);

  /**
   * Retry the first read until the config lands. The config account is
   * what unlocks mining and submission, so one rate-limited request must
   * not cost the session.
   *
   * `challenge` is deliberately read through a ref rather than listed as
   * a dependency: depending on it re-ran this effect on every successful
   * refresh, which triggered another refresh, which hammered the RPC
   * until it rate-limited.
   */
  const haveChallenge = useRef(false);
  haveChallenge.current = challenge !== null;

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const tick = async () => {
      if (cancelled) return;
      attempt += 1;
      await refresh();
    };
    void tick();
    const id = setInterval(() => {
      if (cancelled || haveChallenge.current || attempt > 8) return;
      void tick();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh]);

  const value: ChainState = {
    adapter,
    authority,
    challenge,
    miner,
    balances,
    programReady: challenge !== null,
    loading,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChain(): ChainState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChain must be used inside ChainProvider');
  return v;
}
