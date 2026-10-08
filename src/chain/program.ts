/**
 * Lode program bindings.
 *
 * Instructions are hand-encoded rather than going through the Anchor TS
 * client: there are three of them, and the client would pull a large
 * dependency into a React Native bundle for no benefit.
 */
import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { sha256, sha256Bytes } from './hash';

/** Replaced at deploy time by scripts/sync-program-id.mjs. */
export const LODE_PROGRAM_ID = new PublicKey('Lode1111111111111111111111111111111111111');

export const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

export const CONFIG_SEED = Buffer.from('config');
export const MINER_SEED = Buffer.from('miner');
export const MINT_AUTHORITY_SEED = Buffer.from('mint-authority');

/**
 * Anchor's instruction discriminator: the first eight bytes of
 * sha256("global:<snake_case_name>").
 */
export function discriminator(name: string): Buffer {
  return Buffer.from(sha256(`global:${name}`).subarray(0, 8));
}

export const configPda = () => PublicKey.findProgramAddressSync([CONFIG_SEED], LODE_PROGRAM_ID)[0];

export const minerPda = (authority: PublicKey) =>
  PublicKey.findProgramAddressSync([MINER_SEED, authority.toBuffer()], LODE_PROGRAM_ID)[0];

export const mintAuthorityPda = () =>
  PublicKey.findProgramAddressSync([MINT_AUTHORITY_SEED], LODE_PROGRAM_ID)[0];

export function associatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function u64le(value: bigint): Buffer {
  const b = Buffer.alloc(8);
  let n = value;
  for (let i = 0; i < 8; i++) {
    b[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return b;
}

/** Read a little-endian u64 by hand: the buffer shim returns a BigInt wrapper. */
function readU64LE(b: Buffer, offset: number): bigint {
  let n = 0n;
  for (let i = 7; i >= 0; i--) n = (n << 8n) | BigInt(b[offset + i]);
  return n;
}

function i64le(value: bigint): Buffer {
  // Two's complement over 8 bytes; session bounds are always positive here
  // but the program's field is i64 to match Solana's clock type.
  return u64le(value < 0n ? (1n << 64n) + value : value);
}

/**
 * The effort claim. Carried in instruction data and bound to the submitter
 * by the fact that the authority signs the transaction.
 *
 * Field order must match the Rust struct exactly.
 */
export type EffortClaim = {
  startedAt: number;
  endedAt: number;
  windowCount: number;
  /** 0..1, encoded as basis points on the wire. */
  meanConfidence: number;
  /** 32 bytes. */
  featureDigest: Uint8Array;
};

export function encodeEffortClaim(c: EffortClaim): Buffer {
  return Buffer.concat([
    i64le(BigInt(Math.floor(c.startedAt / 1000))),
    i64le(BigInt(Math.floor(c.endedAt / 1000))),
    u64le(BigInt(c.windowCount)),
    // Basis points keep the on-chain type an integer; floats have no place
    // in instruction data.
    Buffer.from([
      Math.min(10000, Math.round(c.meanConfidence * 10000)) & 0xff,
      (Math.min(10000, Math.round(c.meanConfidence * 10000)) >> 8) & 0xff,
    ]),
    Buffer.from(c.featureDigest),
  ]);
}

export function featureDigest(values: number[]): Uint8Array {
  // Fixed-point to keep the digest stable across platforms: float
  // formatting differences would otherwise change the hash.
  const payload = values.map((v) => Math.round(v * 1e6)).join(',');
  return sha256Bytes(payload);
}

export function buildSubmitInstruction(params: {
  authority: PublicKey;
  mint: PublicKey;
  nonce: bigint;
  difficulty: number;
  claim: EffortClaim;
}): TransactionInstruction {
  const { authority, mint, nonce, difficulty, claim } = params;
  const config = configPda();
  const miner = minerPda(authority);
  const mintAuthority = mintAuthorityPda();
  const destination = associatedTokenAddress(authority, mint);

  const data = Buffer.concat([
    discriminator('submit'),
    u64le(nonce),
    Buffer.from([difficulty]),
    encodeEffortClaim(claim),
  ]);

  return new TransactionInstruction({
    programId: LODE_PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: miner, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: mintAuthority, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      {
        pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'),
        isSigner: false,
        isWritable: false,
      },
    ],
    data,
  });
}

export function buildRotateChallengeInstruction(payer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: LODE_PROGRAM_ID,
    keys: [
      { pubkey: configPda(), isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: false },
      {
        pubkey: new PublicKey('SysvarS1otHashes111111111111111111111111111'),
        isSigner: false,
        isWritable: false,
      },
    ],
    data: discriminator('rotate_challenge'),
  });
}

/** Config account layout, after the 8-byte Anchor discriminator. */
export type ConfigAccount = {
  mint: PublicKey;
  challenge: Uint8Array;
  mintAuthorityBump: number;
  lastRotationSlot: bigint;
};

export function decodeConfig(data: Uint8Array): ConfigAccount {
  const b = Buffer.from(data);
  let o = 8;
  const mint = new PublicKey(b.subarray(o, o + 32));
  o += 32;
  const challenge = new Uint8Array(b.subarray(o, o + 32));
  o += 32;
  const mintAuthorityBump = b[o];
  o += 1;
  const lastRotationSlot = readU64LE(b, o);
  return { mint, challenge, mintAuthorityBump, lastRotationSlot };
}

export type MinerAccount = {
  authority: PublicKey;
  cumulativeDifficulty: bigint;
  totalSessions: bigint;
  lastSubmissionSlot: bigint;
  nonceCounter: bigint;
};

export function decodeMiner(data: Uint8Array): MinerAccount {
  const b = Buffer.from(data);
  let o = 8;
  const authority = new PublicKey(b.subarray(o, o + 32));
  o += 32;
  const cumulativeDifficulty = readU64LE(b, o);
  o += 8;
  const totalSessions = readU64LE(b, o);
  o += 8;
  const lastSubmissionSlot = readU64LE(b, o);
  o += 8;
  const nonceCounter = readU64LE(b, o);
  return { authority, cumulativeDifficulty, totalSessions, lastSubmissionSlot, nonceCounter };
}
