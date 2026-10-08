/**
 * Persistence. AsyncStorage, which is ample: six floats a second is nothing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeatureVector } from '../sensing/types';

const KEYS = {
  sessions: 'lode.sessions.v1',
  onboarded: 'lode.onboarded.v1',
  measuredRate: 'lode.measuredRate.v1',
} as const;

export type StoredSession = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  effort: number;
  meanConfidence: number;
  windowCount: number;
  /** Best difficulty found locally this session. */
  difficulty: number;
  nonce: string;
  /** Downsampled confidence series, for the history sparkline. */
  trace: number[];
  /** Populated once the chain accepts the submission. */
  signature: string | null;
  amount: number | null;
  featureDigest: string;
};

export type SessionDraft = Omit<StoredSession, 'id'>;

export async function loadSessions(): Promise<StoredSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.sessions);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // A corrupt store must never block a session from starting.
    return [];
  }
}

export async function saveSession(draft: SessionDraft): Promise<StoredSession> {
  const session: StoredSession = { ...draft, id: `${draft.startedAt}` };
  const all = await loadSessions();
  all.unshift(session);
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(all.slice(0, 200)));
  return session;
}

export async function updateSession(
  id: string,
  patch: Partial<StoredSession>,
): Promise<void> {
  const all = await loadSessions();
  const next = all.map((s) => (s.id === id ? { ...s, ...patch } : s));
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(next));
}

/** Consecutive days with at least one session, counting back from today. */
export function streak(sessions: StoredSession[]): number {
  if (!sessions.length) return 0;
  const days = new Set(
    sessions.map((s) => new Date(s.startedAt).toISOString().slice(0, 10)),
  );
  let count = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    // Today not yet mined does not break a streak that ran to yesterday.
    if (count === 0 && key === new Date().toISOString().slice(0, 10)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    break;
  }
  return count;
}

export const totals = (sessions: StoredSession[]) => ({
  sessions: sessions.length,
  effort: sessions.reduce((a, s) => a + s.effort, 0),
  mined: sessions.reduce((a, s) => a + (s.amount ?? 0), 0),
  seconds: sessions.reduce((a, s) => a + s.durationSeconds, 0),
});

export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.onboarded)) === '1';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarded, '1');
}

/** The measured sensor rate, written down once and reused. */
export async function loadMeasuredRate(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEYS.measuredRate);
  return raw ? Number(raw) : null;
}

export async function saveMeasuredRate(hz: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.measuredRate, String(hz));
}

/** Digest of the per-window feature vectors, carried in the effort claim. */
export function downsampleTrace(values: number[], points = 24): number[] {
  if (values.length <= points) return values;
  const step = values.length / points;
  return Array.from({ length: points }, (_, i) => values[Math.floor(i * step)]);
}

export function summariseFeatures(records: { features: FeatureVector }[]): number[] {
  if (!records.length) return [];
  const keys = Object.keys(records[0].features) as (keyof FeatureVector)[];
  return keys.map(
    (k) => records.reduce((a, r) => a + r.features[k], 0) / records.length,
  );
}
