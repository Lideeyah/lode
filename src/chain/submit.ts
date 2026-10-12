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
import { sendRawTransaction } from './send';

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
  /** Signs without broadcasting. Preferred: see chain/send.ts. */
  signOnly?: (tx: Transaction) => Promise<Transaction>;
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
    signOnly,
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

    /**
     * Let the wallet sign and send.
     *
     * Not sign-only, despite that being the cleaner design. Phantom's
     * Mobile Wallet Adapter implementation supports authorize and
     * sign_and_send_transactions; it does not implement sign_messages or
     * sign_transactions, and when asked for one it returns an error
     * without ever showing an approval sheet — the wallet opens,
     * authenticates, and bounces straight back.
     *
     * minContextSlot is 0 deliberately: it means "no constraint". Passing
     * a slot read from our own RPC asks the wallet's node to have caught
     * up to it, and a wallet whose node lags then refuses.
     */
    let signature: string;
    try {
      signature = await signAndSend(tx, 0);
    } catch (primary) {
      if (!signOnly) throw primary;
      try {
        // A wallet that declines sign-and-send may still sign alone.
        const signed = await signOnly(tx);
        signature = await sendRawTransaction(signed.serialize());
      } catch (fallback) {
        // Report both. Reporting only the fallback hid the real failure
        // and sent us chasing the wrong one for two builds.
        const a = primary instanceof Error ? primary.message : String(primary);
        const b = fallback instanceof Error ? fallback.message : String(fallback);
        throw new Error(`signAndSend: ${a} | ${b}`);
      }
    }
    void slot;
    return { ok: true, signature };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);

    // Mobile Wallet Adapter failures surface as opaque codes. Say what the
    // user can actually do about them.
    const friendly = /authorization request failed|-1\//i.test(raw)
      ? 'The wallet refused the request. Check that a Solana wallet is installed, that it is unlocked, and that it is switched to devnet — most wallets need testnet mode enabled before they will authorise a devnet app.'
      : /no wallet|not found|activity/i.test(raw)
        ? 'No compatible wallet responded. Install a Solana wallet that supports Mobile Wallet Adapter, such as Phantom or Solflare.'
        : raw;

    // Keep the original text as well. The friendly line is a guess at the
    // cause; the raw one is what actually happened, and without it a
    // failure report is unactionable.
    const message = friendly === raw ? raw : `${friendly}\n\n[${raw}]`;

    return { ok: false, reason: 'failed', message };
  }
}

export { featureDigest };
