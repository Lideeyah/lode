# Deploying Lode

Devnet, deployed 9 October 2026.

```
program id  ADYPeA3jNDXoXQjYSTXwLCXjFiWJWZx99ANRnhiGf5Wp
config PDA  FbNzgpSQDJo71rWXAkUuKQY6SRSTXj5rzSjsYxQgmiKd
mint        8vRrdq81gjZVcCFFCrZcjd2AKrkenKmSw5ndhYcUmdrN
```

## Redeploying after a code change

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd program && anchor build
solana program deploy target/deploy/lode.so --program-id target/deploy/lode-keypair.json
```

The program id only changes if `target/deploy/lode-keypair.json` is lost. If
that happens, regenerate it, then run `node scripts/sync-program-id.mjs` from
the repo root so the app's bindings and `Anchor.toml` follow, and re-run
`scripts/initialize.mjs` to create a fresh config and mint.

## Verifying the chain path

`node scripts/e2e-submit.mjs` mines against the live challenge and submits,
which checks that the hash preimage, instruction encoding, account order and
reward scaling still agree between the app and the program. Run it after any
change to either side.

## What the program verifies

It recomputes `sha256(challenge || authority || nonce)` and counts leading
zero bits, rejecting anything below the claimed difficulty. It rejects a
reused nonce and a submission too close to the previous one by slot.

It does not verify the gait classification, because on-chain verification of
sensor data is not possible. The classifier runs on the device and the
program trusts it. Hardware attestation proving the binary is unmodified is
the next step that would close that gap.
