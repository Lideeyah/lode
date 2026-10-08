/**
 * Mining controller.
 *
 * There is no background thread without native code, so the hash loop runs
 * in chunks with a yield between them. If the interface stutters during a
 * session the user experience score suffers on the exact screen the demo
 * lives on, so CHUNK_SIZE is the number to tune on device, not to guess.
 */
import { Buffer } from 'buffer';
import { sha256Bytes } from '../chain/hash';

/** Iterations per chunk before yielding to the event loop. */
export const CHUNK_SIZE = 2000;

export type Solution = {
  nonce: bigint;
  /** Leading zero bits of the resulting hash. */
  difficulty: number;
  hashHex: string;
};

export type MiningTick = {
  iterations: number;
  best: Solution | null;
  elapsedMs: number;
};

/** Count leading zero bits across a digest. */
export function leadingZeroBits(hash: Uint8Array): number {
  let bits = 0;
  for (const byte of hash) {
    if (byte === 0) {
      bits += 8;
      continue;
    }
    bits += Math.clz32(byte) - 24;
    break;
  }
  return bits;
}

/**
 * sha256(challenge || authority || nonce). Must match the Anchor program's
 * hash exactly, including nonce byte order — the program recomputes this
 * and rejects anything that disagrees.
 */
export function hashAttempt(
  challenge: Uint8Array,
  authority: Uint8Array,
  nonce: bigint,
): Uint8Array {
  // Little-endian u64, written by hand: this must match the Anchor
  // program's nonce.to_le_bytes() exactly or every submission is rejected.
  const nonceBytes = Buffer.alloc(8);
  let n = nonce;
  for (let i = 0; i < 8; i++) {
    nonceBytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  const input = Buffer.concat([
    Buffer.from(challenge),
    Buffer.from(authority),
    nonceBytes,
  ]);
  return sha256Bytes(input);
}

const yieldToEventLoop = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Runs `budget` iterations in yielding chunks, keeping the best solution.
 * Resolves early if `shouldStop` goes true, so ending a session does not
 * wait on the remaining budget.
 */
export async function mine(
  challenge: Uint8Array,
  authority: Uint8Array,
  startNonce: bigint,
  budget: number,
  shouldStop: () => boolean = () => false,
): Promise<MiningTick> {
  const began = Date.now();
  let best: Solution | null = null;
  let nonce = startNonce;
  let done = 0;

  while (done < budget) {
    if (shouldStop()) break;

    const chunk = Math.min(CHUNK_SIZE, budget - done);
    for (let i = 0; i < chunk; i++) {
      const hash = hashAttempt(challenge, authority, nonce);
      const difficulty = leadingZeroBits(hash);
      if (!best || difficulty > best.difficulty) {
        best = {
          nonce,
          difficulty,
          hashHex: Buffer.from(hash).toString('hex'),
        };
      }
      nonce++;
    }
    done += chunk;

    // The yield is what keeps the trace scrolling smoothly.
    await yieldToEventLoop();
  }

  return { iterations: done, best, elapsedMs: Date.now() - began };
}

/**
 * Measures achievable hash rate. Used by the calibration screen to pick a
 * chunk size that does not drop frames on this specific handset.
 */
export async function benchmark(durationMs = 1000): Promise<number> {
  const challenge = new Uint8Array(32);
  const authority = new Uint8Array(32);
  const began = Date.now();
  let count = 0;
  while (Date.now() - began < durationMs) {
    for (let i = 0; i < 500; i++) hashAttempt(challenge, authority, BigInt(count + i));
    count += 500;
    await yieldToEventLoop();
  }
  return count / ((Date.now() - began) / 1000);
}
