/**
 * Calibration constants. THIS IS THE FILE YOU TUNE.
 *
 * Every number here is a hypothesis about what human walking looks like on
 * a specific handset, and none of them are trustworthy until they have been
 * checked against real data from the device the demo runs on. The defaults
 * are reasoned starting points, not measurements.
 *
 * Tuning procedure, from the architecture doc: walk, then run, then attack
 * it — shake it, swing it in a bag, sit it on a vehicle, tape it to
 * something vibrating. Open the Verification tab while doing each. Real
 * movement must sit inside the bands and every attack must fall outside at
 * least two of them. Widen a band only if honest walking falls out of it.
 */
import type { FeatureKey } from './types';

export type Band = {
  /** Inclusive lower edge of the accepted range. */
  min: number;
  /** Inclusive upper edge. */
  max: number;
  /**
   * How far outside the band a value may stray before its score reaches
   * roughly zero. Wider softness forgives more.
   */
  softness: number;
  /** Relative importance in the combined score. Need not sum to 1. */
  weight: number;
  /** Score the absolute value rather than the signed one. */
  absolute?: boolean;
  /** Shown on the verification screen under the feature name. */
  rationale: string;
};

export const BANDS: Record<FeatureKey, Band> = {
  /**
   * Walking lands near 1.6-2.0 Hz, jogging nearer 2.5-3.0. Below 1.2 is
   * too slow to be gait; above 3.4 is not a human leg.
   */
  dominantFreq: {
    min: 1.2,
    max: 3.4,
    softness: 0.5,
    weight: 1.3,
    rationale: 'Human stride lands between 1.2 and 3.4 steps per second.',
  },

  /**
   * The crux of the whole product. Gait repeats approximately. A value near
   * zero means something mechanical is driving the phone; a large value
   * means there is no rhythm at all.
   */
  stepIntervalStd: {
    min: 0.015,
    max: 0.2,
    softness: 0.035,
    weight: 1.5,
    rationale: 'Gait repeats approximately, never exactly and never randomly.',
  },

  /** Footfall impulses skew the magnitude distribution to the right. */
  skewness: {
    min: 0.0,
    max: 2.4,
    softness: 0.4,
    weight: 0.8,
    rationale: 'Footfalls push acceleration up more sharply than down.',
  },

  /**
   * Shaking produces far sharper spikes than walking. This is the feature
   * that catches a phone being waved by hand.
   */
  kurtosis: {
    min: -1.2,
    max: 3.5,
    softness: 0.8,
    weight: 1.1,
    rationale: 'Shaking spikes much harder than a footfall does.',
  },

  /**
   * A pocket or a swinging hand wanders a little. A phone clamped to a
   * vibrating surface does not wander at all; one being waved wanders wildly.
   */
  orientationDrift: {
    min: 0.8,
    max: 18.0,
    softness: 0.6,
    weight: 0.9,
    rationale: 'A carried phone drifts a little. A mounted one never does.',
  },

  /**
   * The hardest feature to fake: a walking body rotates as it steps, so
   * pitch rate and vertical acceleration are coupled. Translation alone
   * breaks the coupling.
   */
  /**
   * Weighted far above the others, deliberately.
   *
   * This is the only signature that cannot be produced by translating the
   * phone: a body rotates as it steps, and a hand moving a phone up and
   * down does not. Every other feature can be approximated by someone
   * shaking carefully — a slow, rhythmic shake at walking cadence matches
   * on frequency, skew, drift and even step variance.
   *
   * At equal weight that attack scored 0.689 and credited, while reading
   * 0.06 here against 0.997 for a real walk. The feature separated the
   * cases perfectly and the combination ignored it.
   *
   * 3.6 comes from a sweep (see robustness.test.ts). Below 2.0 the slow
   * shake credits; by 3.6 it scores 0.49 against a 0.62 threshold, and
   * every modelled walk still scores above 0.99. Past 3.6 the returns
   * flatten and the classifier leans on one signal more than is prudent.
   */
  gyroAccelCorr: {
    min: 0.12,
    max: 1.0,
    softness: 0.045,
    weight: 3.6,
    absolute: true,
    rationale: 'Walking couples rotation to vertical motion. Shaking does not.',
  },
};

/**
 * Minimum spread of acceleration magnitude, in g, before any shape feature
 * is believed. A phone at rest reads about 0.002; walking reads an order of
 * magnitude above this. Below the floor, confidence is zero regardless of
 * what the other six features say.
 */
export const MOTION_FLOOR = 0.02;

/** Confidence at or above this counts as verified human movement. */
export const CONFIDENCE_THRESHOLD = 0.62;

/** Consecutive qualifying windows required before anything accrues. */
export const WARMING_WINDOWS = 5;

/** Seconds of sustained low confidence before a session is ended. */
export const DECAY_SECONDS = 60;
