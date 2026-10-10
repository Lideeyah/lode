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
import nacl from 'tweetnacl';
import { RPC_ENDPOINT } from './config';

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
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        }
        tx.sign(keypair);
      }
      return connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
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
