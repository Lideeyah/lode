/**
 * Session orchestration. Owns the capture loop, the state machine and the
 * mining controller, and is the only place they are wired together.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Capture } from '../sensing/capture';
import { extractFeatures, motionEnergy } from '../sensing/features';
import { scoreConfidence, type Confidence } from '../sensing/confidence';
import { magnitude } from '../sensing/features';
import { SessionMachine, type SessionSnapshot } from './machine';
import { mine, type Solution } from '../mining/controller';

/** How often the mining controller runs a tick. */
const MINE_INTERVAL_MS = 10_000;
/** Samples kept for the on-screen trace. */
const TRACE_POINTS = 120;

export type SessionView = {
  snapshot: SessionSnapshot;
  /**
   * The challenge this session actually mined against, captured at start.
   * Compared against the live challenge at submission time: if the program
   * rotated mid-session the solution is stale, and saying so beats sending
   * a transaction that cannot succeed.
   */
  challengeAtStart: Uint8Array | null;
  confidence: Confidence | null;
  trace: number[];
  budget: number;
  best: Solution | null;
  hashesThisSession: number;
  measuredRate: number;
  running: boolean;
};

export function useSession(
  challenge: Uint8Array | null,
  authority: Uint8Array | null,
  /**
   * The miner account's stored nonce counter. The program requires every
   * nonce to be strictly greater than it, so mining has to start above it.
   */
  minerNonce: bigint = 0n,
) {
  const machine = useRef(new SessionMachine());
  const capture = useRef<Capture | null>(null);
  const mining = useRef(false);
  const stopRequested = useRef(false);
  const nonceCursor = useRef(0n);

  const challengeAtStart = useRef<Uint8Array | null>(null);

  const [view, setView] = useState<SessionView>({
    snapshot: machine.current.snapshot(),
    challengeAtStart: null,
    confidence: null,
    trace: [],
    budget: 0,
    best: null,
    hashesThisSession: 0,
    measuredRate: 0,
    running: false,
  });

  const traceRef = useRef<number[]>([]);
  const bestRef = useRef<Solution | null>(null);
  const hashCount = useRef(0);
  const confidenceRef = useRef<Confidence | null>(null);

  const publish = useCallback(() => {
    setView({
      snapshot: machine.current.snapshot(),
      challengeAtStart: challengeAtStart.current,
      confidence: confidenceRef.current,
      trace: [...traceRef.current],
      budget: machine.current.budget(),
      best: bestRef.current,
      hashesThisSession: hashCount.current,
      measuredRate: capture.current?.measuredRate() ?? 0,
      running: capture.current !== null,
    });
  }, []);

  const start = useCallback(async () => {
    if (capture.current) return;

    machine.current = new SessionMachine();
    machine.current.start();
    traceRef.current = [];
    bestRef.current = null;
    hashCount.current = 0;
    confidenceRef.current = null;
    stopRequested.current = false;
    challengeAtStart.current = challenge ? new Uint8Array(challenge) : null;
    // Nonces must strictly increase per miner, and the program rejects
    // anything at or below the stored counter.
    //
    // A random start was below the counter roughly half the time once a
    // wallet had mined before, so every other session failed at
    // submission. Seeding from the counter alone is better but depends on
    // the miner account having loaded before the session begins, which is
    // not guaranteed. Milliseconds since the epoch is always far above any
    // counter the chain can hold here, and always above the previous
    // session's, so it needs no chain read to be correct.
    nonceCursor.current =
      minerNonce + 1n > BigInt(Date.now()) ? minerNonce + 1n : BigInt(Date.now());

    await activateKeepAwakeAsync('lode-session').catch(() => {});

    const c = new Capture({
      onSample: (s) => {
        traceRef.current.push(magnitude(s));
        if (traceRef.current.length > TRACE_POINTS) traceRef.current.shift();
      },
      onWindow: (w) => {
        const features = extractFeatures(w);
        const conf = scoreConfidence(features, motionEnergy(w));
        confidenceRef.current = conf;
        machine.current.ingest(conf, features);
        publish();
      },
    });
    c.start();
    capture.current = c;
    publish();
  }, [publish, challenge, minerNonce]);

  const stop = useCallback(() => {
    stopRequested.current = true;
    machine.current.end();
    capture.current?.stop();
    capture.current = null;
    deactivateKeepAwake('lode-session').catch(() => {});
    publish();
  }, [publish]);

  /**
   * Adopt a challenge that arrives after the session began.
   *
   * Requiring it at the instant Start is pressed meant one slow or
   * rate-limited read disabled mining for the entire session, with no
   * way to recover short of starting over. Adoption happens once, and
   * only while nothing has been mined yet, so a mid-session rotation
   * still cannot change what is being hashed.
   */
  useEffect(() => {
    if (!view.running || !challenge) return;
    if (challengeAtStart.current || hashCount.current > 0) return;
    challengeAtStart.current = new Uint8Array(challenge);
    publish();
  }, [view.running, challenge, publish]);

  // Mining tick. Separate from the capture loop because it runs an order of
  // magnitude less often and must not block window processing.
  useEffect(() => {
    if (!view.running || !authority) return;

    const id = setInterval(async () => {
      if (mining.current) return;
      const budget = machine.current.budget();
      if (budget <= 0) return;

      const activeChallenge = challengeAtStart.current;
      if (!activeChallenge) return;

      mining.current = true;
      try {
        const tick = await mine(
          activeChallenge,
          authority,
          nonceCursor.current,
          budget,
          () => stopRequested.current,
        );
        nonceCursor.current += BigInt(tick.iterations);
        hashCount.current += tick.iterations;
        if (tick.best && (!bestRef.current || tick.best.difficulty > bestRef.current.difficulty)) {
          bestRef.current = tick.best;
        }
        publish();
      } finally {
        mining.current = false;
      }
    }, MINE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [view.running, authority, publish]);

  // Refresh the view once a second even when no window has landed, so
  // elapsed time and the trace keep moving.
  useEffect(() => {
    if (!view.running) return;
    const id = setInterval(publish, 1000);
    return () => clearInterval(id);
  }, [view.running, publish]);

  // Backgrounding pauses; returning re-warms rather than resuming straight
  // into active, because the phone may have changed hands or pockets.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!capture.current) return;
      if (next === 'background' || next === 'inactive') {
        machine.current.pause();
      } else if (next === 'active') {
        machine.current.resume();
      }
      publish();
    });
    return () => sub.remove();
  }, [publish]);

  useEffect(() => {
    return () => {
      capture.current?.stop();
      deactivateKeepAwake('lode-session').catch(() => {});
    };
  }, []);

  return { ...view, start, stop, machine: machine.current };
}
