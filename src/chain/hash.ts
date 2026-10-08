/**
 * One place that knows how to coax a Buffer out of quick-crypto, whose
 * digest typings do not line up with the buffer shim's.
 */
import QuickCrypto from 'react-native-quick-crypto';
import { Buffer } from 'buffer';

export function sha256(input: Buffer | string): Buffer {
  const digest = QuickCrypto.createHash('sha256').update(input as never).digest();
  return Buffer.from(digest as unknown as Uint8Array);
}

export const sha256Bytes = (input: Buffer | string): Uint8Array =>
  new Uint8Array(sha256(input));
