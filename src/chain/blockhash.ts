/**
 * Fetching a blockhash without trusting web3.js to return.
 *
 * Connection.getLatestBlockhash() was observed hanging indefinitely in the
 * browser — no error, no rejection, the promise simply never settled —
 * while getBalance() against the same Connection returned normally and a
 * raw JSON-RPC call for the same method answered in under 300ms. A
 * submission stuck on "submitting" forever is the worst failure mode this
 * screen has, so the call is raced against a timeout and falls back to a
 * plain fetch.
 */
import type { Connection } from '@solana/web3.js';
import { RPC_ENDPOINT } from '../wallet/config';

// Short on purpose: the library call either answers quickly or never, so
// a long wait only delays the fallback that actually works.
const TIMEOUT_MS = 2500;

export type Blockhash = { blockhash: string; lastValidBlockHeight: number };

function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
  );
}

/** Plain JSON-RPC, bypassing the client library entirely. */
async function viaFetch(endpoint: string): Promise<Blockhash> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestBlockhash',
      params: [{ commitment: 'confirmed' }],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'getLatestBlockhash failed');
  const value = json.result?.value;
  if (!value?.blockhash) throw new Error('getLatestBlockhash returned no blockhash');
  return { blockhash: value.blockhash, lastValidBlockHeight: value.lastValidBlockHeight };
}

export async function getBlockhash(
  connection: Connection,
  endpoint: string = RPC_ENDPOINT,
): Promise<Blockhash> {
  try {
    return await Promise.race([
      connection.getLatestBlockhash('confirmed'),
      timeout<Blockhash>(TIMEOUT_MS),
    ]);
  } catch {
    return viaFetch(endpoint);
  }
}

/** Same treatment for the slot, which feeds minContextSlot. */
export async function getSlot(connection: Connection, endpoint: string = RPC_ENDPOINT): Promise<number> {
  try {
    return await Promise.race([connection.getSlot(), timeout<number>(TIMEOUT_MS)]);
  } catch {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot' }),
    });
    const json = await res.json();
    return Number(json.result ?? 0);
  }
}
