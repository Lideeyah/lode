# YouTube description

Copy everything between the rules. Chapter timestamps are verified against
`lode-demo.mp4` (2:13) — YouTube turns them into chapters automatically as
long as the first one is 0:00.

---

**Lode — proof of work where the scarce input is you**

Bitcoin mining spends electricity. Lode spends effort.

Your phone searches for a solution only while it can verify that a real
person is walking. Walk longer and the iteration budget climbs, so the
phone is allowed to search harder and finds higher-difficulty solutions.
Stop moving and that budget decays to zero inside a minute.

The hard part was never the mining. It's proving the movement is real.

— HOW IT KNOWS YOU'RE WALKING —

A step counter can be fooled by shaking the phone. Lode reads six
signatures of human movement from the accelerometer and gyroscope at 50Hz,
over a five-second window refreshed every second:

• Cadence — stride lands between 1.2 and 3.4 steps per second
• Step variance — gait repeats approximately, never exactly, never randomly
• Skew — footfalls push acceleration up more sharply than down
• Kurtosis — shaking spikes far harder than a footfall does
• Orientation drift — a carried phone wanders; a mounted one doesn't
• Gyro coupling — a walking body rotates as it steps; a shaken one doesn't

They're combined geometrically rather than averaged, so the score collapses
the moment any single signature goes missing. You can't fake five and carry
the sixth.

All six are visible live in the app, each against the band it has to sit
inside. Watch them fall out of range at 1:02.

— WHAT THE CHAIN ACTUALLY CHECKS —

An Anchor program on Solana devnet recomputes sha256(challenge ‖ authority ‖
nonce) itself, counts the leading zero bits, and rejects anything below the
claimed difficulty. It rejects reused nonces and rate-limits submissions by
slot. The reward scales with the difficulty actually achieved. Nothing is
taken on the client's word.

The session in this video found a difficulty-22 solution across 250,618
hashes and was paid 1,638.40 LODE. That's a real devnet transaction.

— THE LIMITATION, STATED PLAINLY —

The chain verifies the hash and the signature. It cannot verify the gait
classification, because on-chain verification of sensor data isn't
possible. The classifier runs on the device and the program trusts it.

Hardware attestation — proving the binary is unmodified — is the step that
closes that gap, and it's the next thing to build. Saying so beats letting
someone find it.

— CHAPTERS —

0:00 Mining where the scarce input is you
0:14 Connecting a wallet
0:18 At rest — the instrument is idle
0:24 Warming: listening before it credits anything
0:33 Crediting — effort, confidence, iteration budget
0:53 Verification: what the instrument sees
1:02 Shaking the phone instead of walking
1:20 Walking resumes, confidence recovers
1:34 Back to the session
1:40 Ending the session
1:44 Signing the effort claim and submitting
1:50 1,638.40 LODE minted on devnet
1:58 History

— ON CHAIN (devnet) —

Program  ADYPeA3jNDXoXQjYSTXwLCXjFiWJWZx99ANRnhiGf5Wp
Mint     8vRrdq81gjZVcCFFCrZcjd2AKrkenKmSw5ndhYcUmdrN

https://explorer.solana.com/address/ADYPeA3jNDXoXQjYSTXwLCXjFiWJWZx99ANRnhiGf5Wp?cluster=devnet

— BUILT WITH —

React Native / Expo SDK 57 · Mobile Wallet Adapter · SHA-256 via
react-native-quick-crypto · expo-sensors · one Anchor program on devnet

No Rust in the mobile app. Effort claims are signed through Mobile Wallet
Adapter, which on a Seeker routes to the Seed Vault Wallet.

— DELIBERATELY OUT OF SCOPE —

Background sessions with the screen off, hardware attestation, multi-device
accounts, leaderboards, anything social, and iOS.

— CODE —

https://github.com/Lideeyah/lode

#Solana #SolanaMobile #ProofOfWork #Web3 #Hackathon

---

## Short version

For anywhere with a tight character limit.

> **Lode — proof of work where the scarce input is you.**
>
> Your phone only mines while it can verify a real person is walking. Six
> signatures of human gait, read at 50Hz, combined so that any one of them
> going missing collapses the score — shake the phone instead and it stops
> crediting (1:02).
>
> An Anchor program on Solana devnet recomputes the hash itself and mints
> only if the work holds up. This session: difficulty 22 across 250,618
> hashes, 1,638.40 LODE.
>
> The chain can't verify the gait classification — that runs on the device.
> Hardware attestation is the next step.
>
> Code: https://github.com/Lideeyah/lode

---

## Note

If you want to be explicit that the motion in this recording is simulated
rather than a real walk, this is the line to add, near the top:

> Recorded against a simulated gait signal — the classifier, the mining and
> the on-chain transactions are all real; only the accelerometer stream is
> generated.

Your call whether it goes in.
