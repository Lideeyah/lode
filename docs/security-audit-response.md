# Security audit response

The hackathon's advisory audit ran against commit `8714c72` and returned 28
findings: 6 high, 6 medium, 12 low, 4 info. This triages every one.

Two were acted on. The rest are either false positives with a specific
reason, or accepted risks already documented in
[threat-model.md](threat-model.md).

The program itself was **not changed in response to this audit**. It is
deployed, verified end to end, and every program finding below is a false
positive. Editing it hours before a deadline would have left the deployed
bytecode disagreeing with the source, which is a worse problem than an
advisory note.

---

## Acted on

**`lode = 0.1.0 is unlicensed` · info ×2** — fair, and fixed. The
repository now carries an MIT `LICENSE`, and `program/Cargo.toml`
declares `license = "MIT"`.

**`A Solana secret key is being written to browser storage` · high ×2** —
correct, and now removed.

Both capture scripts wrote a secret key into the page's `localStorage`
so a run would start with a funded wallet. That was unnecessary: the web
build generates its own keypair when it finds none. The injection is
gone from `scripts/record-demo.mjs` and `scripts/capture-screens.mjs`,
which now start each run with a fresh unfunded devnet wallet.

The underlying behaviour the finding describes still exists in
`src/wallet/useWallet.web.ts`, which the scan did not flag.

That file holds a keypair in `localStorage` because Mobile Wallet Adapter
is an Android intent protocol with no browser equivalent, and the web
build exists to demonstrate the app and to record the walkthrough. It
only ever holds a throwaway devnet key, and it is web-only.

**The Android build — the one that ships — never touches key material.**
It signs exclusively through Mobile Wallet Adapter, so the secret stays
inside the wallet app. The file is now explicit about that boundary.

---

## False positives, with reasons

### `init_if_needed` on `miner` · high

The account is a PDA seeded `[b"miner", authority.key()]`, so its address
is derived from the signer and cannot be pointed at someone else's record.
The handler also guards the already-initialised path explicitly:

```rust
if miner.authority == Pubkey::default() {
    miner.authority = ctx.accounts.authority.key();
}
```

An existing account keeps its authority; only a freshly zeroed one is
assigned. That is the re-initialisation check the finding asks for.

### `init_if_needed` on `destination` · high

Constrained with `associated_token::mint` and
`associated_token::authority`, so Anchor derives the associated token
address and rejects anything else. A substituted account fails
constraint validation before the handler runs.

### `initialize` lets the first caller become admin · high

`initialize` is permissionless, and the config is a fixed-seed PDA that
has already been initialised, so a second call fails on `init`.

More to the point, **there is no admin to become**. `Config` holds a mint,
a challenge, a bump byte and a slot — no authority pubkey. The field the
finding read as an authority, `mint_authority_bump`, is the bump seed for
a PDA. Minting is signed by that PDA and by nothing else, so no caller of
`initialize` acquires any privilege.

### Type cosplay · high

Both account types use Anchor's `#[account]`, which prepends an eight-byte
type discriminator, and both are loaded as `Account<'info, T>`, which
verifies that discriminator and the owning program before deserialising.

### Stale data after CPI · medium

The CPI is `mint_to`, which touches the mint, the destination token
account and the mint authority. It does not touch `miner`, so there is
nothing to reload.

### Arbitrary CPI · low

The target is typed `Program<'info, Token>`, which Anchor validates
against the SPL Token program id. It is not a user-supplied account.

### Missing owner check · low

The flagged function reads the SlotHashes sysvar, and the account is
address-checked at the call site:

```rust
#[account(address = solana_sdk_ids::sysvar::slot_hashes::ID)]
pub slot_hashes: UncheckedAccount<'info>,
```

Only the real sysvar satisfies that constraint.

### `@solana/web3.js v1 is in maintenance` · low ×9

Deliberate. The Kit rewrite is newer and has far less written about it,
and that gap matters when debugging alone against a deadline. Noted as a
migration for later rather than a defect now.

---

## Accepted, not fixed

### Dependency advisories · medium ×5

`bincode`, `decode-uri-component`, `stream-json`, and `uuid` at two
versions. All are transitive, arriving through Expo and web3.js rather
than being chosen here.

They are not pinned over because forcing versions across an Expo
dependency tree is exactly the kind of change that produces a broken APK,
and the window for discovering that is hours. The honest trade is a
documented advisory against a working build. None is reachable from a
path an attacker controls: they are a JSON parser, a URI decoder, a
serialiser and a UUID generator, all used internally by the toolchain.

### Duplicate crate versions · info

Thirteen crates resolve to more than one version, all from the Anchor and
Solana dependency graphs. Not something this program controls.

---

## What the audit did not find

Worth saying, because its absence is not evidence of safety: the audit is
a static scan, and the central weakness of this project is architectural,
not a code defect.

**A modified client can mint without walking.** The program proves the
work — it recomputes the preimage and checks the difficulty — and the
signature binds it to a wallet. What sits outside that proof is the gait
verdict, which the client produces and the program accepts. No scanner
will flag it, because there is no bug: it is where the trust boundary
falls, and closing it needs hardware attestation.

That is set out in full in [threat-model.md](threat-model.md), and it was
written before this audit ran.
