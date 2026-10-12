/**
 * Session summary and submission.
 *
 * The reward landing is the one moment this app is allowed to perform: the
 * amount arrives, the session's trace draws itself once from left to right,
 * and everything settles. That is the shot the video ends on.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWallet } from '../src/wallet/useWallet';
import { Buffer } from 'buffer';
import {
  PrimaryButton,
  SecondaryButton,
  Readout,
  StatPair,
  Label,
  Card,
  Divider,
} from '../src/components/primitives';
import { TracePanel } from '../src/components/TracePanel';
import { useSessionContext } from '../src/session/context';
import { TRACE_RANGE } from '../src/session/useSession';
import { useChain } from '../src/chain/context';
import { encodeClaimMessage, submitSolution, type WalletOps } from '../src/chain/submit';
import type { Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  SolanaMobileWalletAdapterProtocolError,
  SolanaMobileWalletAdapterProtocolErrorCode,
} from '@solana-mobile/mobile-wallet-adapter-protocol';
import { CHAIN } from '../src/wallet/config';
import { featureDigest } from '../src/chain/program';
import { downsampleTrace, saveSession, summariseFeatures, updateSession } from '../src/storage';
import { color, space, type as t } from '../src/theme/tokens';

type Stage = 'review' | 'signing' | 'submitting' | 'done' | 'error';

/** Reward scaling must mirror the program's, or the UI lies about the payout. */
const rewardFor = (difficulty: number) => Math.pow(2, Math.max(0, difficulty - 8)) * 0.1;

/**
 * A wallet refusal of `authorize`, raised before anything is signed.
 *
 * Mobile Wallet Adapter reports every refusal as -1, so this carries no
 * meaning beyond "the wallet said no to this authorize"; what it was
 * refusing is worked out by asking a second time. See withWallet below.
 */
class AuthorizeRefused extends Error {
  constructor(readonly reason: unknown) {
    super(reason instanceof Error ? reason.message : String(reason));
    this.name = 'AuthorizeRefused';
  }
}

const isAuthorizationFailed = (e: unknown) =>
  e instanceof SolanaMobileWalletAdapterProtocolError &&
  e.code === SolanaMobileWalletAdapterProtocolErrorCode.ERROR_AUTHORIZATION_FAILED;

export default function SummaryScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const {
    signMessage,
    connectAnd,
    connection,
    chain,
    identity,
  } = useWallet();
  const { authority, challenge, refresh } = useChain();
  const { snapshot, best, trace, machine, challengeAtStart } = useSessionContext();

  const [stage, setStage] = useState<Stage>('review');
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [storedId, setStoredId] = useState<string | null>(null);

  // The trace drawn for the reward landing, revealed left to right.
  const [revealed, setRevealed] = useState(0);
  const sessionTrace = useMemo(() => downsampleTrace(trace, 64), [trace]);

  const persisted = useRef(false);

  const digest = useMemo(
    () => featureDigest(summariseFeatures(machine.records())),
    [machine],
  );

  // Persist immediately on arrival: the effort was real whether or not the
  // network later cooperates.
  useEffect(() => {
    if (persisted.current) return;
    persisted.current = true;
    void (async () => {
      const s = await saveSession({
        startedAt: snapshot.startedAt ?? Date.now(),
        endedAt: Date.now(),
        durationSeconds: snapshot.elapsedSeconds,
        effort: snapshot.effort,
        meanConfidence: snapshot.meanConfidence,
        windowCount: snapshot.windowCount,
        difficulty: best?.difficulty ?? 0,
        nonce: best ? best.nonce.toString() : '0',
        trace: sessionTrace,
        signature: null,
        amount: null,
        featureDigest: Buffer.from(digest).toString('hex'),
      });
      setStoredId(s.id);
    })();
  }, [snapshot, best, sessionTrace, digest]);

  // Reward landing: draw the trace once, then settle.
  useEffect(() => {
    if (stage !== 'done') return;
    setRevealed(0);
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= sessionTrace.length) {
          clearInterval(id);
          return r;
        }
        return r + 2;
      });
    }, 16);
    return () => clearInterval(id);
  }, [stage, sessionTrace.length]);

  /**
   * One Mobile Wallet Adapter association, authorised once, handed to the
   * submission to do all of its signing inside.
   *
   * Two things here are deliberate.
   *
   * First, the association is opened here rather than per operation. The
   * wallet hook's `signTransaction` and `signAndSendTransaction` each open
   * their own, and the submission needed two of them back to back, which
   * cannot work: only one association may be open at a time and teardown
   * is not instant. See the signing block in chain/submit.ts.
   *
   * Second, `authorize` is called with no `auth_token`. The hook's own
   * authorise always replays the token cached at connect, and a wallet
   * that declines it answers -1 and closes its activity — the library then
   * retries a fresh authorise on a session the wallet has already left, so
   * no approval sheet is ever drawn. Asking fresh is the same request the
   * first connect makes, which is the one that has always worked.
   */
  const withWallet = useCallback(
    async <T,>(fn: (w: WalletOps) => Promise<T>): Promise<T> => {
      const ops = (w: Web3MobileWallet, chainAuthorized: boolean): WalletOps => ({
        chainAuthorized,
        capabilities: async () => {
          const caps = await w.getCapabilities();
          const features: readonly string[] = caps.features ?? [];
          // A wallet on the legacy protocol publishes no features array
          // and answers the deprecated booleans instead. sign_transactions
          // is mandatory in that protocol, so its absence from `features`
          // only means something on a wallet that sends the array at all.
          return {
            signTransactions:
              features.length === 0 ||
              features.includes('solana:signTransactions'),
            signAndSend:
              features.includes('solana:signAndSendTransaction') ||
              caps.supports_sign_and_send_transactions === true,
          };
        },
        signAndSend: async (tx, minContextSlot) => {
          const sigs = await w.signAndSendTransactions({
            minContextSlot,
            transactions: [tx],
          });
          return sigs[0];
        },
        signOnly: async (tx) => {
          const signed = await w.signTransactions({ transactions: [tx] });
          return signed[0];
        },
      });

      const open = (requestChain: boolean) =>
        (connectAnd as unknown as (
          cb: (w: Web3MobileWallet) => Promise<T>,
        ) => Promise<T>)(async (w) => {
          try {
            await w.authorize(requestChain ? { chain, identity } : { identity });
          } catch (e) {
            // Rethrown as a marker *before* `fn` runs, so the caller can
            // retry knowing nothing has been signed or broadcast yet.
            if (isAuthorizationFailed(e)) throw new AuthorizeRefused(e);
            throw e;
          }
          return await fn(ops(w, requestChain));
        });

      try {
        return await open(true);
      } catch (first) {
        if (!(first instanceof AuthorizeRefused)) throw first;

        /**
         * The wallet refused to authorise for our cluster. Ask again
         * without naming one.
         *
         * Mobile Wallet Adapter answers -1 for every refusal and gives no
         * code for "I do not serve that cluster", so this second attempt
         * is how we find out which it was. If it succeeds the wallet is
         * healthy and simply is not on our cluster — and the submission
         * can still go through, because we sign only and broadcast through
         * our own endpoint. If it fails too, the wallet is declining us
         * outright.
         *
         * A second association, not a second call inside the first: a
         * wallet that answers -1 closes its activity, so the live session
         * is already gone. The delay is for its teardown — only one
         * association may be open at a time.
         */
        await new Promise((r) => setTimeout(r, 1500));
        try {
          return await open(false);
        } catch (second) {
          if (second instanceof AuthorizeRefused) {
            throw new Error(
              `The wallet declined to authorise this request, for ${CHAIN} and ` +
                `without a cluster. Open the wallet, check whether Lode is ` +
                `listed under its connected apps, and remove it there before ` +
                `trying again.`,
            );
          }
          throw second;
        }
      }
    },
    [connectAnd, chain, identity],
  );

  const submit = useCallback(async () => {
    if (!authority || !challenge || !best) return;
    setError(null);

    const claim = {
      startedAt: snapshot.startedAt ?? Date.now(),
      endedAt: Date.now(),
      windowCount: snapshot.windowCount,
      meanConfidence: snapshot.meanConfidence,
      featureDigest: digest,
    };

    /**
     * The claim signature is collected *after* the transaction, not before.
     *
     * Each method on the wallet hook wraps its own association, only one
     * may be open at a time, and teardown is not instant. Asking for the
     * claim signature first therefore put an association in front of the
     * one that matters, and the submission could be refused for no reason
     * other than arriving while that one was still closing.
     *
     * Ordering it second costs nothing, because the transaction signature
     * already binds the claim to this wallet. The message signature is
     * corroboration, and a wallet that declines it loses us nothing.
     */
    setStage('submitting');
    const outcome = await submitSolution({
      connection,
      authority,
      mint: challenge.mint,
      nonce: best.nonce,
      difficulty: best.difficulty,
      claim,
      challengeAtMine: challengeAtStart ?? challenge.challenge,
      currentChallenge: challenge.challenge,
      withWallet,
    });

    /**
     * No retry on a declined authorization.
     *
     * There was one, and it could not help: it reacted to a -1 that the
     * submission produced itself by opening a second association, so
     * re-running the submission simply produced two more. It cost the
     * user two extra wallet trips to arrive at the same error.
     *
     * With the collision gone and the association authorised fresh, a -1
     * here means the wallet declined. That is an answer to show, not one
     * to retry around.
     */

    if (outcome.ok) {
      // Now that the mint has landed, a second association is safe to
      // open. On a wallet without sign_messages this fails and nothing
      // is lost; on one with it — Seed Vault included — it is collected.
      try {
        await new Promise((r) => setTimeout(r, 1200));
        await signMessage(
          encodeClaimMessage({ ...claim, authority: authority.toBase58() }),
        );
      } catch {
        // The transaction signature already binds the claim.
      }

      const paid = rewardFor(best.difficulty);
      setSignature(outcome.signature);
      setAmount(paid);
      setStage('done');
      if (storedId) {
        await updateSession(storedId, { signature: outcome.signature, amount: paid });
      }
      void refresh();
    } else {
      setStage('error');
      setError(outcome.message);
    }
  }, [
    authority, challenge, best, snapshot, digest, signMessage, challengeAtStart,
    connection, withWallet,
    storedId, refresh,
  ]);

  const panelWidth = width - space.base * 2;
  const shownTrace = stage === 'done' ? sessionTrace.slice(0, revealed) : sessionTrace;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: space.xs }}>
          <Label>Session complete</Label>
          <Text style={styles.title}>
            {stage === 'done' ? 'Mined.' : 'What you did'}
          </Text>
        </View>

        {stage === 'done' && amount !== null ? (
          <Readout value={amount.toFixed(2)} label="Lode mined" />
        ) : null}

        {/* Capacity and range are pinned so the reward reveal draws the
            trace in steadily instead of rescaling on every frame. */}
        <TracePanel
          values={shownTrace}
          capacity={sessionTrace.length || 1}
          range={TRACE_RANGE}
          align="left"
          width={panelWidth}
          height={140}
          idleMessage="No trace"
        />

        <StatPair
          items={[
            { label: 'Duration', value: `${snapshot.elapsedSeconds}s` },
            { label: 'Effort', value: snapshot.effort.toFixed(1) },
          ]}
        />
        <StatPair
          items={[
            { label: 'Mean confidence', value: `${Math.round(snapshot.meanConfidence * 100)}` },
            { label: 'Best difficulty', value: best ? String(best.difficulty) : '—' },
          ]}
        />

        <Divider />

        {stage === 'error' && error ? (
          <Card>
            <Label>Not submitted</Label>
            <Text style={styles.body}>{error}</Text>
            <Text style={[styles.body, { color: color.muted }]}>
              The session is kept either way, so the effort is not lost.
            </Text>
          </Card>
        ) : null}

        {stage === 'done' && signature ? (
          <Card>
            <Label>Confirmed</Label>
            <Text style={[t.dataRow, { color: color.muted }]} numberOfLines={2}>
              {signature}
            </Text>
          </Card>
        ) : null}

        {stage === 'done' ? (
          <PrimaryButton label="Done" onPress={() => router.replace('/(tabs)')} />
        ) : (
          <View style={{ gap: space.md }}>
            <PrimaryButton
              label={
                stage === 'signing'
                  ? 'Sign in wallet…'
                  : stage === 'submitting'
                    ? 'Submitting…'
                    : 'Sign claim and submit'
              }
              onPress={submit}
              disabled={!best || !challenge || stage === 'signing' || stage === 'submitting'}
            />
            <SecondaryButton label="Discard" onPress={() => router.replace('/(tabs)')} />
          </View>
        )}

        {!best ? (
          <Text style={styles.body}>
            No solution was found this session, so there is nothing to submit. Effort
            only buys iterations; it does not guarantee a hit.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.base, gap: space.lg, paddingBottom: space.xxl },
  title: { ...t.screenTitle, color: color.ink },
  body: { ...t.body, color: color.muted },
});
