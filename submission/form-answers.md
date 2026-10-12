# Clock In — submission form answers

Team HER · Track: Clock In Hackathon · Deadline **13/10/2026 00:59**

Copy each block into its field. Everything is filled in except the deck
URL, which doesn't exist yet.

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
The same shake now scores 0.299 and is refused. A motion floor sits ahead
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

ANCHOR PROGRAM ON DEVNET
Recomputes sha256(challenge || authority || nonce), counts leading zero
bits, rejects anything below the claimed difficulty, rejects reused nonces,
rate-limits by slot, and mints scaled to achieved difficulty.

LIVE VERIFICATION SCREEN
All six signals shown live against the bands they must sit inside, so the
classification is inspectable rather than asserted. Shake the phone and you
watch them fall out of range.
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

Seeker is also where this product's open problem closes. Lode's constraint
is that the gait classifier runs on the device and the chain has to trust
it. Hardware attestation is what would close that gap, and a phone with a
secure element is the natural place for it.
```

---

## DECK URL *

```
[paste once the deck is published]
```

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

## Checklist before submitting

- [ ] Demo video set to **Public**
- [ ] Deck published, URL pasted in
- [ ] APK link opened once on a phone to confirm it downloads
- [ ] Repo loads while logged out
- [ ] Hit **Save** before **Submit** — the lead submits

## If the AI Coach flags anything

The form has a "Run AI Coach" button. Worth running once before you submit —
it costs nothing and may catch a field convention I can't see from here.
