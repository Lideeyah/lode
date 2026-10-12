/**
 * Broadcasting a signed transaction ourselves.
 *
 * The alternative is Mobile Wallet Adapter's signAndSendTransaction, which
 * hands the wallet both jobs. That couples submission to the wallet's own
 * RPC and to a minContextSlot it has to have caught up to — and when the
 * wallet's node sits behind the slot we read from our provider, it simply
 * refuses, with an error that says nothing about why.
 *
 * Asking the wallet only to sign removes both failure modes. It also means
 * the transaction goes out through the same endpoint the rest of the app
 * reads from, so a session cannot fail because two nodes disagreed.
 */
import { Buffer } from 'buffer';
import { RPC_ENDPOINT } from '../wallet/config';

function post(raw: Uint8Array): Promise<Response> {
  return fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'sendTransaction',
      params: [
        Buffer.from(raw).toString('base64'),
        { encoding: 'base64', preflightCommitment: 'confirmed' },
      ],
    }),
  });
}

/** Returns the signature, or throws with whatever the node said. */
export async function sendRawTransaction(raw: Uint8Array, attempt = 0): Promise<string> {
  let res: Response;
  try {
    res = await post(raw);
  } catch (e) {
    // A dropped connection should not cost a session whose work is done.
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      return sendRawTransaction(raw, attempt + 1);
    }
    throw e;
  }

  const json = await res.json();
  if (json.error) {
    const logs = json.error.data?.logs;
    const detail = Array.isArray(logs)
      ? logs.filter((l: string) => /Error|failed/i.test(l)).slice(-2).join(' ')
      : '';
    throw new Error([json.error.message, detail].filter(Boolean).join(' — '));
  }
  return json.result as string;
}
