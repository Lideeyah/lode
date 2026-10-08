/**
 * Chain adapter. The only module that talks to the network.
 *
 * Every method degrades rather than throwing on a missing account, because
 * a fresh wallet with no miner PDA is the normal first-run case, not an
 * error.
 */
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  configPda,
  minerPda,
  decodeConfig,
  decodeMiner,
  associatedTokenAddress,
  type ConfigAccount,
  type MinerAccount,
} from './program';

export type ChallengeInfo = {
  challenge: Uint8Array;
  mint: PublicKey;
  slot: number;
  lastRotationSlot: bigint;
};

export type MinerInfo = {
  exists: boolean;
  cumulativeDifficulty: bigint;
  totalSessions: bigint;
  lastSubmissionSlot: bigint;
  nonceCounter: bigint;
};

export type Balances = { sol: number; lode: number };

export class ChainAdapter {
  constructor(private connection: Connection) {}

  /** Null when the program has not been initialised on this cluster yet. */
  async getConfig(): Promise<ConfigAccount | null> {
    try {
      const info = await this.connection.getAccountInfo(configPda());
      return info ? decodeConfig(info.data) : null;
    } catch {
      return null;
    }
  }

  async getChallenge(): Promise<ChallengeInfo | null> {
    const [config, slot] = await Promise.all([
      this.getConfig(),
      this.connection.getSlot().catch(() => 0),
    ]);
    if (!config) return null;
    return {
      challenge: config.challenge,
      mint: config.mint,
      slot,
      lastRotationSlot: config.lastRotationSlot,
    };
  }

  async getMiner(authority: PublicKey): Promise<MinerInfo> {
    const absent: MinerInfo = {
      exists: false,
      cumulativeDifficulty: 0n,
      totalSessions: 0n,
      lastSubmissionSlot: 0n,
      nonceCounter: 0n,
    };
    try {
      const info = await this.connection.getAccountInfo(minerPda(authority));
      if (!info) return absent;
      const m: MinerAccount = decodeMiner(info.data);
      return {
        exists: true,
        cumulativeDifficulty: m.cumulativeDifficulty,
        totalSessions: m.totalSessions,
        lastSubmissionSlot: m.lastSubmissionSlot,
        nonceCounter: m.nonceCounter,
      };
    } catch {
      return absent;
    }
  }

  async getBalances(authority: PublicKey, mint: PublicKey | null): Promise<Balances> {
    let sol = 0;
    let lode = 0;
    try {
      sol = (await this.connection.getBalance(authority)) / LAMPORTS_PER_SOL;
    } catch {
      // Leave at zero; the home screen shows a dash rather than a crash.
    }
    if (mint) {
      try {
        const ata = associatedTokenAddress(authority, mint);
        const bal = await this.connection.getTokenAccountBalance(ata);
        lode = bal.value.uiAmount ?? 0;
      } catch {
        // No token account yet simply means nothing has been mined.
      }
    }
    return { sol, lode };
  }

  async requestAirdrop(authority: PublicKey, sol = 1): Promise<string | null> {
    try {
      return await this.connection.requestAirdrop(authority, sol * LAMPORTS_PER_SOL);
    } catch {
      // Devnet faucets rate-limit constantly. Caller reports it plainly.
      return null;
    }
  }

  async confirm(signature: string): Promise<boolean> {
    try {
      const latest = await this.connection.getLatestBlockhash();
      const res = await this.connection.confirmTransaction(
        { signature, ...latest },
        'confirmed',
      );
      return !res.value.err;
    } catch {
      return false;
    }
  }
}
