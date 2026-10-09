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
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import type { Transaction } from '@solana/web3.js';
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
import { useChain } from '../src/chain/context';
import { encodeClaimMessage, submitSolution } from '../src/chain/submit';
import { featureDigest } from '../src/chain/program';
import { downsampleTrace, saveSession, summariseFeatures, updateSession } from '../src/storage';
import { color, space, type as t } from '../src/theme/tokens';

type Stage = 'review' | 'signing' | 'submitting' | 'done' | 'error';

/** Reward scaling must mirror the program's, or the UI lies about the payout. */
const rewardFor = (difficulty: number) => Math.pow(2, Math.max(0, difficulty - 8)) * 0.1;

export default function SummaryScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { signMessage, signAndSendTransaction, connection } = useMobileWallet();
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

    try {
      setStage('signing');
      // Free, instant, no transaction. Proves the claim came from this wallet.
      await signMessage(
        encodeClaimMessage({ ...claim, authority: authority.toBase58() }),
      );
    } catch (e) {
      setStage('error');
      setError(e instanceof Error ? e.message : 'The claim was not signed.');
      return;
    }

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
      signAndSend: (tx: Transaction, slot: number) =>
        signAndSendTransaction(tx, slot) as unknown as Promise<string>,
    });

    if (outcome.ok) {
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
    connection, signAndSendTransaction, storedId, refresh,
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

        <TracePanel values={shownTrace} width={panelWidth} height={140} idleMessage="No trace" />

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
