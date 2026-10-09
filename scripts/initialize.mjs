/**
 * One-off: creates the Lode config account and the SPL mint on devnet.
 * Safe to re-run — it reports and exits if the config already exists.
 */
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  TransactionInstruction, sendAndConfirmTransaction, SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

const PROGRAM_ID = new PublicKey(readFileSync('program/.program-id', 'utf8').trim());
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SLOT_HASHES = new PublicKey('SysvarS1otHashes111111111111111111111111111');

const disc = (name) =>
  createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);

const payer = Keypair.fromSecretKey(
  new Uint8Array(JSON.parse(readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8'))),
);

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
const [mintAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from('mint-authority')], PROGRAM_ID,
);

const existing = await connection.getAccountInfo(config);
if (existing) {
  const mint = new PublicKey(existing.data.subarray(8, 40));
  console.log('already initialized');
  console.log('  config:', config.toBase58());
  console.log('  mint:  ', mint.toBase58());
  writeFileSync('program/.mint', mint.toBase58());
  process.exit(0);
}

// The mint is created by the program via `init`, so it must sign.
const mint = Keypair.generate();

const ix = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: config, isSigner: false, isWritable: true },
    { pubkey: mint.publicKey, isSigner: true, isWritable: true },
    { pubkey: mintAuthority, isSigner: false, isWritable: false },
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: SLOT_HASHES, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ],
  data: disc('initialize'),
});

const sig = await sendAndConfirmTransaction(
  connection, new Transaction().add(ix), [payer, mint], { commitment: 'confirmed' },
);

console.log('initialized');
console.log('  signature:', sig);
console.log('  config:   ', config.toBase58());
console.log('  mint:     ', mint.publicKey.toBase58());
writeFileSync('program/.mint', mint.publicKey.toBase58());
