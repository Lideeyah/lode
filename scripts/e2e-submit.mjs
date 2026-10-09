/**
 * End-to-end proof: mine a solution against the live challenge and submit
 * it. Verifies the hash preimage, the instruction encoding and the mint all
 * agree between the app's bindings and the deployed program.
 */
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, sendAndConfirmTransaction, SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

const PROGRAM_ID = new PublicKey(readFileSync('program/.program-id', 'utf8').trim());
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const MIN_DIFFICULTY = 8;

const disc = (n) => createHash('sha256').update(`global:${n}`).digest().subarray(0, 8);
const u64 = (v) => { const b = Buffer.alloc(8); let n = v; for (let i = 0; i < 8; i++) { b[i] = Number(n & 0xffn); n >>= 8n; } return b; };

function leadingZeroBits(h) {
  let bits = 0;
  for (const byte of h) { if (byte === 0) { bits += 8; continue; } bits += Math.clz32(byte) - 24; break; }
  return bits;
}

const payer = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8'))),
);
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
const [miner] = PublicKey.findProgramAddressSync(
  [Buffer.from('miner'), payer.publicKey.toBuffer()], PROGRAM_ID);
const [mintAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from('mint-authority')], PROGRAM_ID);

const info = await connection.getAccountInfo(config);
const mint = new PublicKey(info.data.subarray(8, 40));
const challenge = info.data.subarray(40, 72);
console.log('challenge:', Buffer.from(challenge).toString('hex').slice(0, 24) + '…');

const [ata] = PublicKey.findProgramAddressSync(
  [payer.publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ATA_PROGRAM_ID);

// Nonces must strictly increase per miner, so start above whatever is stored.
const minerInfo = await connection.getAccountInfo(miner);
let nonce = minerInfo
  ? (() => { let n = 0n; for (let i = 7; i >= 0; i--) n = (n << 8n) | BigInt(minerInfo.data[56 + i]); return n + 1n; })()
  : 1n;

console.log('mining from nonce', nonce.toString(), '…');
const began = Date.now();
let best = null, tried = 0;
while (!best || best.difficulty < MIN_DIFFICULTY + 3) {
  const h = createHash('sha256')
    .update(Buffer.concat([Buffer.from(challenge), payer.publicKey.toBuffer(), u64(nonce)]))
    .digest();
  const d = leadingZeroBits(h);
  if (!best || d > best.difficulty) best = { nonce, difficulty: d };
  nonce++; tried++;
  if (tried > 4_000_000) break;
}
console.log(`found difficulty ${best.difficulty} after ${tried.toLocaleString()} hashes in ${Date.now() - began}ms`);

const claim = Buffer.concat([
  u64(BigInt(Math.floor(Date.now() / 1000) - 120)),  // started_at i64
  u64(BigInt(Math.floor(Date.now() / 1000))),        // ended_at i64
  u64(42n),                                          // window_count
  Buffer.from([0x10, 0x27]),                         // 10000 bps, LE
  createHash('sha256').update('e2e').digest(),       // feature_digest
]);

const data = Buffer.concat([
  disc('submit'), u64(best.nonce), Buffer.from([best.difficulty]), claim,
]);

const ix = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: config, isSigner: false, isWritable: true },
    { pubkey: miner, isSigner: false, isWritable: true },
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: ata, isSigner: false, isWritable: true },
    { pubkey: mintAuthority, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ],
  data,
});

try {
  const sig = await sendAndConfirmTransaction(
    connection, new Transaction().add(ix), [payer], { commitment: 'confirmed' });
  console.log('SUBMITTED:', sig);
  const bal = await connection.getTokenAccountBalance(ata);
  console.log('LODE balance:', bal.value.uiAmountString);
} catch (e) {
  console.error('FAILED:', e.message);
  if (e.logs) console.error(e.logs.slice(-12).join('\n'));
  process.exit(1);
}
