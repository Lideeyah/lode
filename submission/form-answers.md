# Clock In — submission form answers

Team HER · Track: Clock In Hackathon · Deadline **13/10/2026 00:59**

Every field is filled in. Copy each block into its matching field.

---

## PROJECT TITLE *

```
Lode
```

---

## PRIOR FUNDING FROM A VC OR ANGEL INVESTOR?

```
No
```

---

## BUILT IN THE LAST 3 MONTHS?

```
Yes
```

Every commit dates from 9–12 October 2026, and the repository history is
public if anyone checks.

---

## WON A PREVIOUS HACKATHON WITH THIS PROJECT?

```
N/A
```

---

## IF PORTING AN EXISTING APPLICATION TO MOBILE…

```
N/A — Lode is not a port.
```

---

## IF NO, WHAT MAJOR FEATURES OR NEW SIGNIFICANT MOBILE DEVELOPMENT HAVE YOU DONE?

```
Lode could not exist as a web or desktop application. Its entire input is
the phone's motion hardware. Everything below was written for this
hackathon.

SENSOR CAPTURE
Accelerometer and gyroscope fused on a single clock at 50Hz into a ten
second ring buffer, emitting a five second window once per second. Samples
are dropped by time rather than count, so a device running below target
still holds a full buffer. Raw samples never persist and never leave the
device.

ON-DEVICE GAIT CLASSIFICATION
Six features per window: dominant frequency by autocorrelation, inter-step
interval spread, skewness and kurtosis of acceleration magnitude,
orientation drift, and the correlation between gyroscope pitch rate and
vertical acceleration. The last is the decisive one — a walking body
rotates as it steps, and a shaken phone translates without rotating.

The six are combined geometrically rather than averaged, so the score
collapses when any single signature goes missing. An average let five soft
passes outvote one hard failure: a shaken phone scored 0.74 and credited.
The same shake now scores 0.208 and is refused. A motion floor sits ahead
of all six, because shape statistics computed over sensor noise land inside
the walking bands by accident.

SESSION STATE MACHINE
Warming requires five consecutive qualifying windows before anything
accrues, so a burst of shaking cannot pay out. Effort accrues weighted by
confidence. Decay ramps to zero over sixty seconds rather than cutting off,
so stopping at a traffic light does not destroy a session.

PROOF OF WORK ON THE HANDSET
SHA-256 via react-native-quick-crypto, run in yielding chunks so the
interface never blocks — there is no background thread available without
native code. Verified effort sets the iteration budget, so movement decides
how hard the phone is allowed to search.

MOBILE WALLET ADAPTER
Effort claims are signed through MWA as a human-readable message, separate
from the submission transaction, which is signed and sent through the same
wallet.

VERIFIED APP IDENTITY
Mobile Wallet Adapter verifies an app by resolving the origin of its
identity URI and reading that origin's Digital Asset Links file, which must
name the Android package and signing certificate. Lode publishes that
association at https://lideeyah.github.io/.well-known/assetlinks.json for
package com.lideeyah.lode, so wallets can confirm the app is what it claims
to be rather than warning that it may be impersonating another app.

ANCHOR PROGRAM ON DEVNET
Recomputes sha256(challenge || authority || nonce), counts leading zero
bits, rejects anything below the claimed difficulty, rejects reused nonces,
rate-limits by slot, and mints scaled to achieved difficulty.

LIVE VERIFICATION SCREEN
All six signals shown live against the bands they must sit inside, so the
classification is inspectable rather than asserted. Shake the phone and you
watch them fall out of range.

MEASURED, NOT ASSERTED
The classifier is characterised against twelve movement scenarios as a
test, so an attack that starts crediting fails the build: walking at four
cadences and carry positions, running, hand shaking, a slow shake faked at
walking cadence, a swinging bag, a vehicle, a mounted phone, and two kinds
of stillness. Zero false positives, zero false negatives, separation 0.501
between the worst human case and the best attack.

That suite immediately found a real hole. A slow rhythmic shake at walking
cadence scored 0.689 and credited — it matches walking on frequency, skew,
drift and step variance, and fails only on rotation coupling, which read
0.06 against 0.997 for a real walk. The feature discriminated perfectly
and the combination ignored it, because one failing signal could not
outvote five passing ones. Weighting that signal from a sweep takes the
attack to 0.494 against a 0.62 threshold with every modelled walk still
above 0.99.

VERIFIED ON HARDWARE
Three sessions walked on a Xiaomi 14T, reading its own accelerometer and
gyroscope at a measured 50Hz, with no tuning for that handset: mean
confidence 78 and 70 against a threshold of 62, mining solutions at
difficulty 20 and 18. The bands credit a real person walking, first time,
on a device they were not calibrated for. What has not been shown is that
they generalise across other gaits, carry positions and sensor hardware.

Full table, the weight sweep, the on-device results, and what synthetic
scenarios cannot establish: docs/classifier-robustness.md
What is defended, what is not, and what closes the gap:
docs/threat-model.md
Every screen and state, including error paths: docs/ux-walkthrough.md
Triage of all 28 findings from the advisory audit:
docs/security-audit-response.md
```

---

## DOES YOUR APPLICATION HAVE AN SKR INTEGRATION? IF SO, HOW?

```
Partially — and I want to be precise about what is and is not tested.

Lode signs effort claims and submission transactions through Mobile Wallet
Adapter. On a Seeker, MWA routes to the Seed Vault Wallet, so signing uses
Seed Vault on that hardware with no Lode-specific code path.

I do not own a Seeker, so I have not run this on the device and will not
claim it as tested. What is true is that the app uses the standard MWA
interface that Seed Vault implements.

So the accurate description is: an MWA-compatible Android app, pending
Seeker validation. Not a Seed Vault integration we have run.

Seeker is also where this product's open problem closes. Lode's constraint
is that the gait classifier runs on the device and the chain has to trust
it — a modified client can mint without walking, and nothing on chain can
tell it from an honest one. Hardware attestation is what closes that gap,
and a phone with a secure element is the natural place for it. That is
written up in full in docs/threat-model.md rather than left for a reviewer
to discover.
```

---

## DECK URL *

```
https://drive.google.com/file/d/11kuS6YjYoB6dCb_Vv-n2w_YFsVbQdZrZ/view?usp=sharing
```

16 slides. Verified publicly accessible — downloads as a PDF with no sign-in.

---

## DEMO VIDEO URL *

```
https://youtube.com/shorts/PFBdXa-BeTs
```

**Switch to Public first.** Currently unlisted, and the field asks for a
public link.

---

## REPOSITORY URL *

```
https://github.com/Lideeyah/lode
```

---

## ANDROID APK URL *

```
https://github.com/Lideeyah/lode/releases/download/v0.1.0/lode-v0.1.0.apk
```

A direct download, as the rules require — not a landing page. Permanent,
unlike an EAS artifact link, which expires after about thirty days.

---

## What changed after the AI Coach review

The coach scored 70/100 and listed six fixes. Where each stands:

| # | Fix | Status |
|---|---|---|
| 1 | Verifiable repository evidence | Repo submitted and audited; the audit is what fills the code-evidence slot, not the URL field |
| 1b | Remove leaked secret handling | Fixed — both capture scripts no longer write key bytes to browser storage; they start each run with a fresh unfunded devnet wallet |
| 2 | Close or narrow the client-trust gap | `docs/threat-model.md` — what is defended with measurements, what is not, how fraud would be detected, what attestation closes |
| 3 | Prove classifier robustness | `docs/classifier-robustness.md` — twelve scenarios, 0 false positives, 0 false negatives, and a real attack found and fixed |
| 4 | Retention and token utility | Two new deck slides, with figures that survive an explorer check |
| 5 | More UX surface area | Twelve screens in `docs/screenshots/`, written up in `docs/ux-walkthrough.md`, four of them on a deck slide |
| 6 | Test on Seeker or label as generic Android | SKR answer now says "MWA-compatible Android, pending Seeker validation" |

All six are addressed, and the follow-up review scored the submission
80/100, top quartile of 194 teams, with every criterion above median.
The audit returned 28 findings; three were acted on
— the repository is now MIT licensed, the capture scripts no longer write
key material to browser storage, and the web build's own use of it for a
throwaway devnet key is documented at the point it happens.
The rest are false positives with stated reasons, or accepted dependency
advisories inherited from Expo and web3.js. That triage is in
docs/security-audit-response.md.

## Checklist before submitting

- [ ] Re-run the AI Coach — it now has code evidence, which it did not before
- [ ] Demo video set to **Public**
- [ ] APK link opened once on a phone to confirm it downloads
- [ ] Repo loads while logged out
- [ ] Hit **Save** before **Submit** — the lead submits

## If the AI Coach flags anything

The form has a "Run AI Coach" button. Worth running once before you submit —
it costs nothing and may catch a field convention I can't see from here.
