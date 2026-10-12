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

/**
 * The wallet operations the submission needs, scoped to one live
 * association. `capabilities` is the wallet's own answer about which
 * methods it implements, so the choice below is a reply to the wallet
 * rather than a guess about it.
 */
export type WalletOps = {
  capabilities: () => Promise<{ signTransactions: boolean; signAndSend: boolean }>;
  signAndSend: (tx: Transaction, minContextSlot: number) => Promise<string>;
  signOnly: (tx: Transaction) => Promise<Transaction>;
};

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
  /**
   * Runs `fn` inside a single, already-authorised wallet association.
   *
   * The caller owns the association because only one may be open at a
   * time; see the signing block below for what that cost us.
   */
  withWallet: <T>(fn: (w: WalletOps) => Promise<T>) => Promise<T>;
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
    withWallet,
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
     * One association, both attempts inside it.
     *
     * This is where every submission was failing. `signAndSend` and the
     * sign-only fallback each used to come from the wallet hook, and each
     * of those opens its own Mobile Wallet Adapter association. The
     * fallback fired the instant the primary rejected, so it tried to
     * associate while the first association was still tearing down —
     * only one may be open at a time — and was refused with
     * ERROR_AUTHORIZATION_FAILED. The wallet opened, authenticated and
     * returned with no approval sheet, because the sheet belonged to a
     * session that no longer existed.
     *
     * The -1 from that doomed second association was also what the retry
     * in app/summary.tsx matched on, so the retry re-ran this function
     * and made the same pair of back-to-back associations. The path could
     * not succeed, however many times it was tried.
     *
     * Now the caller opens one association, authorises it once, and both
     * attempts happen inside it. The fallback costs no wallet round trip
     * and cannot collide with anything.
     *
     * minContextSlot is 0 deliberately: it means "no constraint". Passing
     * a slot read from our own RPC asks the wallet's node to have caught
     * up to it, and a wallet whose node lags then refuses.
     */
    const signature = await withWallet(async (w) => {
      // Ask the wallet which methods it has rather than inferring it from
      // a failure. An earlier note in this file concluded that Phantom
      // does not implement sign_transactions; that was read off a failure
      // which actually happened during authorization, before any signing
      // was attempted, so it was never evidence of anything.
      const caps = await w
        .capabilities()
        .catch(() => ({ signTransactions: true, signAndSend: true }));

      // Sign-only first when available: the transaction then goes out
      // through our own devnet endpoint instead of the wallet's node,
      // which removes any dependence on which cluster the wallet is set
      // to. See chain/send.ts.
      if (caps.signTransactions) {
        try {
          const signed = await w.signOnly(tx);
          return await sendRawTransaction(signed.serialize());
        } catch (primary) {
          if (!caps.signAndSend) throw primary;
          try {
            return await w.signAndSend(tx, 0);
          } catch (fallback) {
            // Report both. Reporting only the fallback hid the real
            // failure and sent us chasing the wrong one for two builds.
            const a = primary instanceof Error ? primary.message : String(primary);
            const b = fallback instanceof Error ? fallback.message : String(fallback);
            throw new Error(`signTransactions: ${a} | signAndSend: ${b}`);
          }
        }
      }

      return await w.signAndSend(tx, 0);
    });

    void slot;
    return { ok: true, signature };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);

    // Mobile Wallet Adapter failures surface as opaque codes. Say what the
    // user can actually do about them.
    const friendly = /authorization request failed|-1\//i.test(raw)
      ? 'The wallet declined to authorise this request. Open the wallet, check that Lode is listed under its connected apps, and remove it there before trying again.'
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
