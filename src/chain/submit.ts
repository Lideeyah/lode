/**
 * The two chain actions that close a session, in order: sign the effort
 * claim, then submit.
 *
 * Signing is free and instant and carries no transaction. On a Seeker this
 * routes to the Seed Vault Wallet through Mobile Wallet Adapter.
 */
import { Transaction, PublicKey, type Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { buildSubmitInstruction, featureDigest, type EffortClaim } from './program';
import { getBlockhash, getSlot } from './blockhash';

export type ClaimPayload = EffortClaim & { authority: string };

/**
 * The signed message. Deliberately human-readable: a reviewer who dumps
 * this from the wallet should be able to see exactly what was attested.
 */
export function encodeClaimMessage(c: ClaimPayload): Uint8Array {
  const lines = [
    'Lode effort claim',
    `authority:${c.authority}`,
    `from:${Math.floor(c.startedAt / 1000)}`,
    `to:${Math.floor(c.endedAt / 1000)}`,
    `windows:${c.windowCount}`,
    `confidence:${Math.round(c.meanConfidence * 10000)}`,
    `features:${Buffer.from(c.featureDigest).toString('hex')}`,
  ];
  return new Uint8Array(Buffer.from(lines.join('\n'), 'utf8'));
}

export type SubmitOutcome =
  | { ok: true; signature: string }
  | { ok: false; reason: 'rotated' | 'failed' | 'funds'; message: string };

export async function submitSolution(params: {
  connection: Connection;
  authority: PublicKey;
  mint: PublicKey;
  nonce: bigint;
  difficulty: number;
  claim: EffortClaim;
  signAndSend: (tx: Transaction, minContextSlot: number) => Promise<string>;
  /** Challenge the solution was found against, to detect a mid-session rotation. */
  challengeAtMine: Uint8Array;
  currentChallenge: Uint8Array;
}): Promise<SubmitOutcome> {
  const {
    connection,
    authority,
    mint,
    nonce,
    difficulty,
    claim,
    signAndSend,
    challengeAtMine,
    currentChallenge,
  } = params;

  const same =
    challengeAtMine.length === currentChallenge.length &&
    challengeAtMine.every((b, i) => b === currentChallenge[i]);
  if (!same) {
    return {
      ok: false,
      reason: 'rotated',
      message:
        'The challenge rotated while this session was running, so the solution is stale. Run another session against the new challenge.',
    };
  }

  try {
    // A courtesy check, not a gate. If the balance cannot be read — a
    // rate-limited or flaky RPC — go ahead and submit anyway: the node
    // will reject an underfunded transaction with a clear reason, and
    // refusing to try would throw away a real solution over a failed
    // read.
    const balance = await connection.getBalance(authority).catch(() => null);
    if (balance !== null && balance < 5_000) {
      return {
        ok: false,
        reason: 'funds',
        message: `Not enough devnet SOL for fees. Balance is ${(balance / 1e9).toFixed(6)} SOL.`,
      };
    }

    const ix = buildSubmitInstruction({ authority, mint, nonce, difficulty, claim });
    const [{ blockhash, lastValidBlockHeight }, slot] = await Promise.all([
      getBlockhash(connection),
      getSlot(connection),
    ]);

    const tx = new Transaction();
    tx.add(ix);
    tx.feePayer = authority;
    tx.recentBlockhash = blockhash;
    void lastValidBlockHeight;

    const signature = await signAndSend(tx, slot);
    return { ok: true, signature };
  } catch (e) {
    return {
      ok: false,
      reason: 'failed',
      message:
        e instanceof Error
          ? e.message
          : 'The transaction did not go through. The effort is kept, so you can retry.',
    };
  }
}

export { featureDigest };
