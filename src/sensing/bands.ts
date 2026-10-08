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
    softness: 0.06,
    weight: 1.5,
    rationale: 'Gait repeats approximately, never exactly and never randomly.',
  },

  /** Footfall impulses skew the magnitude distribution to the right. */
  skewness: {
    min: 0.0,
    max: 2.4,
    softness: 0.8,
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
    softness: 1.5,
    weight: 1.1,
    rationale: 'Shaking spikes much harder than a footfall does.',
  },

  /**
   * A pocket or a swinging hand wanders a little. A phone clamped to a
   * vibrating surface does not wander at all; one being waved wanders wildly.
   */
  orientationDrift: {
    min: 0.4,
    max: 18.0,
    softness: 6.0,
    weight: 0.9,
    rationale: 'A carried phone drifts a little. A mounted one never does.',
  },

  /**
   * The hardest feature to fake: a walking body rotates as it steps, so
   * pitch rate and vertical acceleration are coupled. Translation alone
   * breaks the coupling.
   */
  gyroAccelCorr: {
    min: 0.1,
    max: 1.0,
    softness: 0.12,
    weight: 1.4,
    absolute: true,
    rationale: 'Walking couples rotation to vertical motion. Shaking does not.',
  },
};

/** Confidence at or above this counts as verified human movement. */
export const CONFIDENCE_THRESHOLD = 0.62;

/** Consecutive qualifying windows required before anything accrues. */
export const WARMING_WINDOWS = 5;

/** Seconds of sustained low confidence before a session is ended. */
export const DECAY_SECONDS = 60;
