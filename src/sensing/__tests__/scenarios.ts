/**
 * Synthetic movement scenarios used to characterise the classifier.
 *
 * These are models, not recordings. Each one encodes a specific physical
 * claim about how a signal behaves — a vehicle vibrates at high frequency
 * with no gait periodicity, a swinging bag rotates hard but steps
 * irregularly — and the classifier is judged on whether it separates them.
 *
 * What they establish is the shape of the decision boundary. What they
 * cannot establish is where exactly it should sit for a given handset and
 * a given person, which needs recorded data from both.
 */
import type { Sample, Window } from '../types';

export const RATE = 50;
const SECONDS = 5;

/** Deterministic pseudo-noise, so every run of the table is identical. */
export function noise(i: number, scale: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * scale;
}

export function build(gen: (t: number, i: number) => Omit<Sample, 't'>): Window {
  const n = RATE * SECONDS;
  const t0 = 1_000_000;
  const samples: Sample[] = Array.from({ length: n }, (_, i) => ({
    t: t0 + (i / RATE) * 1000,
    ...gen(i / RATE, i),
  }));
  return { samples, rate: RATE, startedAt: samples[0].t, endedAt: samples[n - 1].t };
}

/**
 * Gait, parameterised.
 *
 * `hz` is cadence, `jitter` how much each step differs from the last,
 * `amp` the vigour of the footfall, and `coupling` how strongly rotation
 * tracks vertical acceleration — the signature a carried phone has and a
 * driven one does not.
 */
function gait(hz: number, jitter: number, amp: number, coupling: number, orient: number) {
  return (t: number, i: number) => {
    const phase = 2 * Math.PI * hz * t + noise(i, jitter);
    const impulse = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
    return {
      ax: amp * 0.27 * impulse + noise(i + 7, orient),
      ay: amp * 0.4 * impulse + noise(i + 13, orient),
      az: 1 + amp * impulse + noise(i + 29, orient * 1.2),
      gx: coupling * impulse + noise(i + 31, 0.05),
      gy: noise(i + 37, 0.08),
      gz: noise(i + 41, 0.08),
    };
  };
}

export type Scenario = {
  name: string;
  /** What the classifier is expected to decide. */
  human: boolean;
  window: () => Window;
  note: string;
};

export const SCENARIOS: Scenario[] = [
  // ---- Genuine human movement -----------------------------------------
  {
    name: 'Walking, hand',
    human: true,
    note: '1.8Hz, phone carried in the hand',
    window: () => build(gait(1.8, 0.06, 0.3, 0.5, 0.04)),
  },
  {
    name: 'Walking, slow',
    human: true,
    note: '1.3Hz, strolling',
    window: () => build(gait(1.3, 0.08, 0.22, 0.42, 0.04)),
  },
  {
    name: 'Walking, brisk',
    human: true,
    note: '2.3Hz, purposeful pace',
    window: () => build(gait(2.3, 0.05, 0.38, 0.55, 0.05)),
  },
  {
    name: 'Walking, pocket',
    human: true,
    note: 'damped amplitude, more orientation noise',
    window: () => build(gait(1.9, 0.07, 0.24, 0.44, 0.09)),
  },
  {
    name: 'Running',
    human: true,
    note: '2.9Hz, high amplitude',
    window: () => build(gait(2.9, 0.045, 0.62, 0.7, 0.06)),
  },

  {
    name: 'Walking, backpack',
    human: true,
    note: 'rotation damped and buried in noise — the hardest positive',
    window: () =>
      build((t: number, i: number) => {
        const phase = 2 * Math.PI * 1.75 * t + noise(i, 0.09);
        const impulse = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
        return {
          ax: 0.1 * impulse + noise(i + 7, 0.07),
          ay: 0.14 * impulse + noise(i + 13, 0.07),
          az: 1 + 0.2 * impulse + noise(i + 29, 0.08),
          // Weak coupling against heavy gyro noise: the signature is
          // present but far less clean than a phone in the hand.
          gx: 0.16 * impulse + noise(i + 31, 0.22),
          gy: noise(i + 37, 0.2),
          gz: noise(i + 41, 0.2),
        };
      }),
  },

  // ---- Attacks and non-human movement ---------------------------------
  {
    name: 'Shaking by hand',
    human: false,
    note: '5.5Hz, sharp, no rotation coupling',
    window: () =>
      build((t, i) => {
        const ph = 2 * Math.PI * 5.5 * t;
        const spike = Math.sign(Math.sin(ph)) * Math.abs(Math.sin(ph)) ** 0.25;
        return {
          ax: 1.6 * spike + noise(i + 3, 0.02),
          ay: 0.4 * spike,
          az: 1 + 1.8 * spike,
          gx: noise(i + 53, 0.5),
          gy: noise(i + 59, 0.5),
          gz: noise(i + 61, 0.5),
        };
      }),
  },
  {
    name: 'Slow deliberate shake',
    human: false,
    note: 'faked at walking cadence, but mechanically regular',
    window: () =>
      build((t, i) => {
        const ph = 2 * Math.PI * 1.9 * t; // no jitter: a hand is too even
        return {
          ax: 0.9 * Math.sin(ph),
          ay: 0.3 * Math.sin(ph),
          az: 1 + 1.1 * Math.sin(ph),
          gx: noise(i + 17, 0.06),
          gy: noise(i + 19, 0.06),
          gz: noise(i + 23, 0.06),
        };
      }),
  },
  {
    name: 'Swinging in a bag',
    human: false,
    note: 'pendulum: large rotation, no footfall structure',
    window: () =>
      build((t, i) => {
        const ph = 2 * Math.PI * 0.8 * t;
        return {
          ax: 0.5 * Math.sin(ph) + noise(i + 5, 0.1),
          ay: 0.5 * Math.cos(ph) + noise(i + 9, 0.1),
          az: 1 + 0.35 * Math.sin(2 * ph),
          gx: 1.4 * Math.cos(ph),
          gy: 1.1 * Math.sin(ph),
          gz: 0.6 * Math.cos(2 * ph),
        };
      }),
  },
  {
    name: 'In a vehicle',
    human: false,
    note: 'engine vibration plus road noise, no periodic stride',
    window: () =>
      build((_t, i) => ({
        ax: noise(i, 0.06) + 0.02 * Math.sin(i * 1.7),
        ay: noise(i + 11, 0.05),
        az: 1 + noise(i + 21, 0.08) + 0.03 * Math.sin(i * 2.3),
        gx: noise(i + 31, 0.03),
        gy: noise(i + 41, 0.03),
        gz: noise(i + 51, 0.03),
      })),
  },
  {
    name: 'Mounted on a vibrating surface',
    human: false,
    note: 'high frequency, zero orientation drift',
    window: () =>
      build((t, i) => {
        const ph = 2 * Math.PI * 14 * t;
        return {
          ax: 0.25 * Math.sin(ph),
          ay: 0.2 * Math.sin(ph * 1.1),
          az: 1 + 0.3 * Math.sin(ph),
          gx: noise(i + 3, 0.01),
          gy: noise(i + 7, 0.01),
          gz: noise(i + 13, 0.01),
        };
      }),
  },
  {
    name: 'Stationary on a desk',
    human: false,
    note: 'sensor noise only',
    window: () =>
      build((_t, i) => ({
        ax: noise(i, 0.002),
        ay: noise(i + 5, 0.002),
        az: 1 + noise(i + 11, 0.002),
        gx: noise(i + 17, 0.002),
        gy: noise(i + 19, 0.002),
        gz: noise(i + 23, 0.002),
      })),
  },
  {
    name: 'Held still in the hand',
    human: false,
    note: 'tremor only — the hardest negative, closest to real motion',
    window: () =>
      build((_t, i) => ({
        ax: noise(i, 0.012),
        ay: noise(i + 5, 0.012),
        az: 1 + noise(i + 11, 0.014),
        gx: noise(i + 17, 0.02),
        gy: noise(i + 19, 0.02),
        gz: noise(i + 23, 0.02),
      })),
  },
];
