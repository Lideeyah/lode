# Lode

Mining where the scarce input is physical effort rather than electricity.

Lode is an Android app. It reads your phone's accelerometer and gyroscope at
50Hz, verifies that a real person is walking, and uses that verified effort
to decide how hard the phone is allowed to hash. An Anchor program on Solana
devnet recomputes the hash before it pays.

```
You walk  ->  the phone verifies it is really you walking
          ->  verified effort sets the iteration budget
          ->  the phone searches for a solution
          ->  the chain checks the work and mints
```

## If you're judging this

Four minutes, in this order.

**1 · Watch 1:02 to 1:20** of the [demo](https://youtube.com/shorts/PFBdXa-BeTs).
That's the phone being shaken instead of walked, and the classifier refusing
to credit it. It's the product's central claim, on camera.

**2 · Read [`src/sensing/bands.ts`](src/sensing/bands.ts)** — 124 lines. Every
threshold the classifier uses, with the reasoning for each. This is the file
that decides whether you get paid.

**3 · Read [`program/programs/lode/src/lib.rs`](program/programs/lode/src/lib.rs)**
— 379 lines. The `submit` instruction is the whole product: it recomputes the
hash rather than trusting the claim.

**4 · Verify it on chain.** The program is
[live on devnet](https://explorer.solana.com/address/ADYPeA3jNDXoXQjYSTXwLCXjFiWJWZx99ANRnhiGf5Wp?cluster=devnet).
`node scripts/e2e-submit.mjs` mines against the live challenge and submits,
so you can confirm the client and the program agree without installing
anything.

Two documents go further than this README:
[classifier-robustness.md](docs/classifier-robustness.md) measures the
classifier against twelve movement scenarios including four spoofing
attacks, and [threat-model.md](docs/threat-model.md) states what is
defended, what is not, and what closes the gap.

### What to be sceptical about

Two things, which we'd rather name than have you find.

**The chain cannot verify the walking.** It verifies the hash and the
signature. The classification runs on the device and the program trusts it.
Hardware attestation closes that gap and is the next thing to build.

**The thresholds are not yet calibrated against real human walking.** They
are reasoned starting points, validated against synthetic signals that
confirm walking must outscore shaking must outscore stillness. The
separation is real; the exact numbers are a device-day away, not a redesign.

---

## Watch it

**[Demo video](https://youtube.com/shorts/PFBdXa-BeTs)** — two minutes: a
session from cold start to tokens minted, including the classifier refusing
to credit a shaken phone.

## Install it

**[Download the APK](https://github.com/Lideeyah/lode/releases/latest)** — Android, ~60MB.

Open that link on the phone, tap the APK, and allow installation from
unknown sources when prompted. There is no Play Store listing.

The build is `arm64-v8a` only, which covers essentially every Android phone
made since about 2016. It will not run on an x86 emulator; if you need one,
add `x86_64` to `buildArchs` in `app.json` and rebuild.

**Set your wallet to devnet before connecting.** Lode runs on Solana
devnet, and most wallets default to mainnet and will refuse to connect
until you switch. In Phantom: Settings → Developer Settings → Testnet Mode,
then choose Solana Devnet. Solflare is similar.

Xiaomi's HyperOS and MIUI block sideloaded installs more aggressively than
stock Android. If you see "App not installed", turn off **MIUI
optimization** in Settings → Additional settings → Developer options, then
reboot and retry.

## The mechanic, precisely

A session is unlocked and sized by verified human movement. No verified
effort means the hash loop does not run and nothing is submitted. Sustained
effort raises the iteration budget, so the phone searches harder and finds
higher-difficulty solutions. Stop moving and the budget decays to zero
within a minute.

On chain, the program verifies two things before minting. First, that the
submitted nonce genuinely produces a hash meeting the claimed difficulty,
which it recomputes rather than trusts. Second, that the effort claim came
from the wallet submitting the transaction, which holds because that wallet
signs it. The reward scales with achieved difficulty.

## How the verification works

A step counter can be fooled by shaking. Lode reads six signatures of human
movement over a five second window, refreshed once a second:

| Feature | What it catches |
|---|---|
| Dominant frequency | Stride cadence, 1.2–3.4 Hz |
| Step interval spread | Gait repeats approximately, never exactly |
| Skewness | Footfalls push acceleration up more sharply than down |
| Kurtosis | Shaking spikes far harder than a footfall |
| Orientation drift | A carried phone wanders; a mounted one does not |
| Gyro/acceleration coupling | A walking body rotates as it steps |

Ahead of all six is a motion floor on the spread of acceleration magnitude.
The features are shape statistics, and the shape of sensor noise lands inside
the walking bands by accident — without the floor a phone sitting on a desk
scores 0.91 and credits.

All six are visible live on the Verification tab, each against the band it
must sit inside.

### What this does not do

The chain verifies the hash and the signature. It cannot verify the gait
classification, because on-chain verification of sensor data is not possible.
The classifier runs on the device and the program trusts it. Hardware
attestation proving the binary is unmodified is the named next step that
would close that gap.

## Running it

Requires Node 24 and an Expo account. There is no need for Android Studio or
a JDK — builds happen on EAS.

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

That produces an installable APK and a link to open on the phone. The
`development` profile instead produces a dev client that loads JavaScript
from `npx expo start`, which is faster to iterate against but needs the
phone and the computer on the same network.

Devnet is configured in `app.json` under `expo.extra`.

### Checks

```bash
npm test          # feature extraction and confidence scoring
npm run typecheck
npx expo-doctor
```

## The program

Deployed to devnet. See [program/DEPLOY.md](program/DEPLOY.md) for the
addresses, how to redeploy, and how to re-verify the chain path end to end.

```bash
cd program && anchor build && cargo test
```

`node scripts/e2e-submit.mjs` mines against the live challenge and submits,
which checks that the hash preimage, instruction encoding, account order and
reward scaling still agree between the app and the program. Run it after
changing either side.

## Layout

```
app/                 screens (expo-router)
src/sensing/         capture, windowing, features, confidence
src/sensing/bands.ts calibration constants — the file you tune
src/session/         state machine and orchestration
src/mining/          SHA-256 in yielding chunks
src/chain/           program bindings, adapter, submission
src/components/      design system primitives
program/             the Anchor program
brand/               mark, lockups, icon
scripts/             brand generation, program id sync, e2e check
```

## Calibration

`src/sensing/bands.ts` holds every threshold. The defaults are reasoned
starting points, not measurements, and none of them are trustworthy until
they have been checked against real data from the handset the demo runs on.

Walk, then run, then attack it: shake it, swing it in a bag, sit it on a
vehicle, tape it to something vibrating. Watch the Verification tab during
each. Real movement must sit inside the bands and every attack must fall
outside at least two of them.

## Deliberately out of scope

Background sessions with the screen off, hardware attestation, multi-device
accounts, leaderboards, anything social, and iOS.

## Stack

Expo SDK 57 with a development build, Mobile Wallet Adapter through
`@wallet-ui/react-native-web3js`, SHA-256 through `react-native-quick-crypto`,
sensors through `expo-sensors`, and one Anchor program.

There is no Rust in the mobile app. The only Rust in the project is the
program, which is a separate build and never touches the phone.
