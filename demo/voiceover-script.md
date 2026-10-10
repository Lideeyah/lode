# Lode — demo voiceover

Three minutes. Timings match `lode-demo.mp4`. Read at an unhurried pace;
the long pauses are where the screen does the talking.

---

### 0:00 — 0:18 · Cold open, onboarding

> Most crypto mining spends electricity. Lode spends effort.
>
> Your phone only searches for a solution while it can verify that a real
> person is walking. Walk longer, and it's allowed to search harder.

*(pause through card two)*

> The hard part isn't the mining. It's proving the movement is real.

---

### 0:18 — 0:30 · Connect, home at rest

> Connect a wallet and the instrument is idle. Flat line, nothing
> accruing.

---

### 0:30 — 0:45 · Warming

> Start a session and Lode doesn't pay immediately. It listens first.
>
> Five consecutive windows have to clear the threshold before anything
> accrues. Most products would hide this step. Showing it is the point —
> it's what tells you the verification is real before you've any reason
> to trust it.

---

### 0:45 — 1:05 · Active session

> Now it's crediting.
>
> Confidence updates once a second. The trace is live accelerometer
> magnitude. And the iteration budget — that number climbing — is how
> hard the phone is permitted to hash right now.
>
> That's the whole mechanic in one figure. Keep moving and it climbs.
> Stop, and it decays to zero inside a minute.

---

### 1:05 — 1:20 · Verification tab

> This is the part worth watching.
>
> Six signals, live, each against the band it has to sit inside.
> Cadence. How much your stride varies. Skew and kurtosis of the
> acceleration. Orientation drift. And the coupling between rotation and
> vertical motion — because a walking body rotates as it steps.
>
> All six inside. Ninety-eight confidence.

---

### 1:20 — 1:45 · The attack  ← **the important thirty seconds**

> Now watch what happens when the phone is shaken instead.

*(let it run — say nothing for ~6 seconds)*

> Step variance goes out of range. Gyro correlation collapses to near
> zero — there's no rotation, because nothing is walking. Kurtosis falls
> out, skew falls out.
>
> Confidence drops to twenty-eight. The session moves to decaying and
> stops crediting.
>
> This is the answer to the only hard question anyone asks about this
> product. The six signals aren't averaged — they're combined so that
> any one of them going missing collapses the score. You can't fake five
> and carry the sixth.

---

### 1:45 — 2:00 · Recovery

> Resume walking and it recovers. A traffic light shouldn't destroy your
> session, so decay ramps over sixty seconds rather than cutting off.

---

### 2:00 — 2:30 · Session summary and submission

> End the session and you get what you did: duration, mean confidence,
> total effort, and the best solution found.
>
> Then two things touch the chain. You sign an effort claim — free,
> instant, no transaction. On a Seeker that routes through Mobile Wallet
> Adapter to the Seed Vault Wallet.
>
> Then you submit. The program recomputes the hash itself, counts the
> leading zero bits, rejects a reused nonce, and mints scaled to the
> difficulty you actually achieved. It doesn't take the client's word
> for any of it.

---

### 2:30 — 2:50 · The honest limit  ← **do not cut this**

> One thing worth saying plainly.
>
> The chain verifies the hash and the signature. It cannot verify the
> gait classification, because on-chain verification of sensor data
> isn't possible. The classifier runs on the device, and the program
> trusts it.
>
> Hardware attestation — proving the binary is unmodified — is the step
> that closes that gap, and it's the next thing we'd build.

---

### 2:50 — 3:00 · Close

> Lode. Proof of work where the scarce input is you.

---

## Delivery notes

**Lead with the attack.** If you only get sixty seconds in front of a
judge, play 1:20–1:45 and nothing else. It's the single most persuasive
thing here and it's the question they were going to ask anyway.

**Keep the honest-limit section.** Two of the seven judges are security
researchers. A judge who finds that gap themselves has caught you out; a
judge who hears you name it has been handed the most interesting slide in
your deck. Cutting it to save ten seconds is the worst trade available.

**Don't oversell the numbers.** Confidence figures and difficulty are
real outputs of the real code. Say what they are and let them stand.

## What this recording does and does not show

- **Real:** the app, the design, the feature extraction, the confidence
  scoring, the state machine, the rejection of shaking. All of it is the
  shipped code path.
- **Simulated:** the motion input. A browser has no accelerometer, so the
  accelerometer and gyroscope stream is generated. The classifier is not
  told which mode it's in — it reads numbers and reaches its own verdict.
- **Missing:** mining and the on-chain mint. Both need the devnet RPC,
  which was rate-limiting this IP throughout. "Best difficulty" shows a
  dash for that reason, not because mining is broken — the program is
  deployed and verified working separately.
