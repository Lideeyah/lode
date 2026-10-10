/**
 * Confidence scoring. Pure: feature vector in, score and per-feature
 * contributions out.
 *
 * The contributions are not debug output — the verification screen is built
 * on them, and that screen is the answer to the only hard question anyone
 * asks about this product.
 */
import { BANDS, CONFIDENCE_THRESHOLD, MOTION_FLOOR, type Band } from './bands';
import { FEATURE_KEYS, type FeatureKey, type FeatureVector } from './types';

export type FeatureScore = {
  key: FeatureKey;
  value: number;
  band: Band;
  /** 0..1. Exactly 1 anywhere inside the band. */
  score: number;
  inBand: boolean;
  /** Where the value sits across the band, 0..1, for the bar. Clamped. */
  position: number;
};

export type Confidence = {
  /** 0..1, weighted mean of the feature scores. */
  score: number;
  verified: boolean;
  features: FeatureScore[];
  /** One plain sentence for the verification screen. */
  explanation: string;
};

function scoreOne(key: FeatureKey, raw: number): FeatureScore {
  const band = BANDS[key];
  const value = band.absolute ? Math.abs(raw) : raw;
  const inBand = value >= band.min && value <= band.max;

  let score: number;
  if (inBand) {
    score = 1;
  } else {
    const distance = value < band.min ? band.min - value : value - band.max;
    // Exponential falloff: forgiving just outside, unforgiving far outside.
    score = Math.exp(-((distance / Math.max(band.softness, 1e-6)) ** 2));
  }

  const span = band.max - band.min;
  const position = span > 1e-9 ? Math.min(1, Math.max(0, (value - band.min) / span)) : 0.5;

  return { key, value, band, score, inBand, position };
}

/**
 * @param motion Spread of acceleration magnitude from motionEnergy(). When
 * supplied and below MOTION_FLOOR, the score is forced to zero: the six
 * features are shape statistics, and the shape of noise is meaningless.
 * Omitting it scores the vector on its own terms, which is what the unit
 * tests and the calibration screen want.
 */
export function scoreConfidence(f: FeatureVector, motion?: number): Confidence {
  const features = FEATURE_KEYS.map((k) => scoreOne(k, f[k]));

  if (motion !== undefined && motion < MOTION_FLOOR) {
    return {
      score: 0,
      verified: false,
      features,
      explanation: 'The instrument is not moving. Nothing to credit.',
    };
  }

  /**
   * Weighted *geometric* mean, not arithmetic.
   *
   * These six are signatures that must all be present together, not scores
   * to be averaged. An arithmetic mean lets five soft passes outvote one
   * hard failure: a shaken phone scored 0.74 and credited, because only
   * step variance truly rejected it while the rest drifted close enough to
   * their bands to carry it over the line. A geometric mean collapses as
   * soon as any single signature is absent, which is the actual claim the
   * product makes.
   *
   * Each term is floored so one bad feature degrades the score steeply
   * rather than annihilating it, which keeps a momentary sensor glitch
   * from reading as fraud.
   */
  const FLOOR = 0.05;
  const totalWeight = features.reduce((a, s) => a + s.band.weight, 0);
  const logSum = features.reduce(
    (a, s) => a + s.band.weight * Math.log(Math.max(s.score, FLOOR)),
    0,
  );
  const score = totalWeight > 0 ? Math.exp(logSum / totalWeight) : 0;

  return {
    score,
    verified: score >= CONFIDENCE_THRESHOLD,
    features,
    explanation: explain(score, features),
  };
}

/**
 * Names the weakest failing feature rather than reciting all of them,
 * because a user who is not crediting wants one reason, not six.
 */
function explain(score: number, features: FeatureScore[]): string {
  const failing = features.filter((s) => !s.inBand).sort((a, b) => a.score - b.score);

  if (!failing.length) {
    return 'All six signals sit inside their expected range. Crediting.';
  }

  const worst = failing[0];
  if (score >= CONFIDENCE_THRESHOLD) {
    return `${worst.band.rationale} That one reads off, but the rest hold. Crediting.`;
  }

  const others = failing.length - 1;
  const tail = others > 0 ? ` ${others} other signal${others > 1 ? 's' : ''} also out of range.` : '';
  return `${worst.band.rationale} Not crediting.${tail}`;
}
