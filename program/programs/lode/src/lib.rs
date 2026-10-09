//! Lode: proof of work whose scarce input is verified human movement.
//!
//! What this program verifies, and what it deliberately does not.
//!
//! It verifies two things before it mints. First, that the submitted nonce
//! genuinely produces a hash meeting the claimed difficulty, which it
//! recomputes rather than trusts. Second, that the effort claim accompanying
//! it came from the wallet submitting the transaction, which holds because
//! that wallet signs the transaction.
//!
//! It does not verify the gait classification, because it cannot. On-chain
//! verification of sensor data is not possible. The classifier runs on the
//! device and this program trusts it. Hardware attestation proving the
//! binary is unmodified is the next step that would close that gap, and
//! saying so plainly is better than implying a guarantee that does not exist.

use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

declare_id!("ADYPeA3jNDXoXQjYSTXwLCXjFiWJWZx99ANRnhiGf5Wp");

/// Below this, a solution is not worth paying for: at 50Hz on a phone these
/// turn up constantly and would make the token free.
pub const MIN_DIFFICULTY: u8 = 8;

/// Above this the reward shift would overflow. Nothing on a handset will
/// reach it; the cap exists so the arithmetic is provably safe.
pub const MAX_DIFFICULTY: u8 = 48;

/// 0.1 token at nine decimals. Doubles per difficulty bit above the floor.
pub const BASE_REWARD: u64 = 100_000_000;

pub const MINT_DECIMALS: u8 = 9;

/// Minimum slots between challenge rotations, so the challenge cannot be
/// ground to order.
pub const ROTATION_COOLDOWN_SLOTS: u64 = 150;

/// Minimum slots between two submissions by the same miner.
pub const SUBMISSION_COOLDOWN_SLOTS: u64 = 10;

#[program]
pub mod lode {
    use super::*;

    /// Run once per cluster. Creates the config and the mint authority PDA.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.mint = ctx.accounts.mint.key();
        config.mint_authority_bump = ctx.bumps.mint_authority;
        config.last_rotation_slot = Clock::get()?.slot;
        // Seed the first challenge from the current slot hash so mining can
        // begin immediately rather than waiting on a rotation.
        config.challenge = read_recent_slot_hash(&ctx.accounts.slot_hashes)?;
        Ok(())
    }

    /// Permissionless, rate-limited by slot, so the challenge moves and old
    /// solutions go stale.
    pub fn rotate_challenge(ctx: Context<RotateChallenge>) -> Result<()> {
        let clock = Clock::get()?;
        let config = &mut ctx.accounts.config;

        require!(
            clock
                .slot
                .saturating_sub(config.last_rotation_slot)
                >= ROTATION_COOLDOWN_SLOTS,
            LodeError::RotationTooSoon
        );

        config.challenge = read_recent_slot_hash(&ctx.accounts.slot_hashes)?;
        config.last_rotation_slot = clock.slot;
        Ok(())
    }

    /// The whole product.
    pub fn submit(
        ctx: Context<Submit>,
        nonce: u64,
        difficulty: u8,
        effort: EffortClaim,
    ) -> Result<()> {
        require!(difficulty >= MIN_DIFFICULTY, LodeError::DifficultyTooLow);
        require!(difficulty <= MAX_DIFFICULTY, LodeError::DifficultyTooHigh);

        let clock = Clock::get()?;
        let config = &ctx.accounts.config;
        let miner = &mut ctx.accounts.miner;

        // A fresh miner account starts zeroed, so initialise its identity
        // the first time through.
        if miner.authority == Pubkey::default() {
            miner.authority = ctx.accounts.authority.key();
        }

        // Replay: nonces must strictly increase for a given miner, which
        // costs one u64 rather than a set of every nonce ever used.
        require!(nonce > miner.nonce_counter, LodeError::NonceReused);

        require!(
            miner.last_submission_slot == 0
                || clock
                    .slot
                    .saturating_sub(miner.last_submission_slot)
                    >= SUBMISSION_COOLDOWN_SLOTS,
            LodeError::SubmissionTooSoon
        );

        // The claim must describe the wallet that signed this transaction.
        require!(
            effort.window_count > 0,
            LodeError::EmptyEffortClaim
        );
        require!(
            effort.ended_at >= effort.started_at,
            LodeError::MalformedEffortClaim
        );
        require!(
            effort.mean_confidence_bps <= 10_000,
            LodeError::MalformedEffortClaim
        );

        // Recompute rather than trust. This is the line the whole design
        // rests on.
        let hash = hashv(&[
            &config.challenge,
            ctx.accounts.authority.key().as_ref(),
            &nonce.to_le_bytes(),
        ]);
        let achieved = leading_zero_bits(&hash.to_bytes());
        require!(achieved >= difficulty, LodeError::InsufficientWork);

        let reward = reward_for(difficulty);

        let bump = config.mint_authority_bump;
        let seeds: &[&[u8]] = &[b"mint-authority", &[bump]];
        let signer: &[&[&[u8]]] = &[seeds];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                signer,
            ),
            reward,
        )?;

        miner.cumulative_difficulty = miner
            .cumulative_difficulty
            .saturating_add(difficulty as u64);
        miner.total_sessions = miner.total_sessions.saturating_add(1);
        miner.last_submission_slot = clock.slot;
        miner.nonce_counter = nonce;

        emit!(Mined {
            authority: ctx.accounts.authority.key(),
            difficulty,
            reward,
            window_count: effort.window_count,
            mean_confidence_bps: effort.mean_confidence_bps,
        });

        Ok(())
    }
}

/// Doubles per bit above the floor. Saturating, and bounded by
/// MAX_DIFFICULTY, so it cannot overflow.
pub fn reward_for(difficulty: u8) -> u64 {
    let over = difficulty.saturating_sub(MIN_DIFFICULTY) as u32;
    BASE_REWARD.saturating_mul(1u64 << over.min(40))
}

/// Count leading zero bits across the digest, most significant byte first.
pub fn leading_zero_bits(hash: &[u8]) -> u8 {
    let mut bits: u8 = 0;
    for byte in hash {
        if *byte == 0 {
            bits = bits.saturating_add(8);
            continue;
        }
        bits = bits.saturating_add(byte.leading_zeros() as u8);
        break;
    }
    bits
}

/// The SlotHashes sysvar is too large to deserialize wholesale, so read the
/// newest entry straight out of the account data: an 8 byte length, then
/// entries of an 8 byte slot followed by a 32 byte hash.
fn read_recent_slot_hash(slot_hashes: &UncheckedAccount) -> Result<[u8; 32]> {
    let data = slot_hashes.try_borrow_data()?;
    require!(data.len() >= 48, LodeError::SlotHashesUnavailable);

    let mut out = [0u8; 32];
    out.copy_from_slice(&data[16..48]);
    Ok(out)
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub mint: Pubkey,
    pub challenge: [u8; 32],
    pub mint_authority_bump: u8,
    pub last_rotation_slot: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Miner {
    pub authority: Pubkey,
    pub cumulative_difficulty: u64,
    pub total_sessions: u64,
    pub last_submission_slot: u64,
    pub nonce_counter: u64,
}

/// Carried in instruction data and bound to the submitter by the fact that
/// the authority signs the transaction. The program records it; it cannot
/// verify the classification behind it.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EffortClaim {
    pub started_at: i64,
    pub ended_at: i64,
    pub window_count: u64,
    /// Mean confidence in basis points. Integers only: floats have no place
    /// in instruction data.
    pub mean_confidence_bps: u16,
    pub feature_digest: [u8; 32],
}

#[event]
pub struct Mined {
    pub authority: Pubkey,
    pub difficulty: u8,
    pub reward: u64,
    pub window_count: u64,
    pub mean_confidence_bps: u16,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = payer,
        mint::decimals = MINT_DECIMALS,
        mint::authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,

    /// CHECK: PDA that holds mint authority. Never read, only signed with.
    #[account(seeds = [b"mint-authority"], bump)]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Address-checked against the SlotHashes sysvar.
    #[account(address = solana_sdk_ids::sysvar::slot_hashes::ID)]
    pub slot_hashes: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RotateChallenge<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    pub payer: Signer<'info>,

    /// CHECK: Address-checked against the SlotHashes sysvar.
    #[account(address = solana_sdk_ids::sysvar::slot_hashes::ID)]
    pub slot_hashes: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Submit<'info> {
    #[account(mut, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Miner::INIT_SPACE,
        seeds = [b"miner", authority.key().as_ref()],
        bump
    )]
    pub miner: Account<'info, Miner>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut, address = config.mint)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub destination: Account<'info, TokenAccount>,

    /// CHECK: PDA that holds mint authority. Never read, only signed with.
    #[account(seeds = [b"mint-authority"], bump = config.mint_authority_bump)]
    pub mint_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[error_code]
pub enum LodeError {
    #[msg("Claimed difficulty is below the minimum worth rewarding")]
    DifficultyTooLow,
    #[msg("Claimed difficulty is implausibly high")]
    DifficultyTooHigh,
    #[msg("The nonce does not produce a hash meeting the claimed difficulty")]
    InsufficientWork,
    #[msg("This nonce has already been used by this miner")]
    NonceReused,
    #[msg("Too soon since this miner's last submission")]
    SubmissionTooSoon,
    #[msg("Too soon since the last challenge rotation")]
    RotationTooSoon,
    #[msg("The effort claim covers no windows")]
    EmptyEffortClaim,
    #[msg("The effort claim is malformed")]
    MalformedEffortClaim,
    #[msg("Could not read the SlotHashes sysvar")]
    SlotHashesUnavailable,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_leading_zero_bits() {
        assert_eq!(leading_zero_bits(&[0xFF, 0x00]), 0);
        assert_eq!(leading_zero_bits(&[0x7F]), 1);
        assert_eq!(leading_zero_bits(&[0x0F]), 4);
        assert_eq!(leading_zero_bits(&[0x00, 0xFF]), 8);
        assert_eq!(leading_zero_bits(&[0x00, 0x01]), 15);
        assert_eq!(leading_zero_bits(&[0x00, 0x00, 0x00, 0x00]), 32);
    }

    #[test]
    fn reward_doubles_per_bit_and_never_overflows() {
        assert_eq!(reward_for(MIN_DIFFICULTY), BASE_REWARD);
        assert_eq!(reward_for(MIN_DIFFICULTY + 1), BASE_REWARD * 2);
        assert_eq!(reward_for(MIN_DIFFICULTY + 3), BASE_REWARD * 8);
        // Saturates rather than wrapping at the ceiling.
        let _ = reward_for(MAX_DIFFICULTY);
        let _ = reward_for(u8::MAX);
    }
}
