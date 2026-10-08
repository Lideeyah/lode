/** A single fused sensor sample. Timestamps are ms since epoch. */
export type Sample = {
  t: number;
  /** Accelerometer, in g (expo-sensors native unit). */
  ax: number;
  ay: number;
  az: number;
  /** Gyroscope, in rad/s. */
  gx: number;
  gy: number;
  gz: number;
};

/** A trailing slice of samples handed to the feature extractor. */
export type Window = {
  samples: Sample[];
  /** Measured sample rate across this window, Hz. */
  rate: number;
  startedAt: number;
  endedAt: number;
};

/**
 * Six features. Order is fixed: the verification screen, the confidence
 * scorer and the effort-claim digest all index these positionally.
 */
export type FeatureVector = {
  /** Hz. Human walking cadence sits near 1.6-2.2 Hz. */
  dominantFreq: number;
  /** Seconds. Gait repeats approximately, never exactly. */
  stepIntervalStd: number;
  /** Dimensionless. Asymmetry of the acceleration magnitude. */
  skewness: number;
  /** Dimensionless. Peakedness; shaking is far more peaked than walking. */
  kurtosis: number;
  /** Degrees. How much the device orientation wanders. */
  orientationDrift: number;
  /** -1..1. Gyro pitch rate against vertical acceleration. */
  gyroAccelCorr: number;
};

export const FEATURE_KEYS = [
  'dominantFreq',
  'stepIntervalStd',
  'skewness',
  'kurtosis',
  'orientationDrift',
  'gyroAccelCorr',
] as const satisfies readonly (keyof FeatureVector)[];

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Human-readable names for the verification screen. Mono, so keep them short. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  dominantFreq: 'CADENCE',
  stepIntervalStd: 'STEP VAR',
  skewness: 'SKEW',
  kurtosis: 'KURTOSIS',
  orientationDrift: 'ORIENT',
  gyroAccelCorr: 'GYRO CORR',
};

export const FEATURE_UNITS: Record<FeatureKey, string> = {
  dominantFreq: 'Hz',
  stepIntervalStd: 's',
  skewness: '',
  kurtosis: '',
  orientationDrift: '°',
  gyroAccelCorr: '',
};
