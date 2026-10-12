# Threat model

What Lode prevents, what it does not, and how the gap would be closed.

The short version: the chain verifies the work, the device classifies the
movement, and an attacker who can modify the client can mint without
walking. Everything below is an attempt to be precise about the
consequences of that, rather than to argue it away.

## What an attacker wants

To mint LODE without doing the physical work. Three routes, in increasing
order of capability.

## 1 · Fool the sensors — defended

Move the phone so the classifier believes a person is walking.

| Attack | Result | Why it fails |
|---|---|---|
| Shake rhythmically by hand | 0.248 | Too sharp, too fast, no rotation coupling |
| Shake slowly at walking cadence | 0.494 | Matches almost everything except rotation coupling |
| Swing it in a bag | 0.399 | Rotates, but has no footfall structure |
| Strap it to a vehicle | 0.397 | Vibration without stride periodicity |
| Mount it on something vibrating | 0.365 | No orientation drift at all |
| Leave it on a desk | 0.000 | Blocked by the motion floor before features run |

All measured; see [classifier-robustness.md](classifier-robustness.md).

The binding constraint is that a walking body rotates as it steps. Rotation
coupled to vertical acceleration is hard to produce by hand because it
requires moving the phone the way a hip moves, not the way an arm does.

**What would defeat this:** a motor rig that reproduces gait in three axes,
or replaying recorded sensor traces from a real walk. Both are available to
a determined attacker. Neither is available to someone idly gaming an app,
which is the population this layer is designed for.

**Economics:** the reward scales with hash difficulty, which scales with
sustained verified effort. A rig has to run continuously to earn
meaningfully, so the attack is not free — but it is cheap enough that this
layer alone should not be load-bearing for anything valuable.

## 2 · Modify the client — not defended

Patch the APK to report high confidence without reading sensors at all, or
call the program directly with a fabricated effort claim.

**This works.** Nothing in the current design prevents it.

The program checks that the hash is genuine and that the submitter signed
the transaction. It cannot check that the accompanying effort claim
describes something that happened. A modified client is indistinguishable
from an honest one from on-chain.

What the chain still enforces against such an attacker:

- **The proof of work is real.** The nonce must genuinely produce a hash at
  the claimed difficulty; the program recomputes it. Faking effort does not
  fake the hashing.
- **Nonces cannot be replayed.** They must strictly increase per miner.
- **Submissions are rate-limited by slot**, so one wallet cannot flood.

So a modified client still has to do the computation, and is reduced to
ordinary proof of work with no effort gate — the thing Lode exists to
improve on. It is a real attack and it removes the product's central claim.

## 3 · Attack the program — defended by construction

| Attack | Why it fails |
|---|---|
| Claim a difficulty not achieved | The program recomputes the hash and counts the zero bits |
| Replay a previous solution | Nonces must exceed the miner's stored counter |
| Submit someone else's work | The hash preimage binds to the submitting authority |
| Submit rapidly in a loop | Rate-limited by slot |
| Mint directly | Mint authority is a PDA; only the program can sign |

## How fraud would be detected today

None of this is built. It is what the data already supports.

Every session stores per-window feature vectors locally and a digest of
them travels in the effort claim. That makes several checks possible
without new instrumentation:

- **Implausible consistency.** Human gait wanders. A client reporting
  near-identical feature vectors across many windows is reporting
  synthetic data.
- **Effort against difficulty.** The two should correlate. A wallet
  reporting large effort and finding solutions at a rate inconsistent with
  the iteration budget it claims is misreporting one of them.
- **Session cadence.** A wallet mining twenty-three hours a day is not
  walking twenty-three hours a day.

These are heuristics, not proofs, and they belong on an indexer rather than
in the program.

## What closes the gap

**Hardware attestation.** Play Integrity on Android, or a Seeker's secure
element, can attest that the running binary is the one that was published.
An effort claim signed inside that boundary is evidence a patched client
cannot produce.

That is the single change that moves route 2 from "works" to "requires
defeating the device's secure element". It is a known path, it is why
Seeker is the right platform for this, and it is not built — three days was
enough to prove the mechanic, not to ship attestation.

## Honest summary

| Layer | Status |
|---|---|
| On-chain verification of the work | Built and verified |
| Resistance to casual sensor spoofing | Built and measured |
| Resistance to a modified client | **Not addressed** |
| Resistance to a motorised gait rig | Not addressed |
| Fraud detection from stored claims | Possible, not built |

Lode should be read as a working demonstration of effort-gated mining with
a trusted client, not as a system that is safe against an adversary who
controls the device.
