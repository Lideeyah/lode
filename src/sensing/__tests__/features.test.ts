/**
 * Synthetic signals standing in for the real thing.
 *
 * These are not a substitute for walking around with the phone — the bands
 * in bands.ts can only be trusted once they have been checked against real
 * data from the handset. What these do is fix the *shape* of the problem:
 * a human gait and a mechanical shake must land in measurably different
 * places, and that separation must survive any change to the extractor.
 */
import { extractFeatures, dominantFrequency, correlation, motionEnergy } from '../features';
import { scoreConfidence } from '../confidence';
import { CONFIDENCE_THRESHOLD } from '../bands';
import type { Sample, Window } from '../types';

const RATE = 50;
const DURATION = 5;

function build(
  gen: (t: number, i: number) => Omit<Sample, 't'>,
  rate = RATE,
): Window {
  const n = rate * DURATION;
  const t0 = 1_000_000;
  const samples: Sample[] = Array.from({ length: n }, (_, i) => ({
    t: t0 + (i / rate) * 1000,
    ...gen(i / rate, i),
  }));
  return { samples, rate, startedAt: samples[0].t, endedAt: samples[n - 1].t };
}

/** Deterministic pseudo-noise: a seeded test must not flake. */
function noise(i: number, scale: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * scale;
}

/**
 * Walking: ~1.8Hz footfalls, each step slightly different from the last,
 * with pitch rate coupled to vertical acceleration as a real body rotates.
 */
const walking = () =>
  build((t, i) => {
    const jitter = noise(i, 0.06);
    const phase = 2 * Math.PI * 1.8 * t + jitter;
    const impulse = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
    return {
      ax: 0.08 * impulse + noise(i + 7, 0.04),
      ay: 0.12 * impulse + noise(i + 13, 0.04),
      az: 1 + 0.3 * impulse + noise(i + 29, 0.05),
      // Coupled to vertical acceleration, as rotation accompanies each step.
      gx: 0.5 * impulse + noise(i + 31, 0.05),
      gy: noise(i + 37, 0.08),
      gz: noise(i + 41, 0.08),
    };
  });

/** Shaking: faster, cleaner, far more peaked, and with no gyro coupling. */
const shaking = () =>
  build((t, i) => {
    const phase = 2 * Math.PI * 5.5 * t;
    const spike = Math.sign(Math.sin(phase)) * Math.abs(Math.sin(phase)) ** 0.25;
    return {
      ax: 1.6 * spike + noise(i + 3, 0.02),
      ay: 0.4 * spike,
      az: 1 + 1.8 * spike,
      // Uncorrelated with vertical acceleration: translation without rotation.
      gx: noise(i + 53, 0.5),
      gy: noise(i + 59, 0.5),
      gz: noise(i + 61, 0.5),
    };
  });

/** A phone sitting still on a desk. */
const stationary = () =>
  build((_t, i) => ({
    ax: noise(i, 0.002),
    ay: noise(i + 5, 0.002),
    az: 1 + noise(i + 11, 0.002),
    gx: noise(i + 17, 0.002),
    gy: noise(i + 19, 0.002),
    gz: noise(i + 23, 0.002),
  }));

describe('dominantFrequency', () => {
  it('recovers a known frequency from a clean sine', () => {
    const signal = Array.from({ length: 250 }, (_, i) =>
      Math.sin(2 * Math.PI * 2.0 * (i / RATE)),
    );
    expect(dominantFrequency(signal, RATE)).toBeCloseTo(2.0, 0);
  });

  it('returns zero for a flat signal rather than guessing', () => {
    expect(dominantFrequency(new Array(250).fill(1), RATE)).toBe(0);
  });

  it('returns zero when there are too few samples to tell', () => {
    expect(dominantFrequency([1, 2, 3], RATE)).toBe(0);
  });
});

describe('correlation', () => {
  it('is 1 for identical series and -1 for inverted ones', () => {
    const a = [1, 2, 3, 4, 5];
    expect(correlation(a, a)).toBeCloseTo(1, 5);
    expect(correlation(a, a.map((x) => -x))).toBeCloseTo(-1, 5);
  });

  it('is 0 against a constant, where there is nothing to correlate with', () => {
    expect(correlation([1, 2, 3, 4], [2, 2, 2, 2])).toBe(0);
  });
});

describe('extractFeatures', () => {
  it('reads walking cadence in the human range', () => {
    const f = extractFeatures(walking());
    expect(f.dominantFreq).toBeGreaterThan(1.2);
    expect(f.dominantFreq).toBeLessThan(3.4);
  });

  it('finds gyro/acceleration coupling when walking and none when shaking', () => {
    expect(Math.abs(extractFeatures(walking()).gyroAccelCorr)).toBeGreaterThan(
      Math.abs(extractFeatures(shaking()).gyroAccelCorr),
    );
  });

  it('returns zeros rather than NaN for an undersized window', () => {
    const empty = { samples: [], rate: 0, startedAt: 0, endedAt: 0 };
    for (const v of Object.values(extractFeatures(empty))) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(0);
    }
  });

  it('never produces NaN on any synthetic input', () => {
    for (const w of [walking(), shaking(), stationary()]) {
      for (const v of Object.values(extractFeatures(w))) {
        expect(Number.isNaN(v)).toBe(false);
      }
    }
  });
});

/** Scores a window the way the live pipeline does, gate included. */
const score = (w: ReturnType<typeof walking>) =>
  scoreConfidence(extractFeatures(w), motionEnergy(w));

describe('motionEnergy', () => {
  it('separates a carried phone from a motionless one by an order of magnitude', () => {
    expect(motionEnergy(stationary())).toBeLessThan(0.01);
    expect(motionEnergy(walking())).toBeGreaterThan(0.1);
  });
});

describe('scoreConfidence', () => {
  it('scores walking above shaking and shaking above sitting still', () => {
    expect(score(walking()).score).toBeGreaterThan(score(shaking()).score);
    expect(score(shaking()).score).toBeGreaterThan(score(stationary()).score);
  });

  /**
   * The product's central claim, and the regression that nearly shipped.
   *
   * Ordering alone is far too weak an assertion: shaking scored 0.74 and
   * credited while still ranking below walking, so this test passed and
   * the classifier was broken. What matters is which side of the
   * threshold each lands on, so assert exactly that.
   */
  it('refuses to credit a shaken phone', () => {
    const shake = score(shaking());
    expect(shake.verified).toBe(false);
    expect(shake.score).toBeLessThan(CONFIDENCE_THRESHOLD);
  });

  it('leaves a clear margin between walking and shaking', () => {
    // Narrow separation means real walking will sometimes dip below the
    // line, and real shaking will sometimes clear it.
    expect(score(walking()).score - score(shaking()).score).toBeGreaterThan(0.3);
  });

  it('refuses to credit a stationary phone', () => {
    expect(score(stationary()).verified).toBe(false);
  });

  /**
   * The regression that motivated the gate: shape statistics over sensor
   * noise land inside the walking bands by accident, and a motionless
   * phone scored 0.91 before the floor existed.
   */
  it('zeroes a motionless phone even though its shape features look human', () => {
    const still = stationary();
    const ungated = scoreConfidence(extractFeatures(still));
    const gated = score(still);

    // Still well above zero on shape alone. Successive tightening of the
    // bands and weights has narrowed this from 0.91 to about 0.26, but
    // never closed it — which is precisely why the motion floor exists
    // as a gate rather than as another weighted term.
    expect(ungated.score).toBeGreaterThan(0.2);
    expect(gated.score).toBe(0);
    expect(gated.explanation).toMatch(/not moving/i);
  });

  it('credits walking', () => {
    expect(score(walking()).verified).toBe(true);
  });

  it('always returns a bounded score and one explanation', () => {
    for (const w of [walking(), shaking(), stationary()]) {
      const c = scoreConfidence(extractFeatures(w), motionEnergy(w));
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
      expect(c.explanation.length).toBeGreaterThan(0);
      expect(c.features).toHaveLength(6);
    }
  });
});
