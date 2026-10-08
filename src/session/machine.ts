/**
 * Session state machine.
 *
 * idle -> warming -> active -> decaying -> (active | ended)
 *
 * Warming exists to make a point. Five consecutive qualifying windows are
 * required before anything accrues, which stops a burst of shaking paying
 * out, and showing the state rather than hiding it is what tells a sceptical
 * user the verification is real.
 */
import { CONFIDENCE_THRESHOLD, DECAY_SECONDS, WARMING_WINDOWS } from '../sensing/bands';
import type { Confidence } from '../sensing/confidence';
import type { FeatureVector } from '../sensing/types';

export type SessionState = 'idle' | 'warming' | 'active' | 'decaying' | 'paused' | 'ended';

export const STATE_LABELS: Record<SessionState, string> = {
  idle: 'IDLE',
  warming: 'WARMING',
  active: 'ACTIVE',
  decaying: 'DECAYING',
  paused: 'PAUSED',
  ended: 'ENDED',
};

export type WindowRecord = {
  at: number;
  confidence: number;
  features: FeatureVector;
};

export type SessionSnapshot = {
  state: SessionState;
  startedAt: number | null;
  elapsedSeconds: number;
  /** Accrued effort, in confidence-weighted seconds. */
  effort: number;
  confidence: number;
  /** Consecutive qualifying windows seen so far, during warming. */
  warmingProgress: number;
  windowCount: number;
  meanConfidence: number;
};

/**
 * Effort accrues per second, weighted by confidence, so a marginal signal
 * pays less than a clean one rather than paying the same or nothing.
 */
export function effortIncrement(confidence: number, decayFactor: number): number {
  return Math.max(0, confidence) * decayFactor;
}

/**
 * Iteration budget: the thesis made visible. Sub-linear in effort so a long
 * walk keeps paying but does not run away, and zero without verified effort.
 */
export function iterationBudget(effort: number): number {
  if (effort <= 0) return 0;
  return Math.floor(2000 * Math.pow(effort, 0.85));
}

export class SessionMachine {
  state: SessionState = 'idle';
  startedAt: number | null = null;
  effort = 0;
  confidence = 0;

  private consecutiveGood = 0;
  /** Seconds spent continuously below threshold while decaying. */
  private decayElapsed = 0;
  private windows: WindowRecord[] = [];
  private confidenceSum = 0;
  private endedAt: number | null = null;

  start() {
    this.state = 'warming';
    this.startedAt = Date.now();
    this.endedAt = null;
    this.effort = 0;
    this.confidence = 0;
    this.consecutiveGood = 0;
    this.decayElapsed = 0;
    this.windows = [];
    this.confidenceSum = 0;
  }

  end() {
    if (this.state === 'idle' || this.state === 'ended') return;
    this.state = 'ended';
    this.endedAt = Date.now();
  }

  pause() {
    if (this.state === 'active' || this.state === 'warming' || this.state === 'decaying') {
      this.state = 'paused';
    }
  }

  resume() {
    // Always re-warm after a pause: the device may have changed hands,
    // pockets or vehicles while the app was backgrounded.
    if (this.state === 'paused') {
      this.state = 'warming';
      this.consecutiveGood = 0;
      this.decayElapsed = 0;
    }
  }

  /** Feed one window's verdict. Call once per second. */
  ingest(c: Confidence, features: FeatureVector) {
    if (this.state === 'idle' || this.state === 'ended' || this.state === 'paused') return;

    this.confidence = c.score;
    this.windows.push({ at: Date.now(), confidence: c.score, features });
    this.confidenceSum += c.score;

    const good = c.score >= CONFIDENCE_THRESHOLD;

    switch (this.state) {
      case 'warming': {
        this.consecutiveGood = good ? this.consecutiveGood + 1 : 0;
        if (this.consecutiveGood >= WARMING_WINDOWS) {
          this.state = 'active';
          this.decayElapsed = 0;
        }
        // Nothing accrues during warming. That is the point of warming.
        break;
      }

      case 'active': {
        if (good) {
          this.effort += effortIncrement(c.score, 1);
        } else {
          this.state = 'decaying';
          this.decayElapsed = 1;
          this.effort += effortIncrement(c.score, this.decayFactor());
        }
        break;
      }

      case 'decaying': {
        if (good) {
          this.state = 'active';
          this.decayElapsed = 0;
          this.effort += effortIncrement(c.score, 1);
        } else {
          this.decayElapsed += 1;
          if (this.decayElapsed >= DECAY_SECONDS) {
            // Sustained absence of movement ends the session.
            this.end();
          } else {
            this.effort += effortIncrement(c.score, this.decayFactor());
          }
        }
        break;
      }
    }
  }

  /** Ramps linearly to zero across the decay window. */
  private decayFactor(): number {
    return Math.max(0, 1 - this.decayElapsed / DECAY_SECONDS);
  }

  budget(): number {
    return this.state === 'active' || this.state === 'decaying'
      ? iterationBudget(this.effort)
      : 0;
  }

  records(): WindowRecord[] {
    return this.windows;
  }

  snapshot(): SessionSnapshot {
    const end = this.endedAt ?? Date.now();
    return {
      state: this.state,
      startedAt: this.startedAt,
      elapsedSeconds: this.startedAt ? Math.floor((end - this.startedAt) / 1000) : 0,
      effort: this.effort,
      confidence: this.confidence,
      warmingProgress: this.consecutiveGood,
      windowCount: this.windows.length,
      meanConfidence: this.windows.length ? this.confidenceSum / this.windows.length : 0,
    };
  }
}
