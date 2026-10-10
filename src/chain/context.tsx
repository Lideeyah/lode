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
      setChallenge(ch);
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

  useEffect(() => {
    void refresh();
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
