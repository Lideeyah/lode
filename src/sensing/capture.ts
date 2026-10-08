/**
 * Capture. Accelerometer and gyroscope into a ten second ring buffer,
 * emitting a window over the trailing five seconds once per second.
 *
 * Raw samples never persist and never leave the device.
 */
import { Accelerometer, Gyroscope } from 'expo-sensors';
import type { Sample, Window } from './types';

/** Target rate. The real rate is measured, never assumed. */
export const TARGET_HZ = 50;
const SAMPLE_INTERVAL_MS = 1000 / TARGET_HZ;

export const BUFFER_SECONDS = 10;
export const WINDOW_SECONDS = 5;
export const EMIT_INTERVAL_MS = 1000;

const BUFFER_CAPACITY = BUFFER_SECONDS * TARGET_HZ * 2; // headroom for fast devices

export type CaptureHandlers = {
  onWindow: (w: Window) => void;
  /** Newest magnitude, every sample, for the live trace. */
  onSample?: (s: Sample) => void;
};

export class Capture {
  private buffer: Sample[] = [];
  private latestGyro = { gx: 0, gy: 0, gz: 0 };
  private subs: { remove: () => void }[] = [];
  private emitTimer: ReturnType<typeof setInterval> | null = null;
  private handlers: CaptureHandlers;
  private running = false;

  /** Rolling count used to report the measured rate. */
  private sampleCount = 0;
  private countStartedAt = 0;

  constructor(handlers: CaptureHandlers) {
    this.handlers = handlers;
  }

  static async isAvailable(): Promise<boolean> {
    const [a, g] = await Promise.all([
      Accelerometer.isAvailableAsync(),
      Gyroscope.isAvailableAsync(),
    ]);
    return a && g;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.buffer = [];
    this.sampleCount = 0;
    this.countStartedAt = Date.now();

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS);
    Gyroscope.setUpdateInterval(SAMPLE_INTERVAL_MS);

    // Gyro updates a shared latest-value rather than its own series: the
    // two sensors are not synchronised, and fusing on the accelerometer's
    // clock keeps one consistent timebase for every feature.
    this.subs.push(
      Gyroscope.addListener(({ x, y, z }) => {
        this.latestGyro = { gx: x, gy: y, gz: z };
      }),
    );

    this.subs.push(
      Accelerometer.addListener(({ x, y, z }) => {
        const s: Sample = {
          t: Date.now(),
          ax: x,
          ay: y,
          az: z,
          ...this.latestGyro,
        };
        this.push(s);
        this.handlers.onSample?.(s);
      }),
    );

    this.emitTimer = setInterval(() => this.emit(), EMIT_INTERVAL_MS);
  }

  stop() {
    this.running = false;
    for (const s of this.subs) s.remove();
    this.subs = [];
    if (this.emitTimer) {
      clearInterval(this.emitTimer);
      this.emitTimer = null;
    }
    this.buffer = [];
  }

  /** Samples per second actually delivered since start. */
  measuredRate(): number {
    const elapsed = (Date.now() - this.countStartedAt) / 1000;
    return elapsed > 0.5 ? this.sampleCount / elapsed : 0;
  }

  private push(s: Sample) {
    this.buffer.push(s);
    this.sampleCount++;
    const cutoff = s.t - BUFFER_SECONDS * 1000;
    // Drop by time, not by count, so a device running slow than target
    // still holds a full ten seconds rather than a short buffer.
    while (this.buffer.length && this.buffer[0].t < cutoff) this.buffer.shift();
    if (this.buffer.length > BUFFER_CAPACITY) this.buffer.shift();
  }

  private emit() {
    const now = Date.now();
    const from = now - WINDOW_SECONDS * 1000;
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
