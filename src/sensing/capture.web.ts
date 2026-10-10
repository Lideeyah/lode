/**
 * Web build of the capture layer.
 *
 * A desktop browser has no accelerometer, so this synthesises the motion
 * signal instead of reading one. Everything downstream is untouched: the
 * same windows, the same feature extractor, the same confidence scorer.
 * Only the source of the numbers differs.
 *
 * The mode is switchable at runtime so a walkthrough can show the
 * classifier rejecting a shake as well as crediting a walk.
 */
import type { Sample, Window } from './types';

export const TARGET_HZ = 50;
export const BUFFER_SECONDS = 10;
export const WINDOW_SECONDS = 5;
export const EMIT_INTERVAL_MS = 1000;

export type MotionMode = 'walking' | 'shaking' | 'still';

declare global {
  // eslint-disable-next-line no-var
  var __lodeMotion: MotionMode | undefined;
}

export const setMotionMode = (m: MotionMode) => {
  globalThis.__lodeMotion = m;
};

export const getMotionMode = (): MotionMode => globalThis.__lodeMotion ?? 'walking';

/** Deterministic pseudo-noise, so a recording is reproducible. */
function noise(i: number, scale: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * scale;
}

/**
 * Generates one sample for the current mode.
 *
 * Walking is ~1.8Hz with per-step jitter and pitch rate coupled to vertical
 * acceleration, because a real body rotates as it steps. Shaking is faster,
 * sharper and uncoupled — which is exactly what the classifier is built to
 * reject.
 */
function synth(t: number, i: number): Omit<Sample, 't'> {
  switch (getMotionMode()) {
    case 'shaking': {
      const phase = 2 * Math.PI * 5.5 * t;
      const spike = Math.sign(Math.sin(phase)) * Math.abs(Math.sin(phase)) ** 0.25;
      return {
        ax: 1.6 * spike + noise(i + 3, 0.02),
        ay: 0.4 * spike,
        az: 1 + 1.8 * spike,
        gx: noise(i + 53, 0.5),
        gy: noise(i + 59, 0.5),
        gz: noise(i + 61, 0.5),
      };
    }
    case 'still':
      return {
        ax: noise(i, 0.002),
        ay: noise(i + 5, 0.002),
        az: 1 + noise(i + 11, 0.002),
        gx: noise(i + 17, 0.002),
        gy: noise(i + 19, 0.002),
        gz: noise(i + 23, 0.002),
      };
    default: {
      const jitter = noise(i, 0.06);
      const phase = 2 * Math.PI * 1.8 * t + jitter;
      const impulse = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
      return {
        ax: 0.08 * impulse + noise(i + 7, 0.04),
        ay: 0.12 * impulse + noise(i + 13, 0.04),
        az: 1 + 0.3 * impulse + noise(i + 29, 0.05),
        gx: 0.5 * impulse + noise(i + 31, 0.05),
        gy: noise(i + 37, 0.08),
        gz: noise(i + 41, 0.08),
      };
    }
  }
}

export type CaptureHandlers = {
  onWindow: (w: Window) => void;
  onSample?: (s: Sample) => void;
};

export class Capture {
  private buffer: Sample[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private emitTimer: ReturnType<typeof setInterval> | null = null;
  private handlers: CaptureHandlers;
  private running = false;
  private index = 0;
  private startedAt = 0;

  constructor(handlers: CaptureHandlers) {
    this.handlers = handlers;
  }

  static async isAvailable(): Promise<boolean> {
    return true;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.buffer = [];
    this.index = 0;
    this.startedAt = Date.now();

    // Browsers clamp timers, so each tick emits the samples that should
    // have accumulated since the last one rather than exactly one.
    let lastTick = Date.now();
    this.tickTimer = setInterval(() => {
      const now = Date.now();
      const due = Math.max(1, Math.round(((now - lastTick) / 1000) * TARGET_HZ));
      lastTick = now;
      for (let k = 0; k < due; k++) {
        const t = this.index / TARGET_HZ;
        const s: Sample = { t: this.startedAt + t * 1000, ...synth(t, this.index) };
        this.index++;
        this.push(s);
        this.handlers.onSample?.(s);
      }
    }, 40);

    this.emitTimer = setInterval(() => this.emit(), EMIT_INTERVAL_MS);
  }

  stop() {
    this.running = false;
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.emitTimer) clearInterval(this.emitTimer);
    this.tickTimer = null;
    this.emitTimer = null;
    this.buffer = [];
  }

  measuredRate(): number {
    const elapsed = (Date.now() - this.startedAt) / 1000;
    return elapsed > 0.5 ? this.index / elapsed : 0;
  }

  private push(s: Sample) {
    this.buffer.push(s);
    const cutoff = s.t - BUFFER_SECONDS * 1000;
    while (this.buffer.length && this.buffer[0].t < cutoff) this.buffer.shift();
  }

  private emit() {
    if (!this.buffer.length) return;
    const newest = this.buffer[this.buffer.length - 1].t;
    const from = newest - WINDOW_SECONDS * 1000;
    const samples = this.buffer.filter((s) => s.t >= from);
    if (samples.length < 16) return;
    const span = (samples[samples.length - 1].t - samples[0].t) / 1000;
    const rate = span > 0.5 ? samples.length / span : 0;
    if (rate <= 0) return;
    this.handlers.onWindow({
      samples,
      rate,
      startedAt: samples[0].t,
      endedAt: samples[samples.length - 1].t,
    });
  }
}
