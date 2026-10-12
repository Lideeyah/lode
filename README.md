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

**2 · Read [`src/sensing/bands.ts`](src/sensing/bands.ts)** — 142 lines. Every
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

[ux-walkthrough.md](docs/ux-walkthrough.md) shows every screen and state
with screenshots, including the error paths.

[security-audit-response.md](docs/security-audit-response.md) triages the
28 findings from the hackathon's advisory audit — what was fixed, what is
a false positive and why, and what is accepted.

Two documents go further than this README:
[classifier-robustness.md](docs/classifier-robustness.md) measures the
classifier against thirteen movement scenarios — six walking and running,
seven non-gait, including a shake deliberately faked at walking cadence —
with no false positives and no false negatives, and
[threat-model.md](docs/threat-model.md) states what is defended, what is
not, and what closes the gap.

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

**Set your wallet to devnet.** Lode runs on Solana devnet. The app
authorises without naming a cluster if the wallet declines devnet, and
broadcasts through its own endpoint either way, so a wallet left on
mainnet will still sign and still mint — but it will not show you the
balance. In Phantom: Settings → Developer Settings → Testnet Mode, then
choose Solana Devnet. Solflare is similar.

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

### Where the trust boundary sits

The program recomputes the SHA-256 preimage and checks the leading zero bits
itself, so the difficulty claimed in a submission is proved, not asserted.
The signature binds it to a wallet, nonces must strictly increase per miner,
and a cooldown bounds submission rate.

The classifier is the other side of that boundary. It runs on the device and
the program accepts its verdict, so a modified client could assert a session
it never walked. That is the surface worth attacking, and it is where the
next work goes: hardware attestation of an unmodified binary, plus the
off-chain heuristics in [threat-model.md](docs/threat-model.md) that read the
per-window feature digest already carried in every claim — implausible
consistency, effort against difficulty, and session cadence.

The thresholds themselves are tuned rather than calibrated: real walking on a
Xiaomi 14T credits at 70–78 mean confidence against a threshold of 62 and
mines at difficulty 18–20, a shaken phone is refused, and a still one never
accrues. What is not yet shown is breadth across other gaits, carry positions
and sensor hardware.

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
scripts/             program id sync, e2e check
```

## Calibration

`src/sensing/bands.ts` holds every threshold. They began as reasoned
numbers and have since been checked on a Xiaomi 14T, where real walking
credits at 70–78 against a threshold of 62 and a shaken phone is refused.
That is one handset and one gait, so the bands are known to work rather
than known to generalise, and the way to find their edges is to attack
them on your own device.

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
