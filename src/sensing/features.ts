/**
 * Feature extraction. Pure: window in, six values out.
 *
 * The signature Lode looks for is that human gait repeats *approximately*
 * rather than exactly. A shaken phone is periodic too, but it is periodic
 * in a way that is too clean, too peaked, and uncorrelated with rotation.
 * Every feature below is chosen to separate those two cases.
 */
import type { Sample, Window, FeatureVector } from './types';

/** Plausible human walking/running cadence, Hz. Bounds the frequency search. */
export const MIN_CADENCE_HZ = 0.6;
export const MAX_CADENCE_HZ = 4.0;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** nth standardized central moment. */
function moment(xs: number[], n: number): number {
  if (xs.length < 3) return 0;
  const m = mean(xs);
  const s = std(xs);
  if (s < 1e-9) return 0;
  return xs.reduce((a, x) => a + ((x - m) / s) ** n, 0) / xs.length;
}

export const magnitude = (s: Sample) => Math.hypot(s.ax, s.ay, s.az);

/**
 * Single-pole low pass. Isolates the gravity component of acceleration so
 * orientation can be read separately from motion.
 */
function lowPass(xs: number[], alpha: number): number[] {
  const out: number[] = [];
  let acc = xs[0] ?? 0;
  for (const x of xs) {
    acc = alpha * x + (1 - alpha) * acc;
    out.push(acc);
  }
  return out;
}

/**
 * Dominant frequency by autocorrelation.
 *
 * Autocorrelation rather than an FFT because the window is short (5s) and we
 * only need one peak in a narrow band, so a direct lag search is both simpler
 * and more robust to the spectral leakage a 5s FFT would suffer.
 */
export function dominantFrequency(signal: number[], rate: number): number {
  const n = signal.length;
  if (n < 8 || rate <= 0) return 0;

  const m = mean(signal);
  const x = signal.map((v) => v - m);

  const minLag = Math.max(1, Math.floor(rate / MAX_CADENCE_HZ));
  const maxLag = Math.min(n - 1, Math.ceil(rate / MIN_CADENCE_HZ));
  if (maxLag <= minLag) return 0;

  const energy = x.reduce((a, v) => a + v * v, 0);
  if (energy < 1e-9) return 0;

  // The biased estimator: the raw sum, with no correction for the shorter
  // overlap at long lags. The taper that bias introduces is wanted here.
  // Dividing by (n - lag) instead lets a handful of noisy products at the
  // longest lag outscore the true period, which pins every reading to the
  // bottom of the search range.
  let bestLag = 0;
  let bestCorr = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i + lag < n; i++) c += x[i] * x[i + lag];
    if (c > bestCorr) {
      bestCorr = c;
      bestLag = lag;
    }
  }

  // A periodic signal correlates positively with itself one period along.
  // Anything else is noise, and reporting a frequency for it would be a lie.
  if (bestLag === 0 || bestCorr <= 0) return 0;
  return rate / bestLag;
}

/**
 * Peak times, in seconds, using a prominence threshold derived from the
 * signal's own spread so it adapts to how hard the user is moving.
 */
export function peakTimes(signal: number[], times: number[], rate: number): number[] {
  const n = signal.length;
  if (n < 5) return [];
  const m = mean(signal);
  const s = std(signal);
  if (s < 1e-6) return [];

  const threshold = m + 0.4 * s;
  // Refuse peaks closer together than the fastest plausible step.
  const minGap = Math.max(1, Math.floor(rate / MAX_CADENCE_HZ));

  const peaks: number[] = [];
  let last = -Infinity;
  for (let i = 1; i < n - 1; i++) {
    if (signal[i] <= threshold) continue;
    if (signal[i] < signal[i - 1] || signal[i] < signal[i + 1]) continue;
    if (i - last < minGap) {
      // Keep the taller of two peaks that are too close together.
      if (peaks.length && signal[i] > signal[last]) {
        peaks[peaks.length - 1] = i;
        last = i;
      }
      continue;
    }
    peaks.push(i);
    last = i;
  }
  return peaks.map((i) => times[i] / 1000);
}

/** Angle in degrees between two 3-vectors. */
function angleBetween(a: number[], b: number[]): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const na = Math.hypot(a[0], a[1], a[2]);
  const nb = Math.hypot(b[0], b[1], b[2]);
  if (na < 1e-9 || nb < 1e-9) return 0;
  const c = Math.min(1, Math.max(-1, dot / (na * nb)));
  return (Math.acos(c) * 180) / Math.PI;
}

/** Pearson correlation of two equal-length series. */
export function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da < 1e-12 || db < 1e-12) return 0;
  return num / Math.sqrt(da * db);
}

/**
 * Spread of the acceleration magnitude, in g.
 *
 * This is not a feature, it is a precondition. Every feature below is a
 * *shape* statistic, and shape statistics computed over sensor noise land
 * wherever they like — a phone sitting on a desk produces a skewness and a
 * kurtosis near zero, both of which sit happily inside the walking band.
 * Without this gate a motionless device scores as a walker.
 */
export function motionEnergy(w: Window): number {
  if (w.samples.length < 4) return 0;
  const mags = w.samples.map(magnitude);
  const m = mags.reduce((a, b) => a + b, 0) / mags.length;
  return Math.sqrt(mags.reduce((a, x) => a + (x - m) ** 2, 0) / (mags.length - 1));
}

export function extractFeatures(w: Window): FeatureVector {
  const { samples, rate } = w;
  const empty: FeatureVector = {
    dominantFreq: 0,
    stepIntervalStd: 0,
    skewness: 0,
    kurtosis: 0,
    orientationDrift: 0,
    gyroAccelCorr: 0,
  };
  if (samples.length < 16 || rate <= 0) return empty;

  const mags = samples.map(magnitude);
  const times = samples.map((s) => s.t - samples[0].t);

  const dominantFreq = dominantFrequency(mags, rate);

  // Inter-peak interval spread. Walking is near-periodic but never exact;
  // a mechanical shake is either far too regular or utterly irregular.
  const pts = peakTimes(mags, times, rate);
  const intervals: number[] = [];
  for (let i = 1; i < pts.length; i++) intervals.push(pts[i] - pts[i - 1]);
  const stepIntervalStd = intervals.length >= 2 ? std(intervals) : 0;

  const skewness = moment(mags, 3);
  // Excess kurtosis: 0 for a normal distribution.
  const kurtosis = moment(mags, 4) - 3;

  // Orientation drift: how far the gravity vector wanders from its own mean.
  const alpha = 0.1;
  const gxs = lowPass(samples.map((s) => s.ax), alpha);
  const gys = lowPass(samples.map((s) => s.ay), alpha);
  const gzs = lowPass(samples.map((s) => s.az), alpha);
  const meanG = [mean(gxs), mean(gys), mean(gzs)];
  const drifts = gxs.map((_, i) => angleBetween([gxs[i], gys[i], gzs[i]], meanG));
  const orientationDrift = std(drifts);

  // A walking body rotates as it steps, so pitch rate and vertical
  // acceleration move together. A phone shaken in the hand translates
  // without that coupling, which is the single hardest feature to fake.
  const pitchRate = samples.map((s) => s.gx);
  const verticalAccel = samples.map((s) => s.az);
  const gyroAccelCorr = correlation(pitchRate, verticalAccel);

  return {
    dominantFreq,
    stepIntervalStd,
    skewness,
    kurtosis,
    orientationDrift,
    gyroAccelCorr,
  };
}
