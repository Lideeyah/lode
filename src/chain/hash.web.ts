/**
 * Web build of the hashing helper.
 *
 * react-native-quick-crypto is a native module and cannot load in a
 * browser. @noble/hashes is pure JavaScript, already present as a
 * transitive dependency of web3.js, and produces byte-identical SHA-256,
 * so the preimage the program recomputes is unchanged.
 */
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';

export function sha256(input: Buffer | string): Buffer {
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return Buffer.from(nobleSha256(new Uint8Array(bytes)));
}

export const sha256Bytes = (input: Buffer | string): Uint8Array =>
  new Uint8Array(sha256(input));
