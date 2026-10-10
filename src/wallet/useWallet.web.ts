/**
 * Web build of the wallet.
 *
 * Mobile Wallet Adapter is an Android intent protocol and has no browser
 * equivalent, so the web build holds its own keypair instead. Everything
 * it does is real: real ed25519 signatures over the same claim bytes, real
 * transactions sent to devnet, real mints. Only the custody differs — the
 * key lives in localStorage rather than in a wallet app.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Connection, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getBlockhash } from '../chain/blockhash';
import nacl from 'tweetnacl';
import { RPC_ENDPOINT } from './config';
import { Buffer } from 'buffer';

const STORAGE_KEY = 'lode.web.keypair.v1';

function loadKeypair(): Keypair {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) return Keypair.fromSecretKey(new Uint8Array(JSON.parse(raw)));
  } catch {
    // A corrupt entry should produce a fresh wallet, not a dead app.
  }
  const kp = Keypair.generate();
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...kp.secretKey]));
  } catch {
    // Private browsing: the key simply does not persist.
  }
  return kp;
}

/**
 * Plain JSON-RPC sendTransaction, retried on transport failure.
 *
 * A single dropped connection should not cost a session: the effort is
 * real and the solution is already found, so a transient "Failed to
 * fetch" is worth two more attempts before telling the user it failed.
 * Only transport errors retry — an error *response* from the node is a
 * verdict and is surfaced immediately.
 */
async function sendRawViaRpc(raw: Uint8Array, attempt = 0): Promise<string> {
  let res: Response;
  try {
    res = await postRpc(raw);
  } catch (e) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      return sendRawViaRpc(raw, attempt + 1);
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

function postRpc(raw: Uint8Array): Promise<Response> {
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

export function useWallet() {
  const connection = useMemo(
    () => new Connection(RPC_ENDPOINT, 'confirmed'),
    [],
  );
  const [keypair] = useState<Keypair>(() => loadKeypair());
  const [connected, setConnected] = useState(false);

  // The key exists from first render, so reconnecting is instant.
  useEffect(() => {
    setConnected(true);
  }, []);

  const account = connected
    ? { publicKey: keypair.publicKey, address: keypair.publicKey, label: 'Local' }
    : undefined;

  const connect = useCallback(async () => {
    setConnected(true);
    return { publicKey: keypair.publicKey, address: keypair.publicKey };
  }, [keypair]);

  const disconnect = useCallback(async () => setConnected(false), []);

  const signMessage = useCallback(
    async <K extends Uint8Array | Uint8Array[]>(message: K): Promise<K> => {
      const sign = (m: Uint8Array) => nacl.sign.detached(m, keypair.secretKey);
      return (Array.isArray(message) ? message.map(sign) : sign(message)) as K;
    },
    [keypair],
  );

  const signAndSendTransaction = useCallback(
    async (tx: Transaction | VersionedTransaction) => {
      if (tx instanceof VersionedTransaction) {
        tx.sign([keypair]);
      } else {
        tx.feePayer ??= keypair.publicKey;
        if (!tx.recentBlockhash) {
          tx.recentBlockhash = (await getBlockhash(connection)).blockhash;
        }
        tx.sign(keypair);
      }
      // Sent over plain JSON-RPC for the same reason the blockhash is
      // fetched that way: the client library's send never settled in the
      // browser, leaving the summary screen stuck on "submitting" with no
      // error to show. A raw call returns, succeed or fail.
      return sendRawViaRpc(tx.serialize());
    },
    [connection, keypair],
  );

  return {
    account,
    accounts: account ? [account] : null,
    connect,
    disconnect,
    signMessage,
    signMessages: signMessage,
    signAndSendTransaction,
    signAndSendTransactions: signAndSendTransaction,
    connection,
  };
}
