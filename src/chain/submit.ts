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
import { CLUSTER } from '../wallet/config';

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
  /**
   * Whether the wallet authorised for the cluster we asked for.
   *
   * False means it refused our cluster and authorised without one, so it
   * is signing for whichever cluster it is actually set to. Signing is
   * still fine — we broadcast through our own endpoint — but asking it to
   * sign *and send* would put the transaction on its cluster, not ours.
   */
  chainAuthorized: boolean;
};

/**
 * The wallet refused to authorise for our cluster, and refused again when
 * asked without one.
 *
 * Thrown by the caller's `withWallet` before any signing is attempted, so
 * nothing has been submitted when it arrives. Mobile Wallet Adapter has no
 * distinct error code for an unsupported cluster — everything is -1 — so
 * the two refusals together are what tells us which it was.
 */
export class ClusterRefusedError extends Error {
  constructor(readonly cluster: string, readonly cause?: unknown) {
    super(`The wallet declined to authorise for ${cluster}.`);
    this.name = 'ClusterRefusedError';
  }
}

export type SubmitOutcome =
  | { ok: true; signature: string }
  | { ok: false; reason: 'rotated' | 'failed' | 'funds' | 'cluster'; message: string };

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

      // Sign-and-send is only safe when the wallet authorised for our
      // cluster. If it refused and authorised without one, it is set to
      // some other cluster, and asking it to send would put this
      // transaction there. Signing alone is unaffected: the bytes are the
      // same and we broadcast them ourselves. See chain/send.ts.
      const canSend = caps.signAndSend && w.chainAuthorized;

      // Sign-only first when available: the transaction then goes out
      // through our own devnet endpoint instead of the wallet's node,
      // which removes any dependence on which cluster the wallet is set
      // to.
      if (caps.signTransactions) {
        try {
          const signed = await w.signOnly(tx);
          return await sendRawTransaction(signed.serialize());
        } catch (primary) {
          if (!canSend) throw primary;
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

      // Nothing left but sign-and-send, and it cannot be trusted to land
      // on our cluster. This is the one case where the wallet's cluster
      // setting genuinely blocks the submission.
      if (!w.chainAuthorized) throw new ClusterRefusedError(CLUSTER);

      return await w.signAndSend(tx, 0);
    });

    void slot;
    return { ok: true, signature };
  } catch (e) {
    /**
     * The wallet authorises for other clusters but not ours, so testnet
     * mode is genuinely the thing to fix and this is the one place we can
     * say so. Everywhere else the advice would be a guess: Mobile Wallet
     * Adapter answers -1 for every refusal, and telling someone who has
     * already enabled testnet mode to go and enable it just sends them
     * round the same loop again.
     */
    if (e instanceof ClusterRefusedError) {
      return {
        ok: false,
        reason: 'cluster',
        message:
          `The wallet authorised, but not for ${CLUSTER}, and it cannot sign ` +
          `without also sending — so the transaction would land on whichever ` +
          `cluster the wallet is set to. Turn on testnet mode and select ` +
          `Solana ${CLUSTER} in the wallet's developer settings, then submit again.`,
      };
    }

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
