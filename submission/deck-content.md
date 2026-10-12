# Lode — deck content

**This is the only deck document. 16 slides.** Headline, body, and what
belongs on screen. Speaker notes are for a live round; the deck reads
without them.

### Every figure in the deck, in one place

Use these and no others. All are verifiable against the mint on devnet.

| Figure | Value | Appears on |
|---|---|---|
| Difficulty found | **15** | 9 |
| Hashes searched | **128,177** | 9 |
| Paid for that session | **12.80 LODE** | 9, 10 |
| Total issued to date | **2,082.40 LODE** | 9, 15 |
| Shake before the fix | **0.689, credited** | 8 |
| Shake after the fix | **0.299, refused** | 8 |
| Rotation coupling, walking | **0.997** | 7 |
| Rotation coupling, shaken | **0.064** | 7, 10 |
| Confidence when shaken | **33** | 10 |

Slides 9 and 10 describe **the same session**, which is the one in the
screenshots. An earlier draft quoted a different real session — difficulty
22, 250,618 hashes, 1,638.40 LODE — and if your current deck still shows
those on slide 9, change them: adjacent slides disagreeing reads as
carelessness whichever number is larger.

The total only ever rises, so understating it is safe.

Written to be read in about ninety seconds by a judge who will not watch
the video first. Every claim here is checkable against the repo or the
chain, except where flagged at the bottom.

---

## 1 · Title

**LODE**

> Proof of work where the scarce input is you.

`CLOCK IN · SOLANA MOBILE · TEAM HER`

**Visual:** ink slide — the one inversion in the deck. The mark in paper,
centred, wordmark beneath.

---

## 2 · The thesis, before anything else

### Your phone only mines while it can prove a real person is walking.

Walk longer and it's allowed to search harder. Stop, and the budget decays
to zero inside a minute.

**Visual:** the two-impulse waveform, large, signal red on paper. Nothing
else.

**Note:** if a judge reads one slide, this is the one. Don't bury it behind
a problem statement.

---

## 3 · The problem

### Proof of work has exactly one input: electricity.

Whoever buys the most power wins. That's why mining left bedrooms and ended
up in warehouses beside power stations, and why ordinary people stopped
being able to take part years ago.

The same capture happens everywhere crypto tries to reach people:

| Mechanism | How it gets captured |
|---|---|
| Airdrops | One operator, a thousand wallets |
| Captchas | Solved by scripts for a fraction of a cent |
| Proof of personhood | Your passport, or a scan of your iris |

**Visual:** the table in mono, `rule` hairlines, no fill.

---

## 4 · Why effort, specifically

### Hashrate is for sale. An hour of walking isn't.

Everything on the previous slide fails for the same reason: it has a price.
Capital converts straight into electricity, into GPUs, into wallets, into
solved captchas. Scale is a purchase order.

Physical effort is the one input that doesn't convert. Ten thousand GPUs is
an afternoon and a credit card. Ten thousand people walking for an hour is
ten thousand people walking for an hour.

That is the entire reason this mechanism holds.

**Visual:** a mono table, `rule` hairlines, no fill. The final row is the
slide — leave the price column empty and let the gap do the work.

| `INPUT` | `PRICE AT SCALE` |
|---|---|
| Hashrate | Rentable by the hour |
| Wallets | Free, unlimited |
| Captcha solves | A tenth of a cent each |
| Proof-of-personhood bypass | Whatever an identity costs |
| **An hour of walking** | **—** |

**Note:** slide 3 says the problem is capture by capital. This slide says
why effort escapes it. If a judge is going to object that walking is an
arbitrary choice, this is the slide that answers them — so it needs to read
as an argument, not a restatement.

---

## 5 · The hard part

### A step counter is trivially faked.

Shake your phone. Earn forever. If that works, none of the rest matters.

So the entire product reduces to one question:

> **Can a phone tell the difference between a person walking and a person
> pretending?**

**Visual:** the quote large in Newsreader, centred, lots of air.

**Note:** say this before a judge thinks it. Naming the obvious attack is
what buys attention for the next two slides.

---

## 6 · Six signals, fifty times a second

### What the instrument reads.

| Signal | What it catches |
|---|---|
| `CADENCE` | Stride sits between 1.2 and 3.4 steps per second |
| `STEP VAR` | Gait repeats approximately — never exactly, never randomly |
| `SKEW` | Footfalls push acceleration up more sharply than down |
| `KURTOSIS` | Shaking spikes far harder than a footfall |
| `ORIENT` | A carried phone wanders; a mounted one never does |
| `GYRO CORR` | A walking body rotates as it steps |

Computed on device over a five-second window, refreshed every second. Raw
samples never persist and never leave the phone.

**Visual:** mono table. Each row with a thin band bar, `credit` green fill.

---

## 7 · The one that's hard to fake

### A walking body rotates as it steps.

A phone shaken in the hand translates without rotating. That coupling
between rotation and vertical motion is the signature a faker has to
reproduce — and reproducing it means actually moving like a person.

**Visual:** two trace panels stacked. Top labelled `WALKING`, a clean
periodic trace. Bottom labelled `SHAKEN`, sharper and denser. Mono readout
beside each showing the gyro correlation.

---

## 8 · Why you can't fake five and carry the sixth

### We combine the signals geometrically, not on average.

An average lets five soft passes outvote one hard failure. We found this
the hard way: a shaken phone scored **0.74** and credited, while the only
signal that genuinely rejected it was drowned out by the other five.

Combining them so the score collapses when any single signature goes
missing changed that result to **0.299** — refused.

A motion floor sits ahead of all six, because the features are shape
statistics and the shape of sensor noise lands inside the walking bands by
accident. Without it, a phone sitting still on a desk scores 0.91.

**Visual:** two big mono figures — `0.74 CREDITED` in `error`, `0.299
REFUSED` in `credit`. Caption beneath: `THE SAME SHAKE, BEFORE AND AFTER`.

**Note:** this slide is the technical credibility of the whole deck. It
says we attacked our own classifier and it failed, so we rebuilt it.

---

## 9 · What the chain actually verifies

### It recomputes the work. It doesn't take our word for it.

An Anchor program on Solana devnet:

- recomputes `sha256(challenge ‖ authority ‖ nonce)` itself
- counts the leading zero bits and rejects anything below the claim
- rejects a reused nonce, and rate-limits submissions by slot
- mints scaled to the difficulty actually achieved

```
PROGRAM   ADYPeA3jNDXoXQjYSTXwLCXjFiWJWZx99ANRnhiGf5Wp
MINT      8vRrdq81gjZVcCFFCrZcjd2AKrkenKmSw5ndhYcUmdrN
```

The session shown on the next slide found a difficulty-15 solution across
128,177 hashes and was paid 12.80 LODE.

Across every session mined so far, 2,082.40 LODE has been issued — all of
it against verified effort, none of it pre-mined or allocated.

**Visual:** addresses in mono, `muted`, small. Three large figures:
`DIFFICULTY 15`, `HASHES 128,177`, `LODE MINED 12.80`, with
`2,082.40 TOTAL ISSUED` beneath in a smaller size.

**Note:** these are the numbers from the session in the screenshots, so
the two slides agree. An earlier draft quoted a different session —
difficulty 22, 1,638.40 LODE — which was equally real but did not match
anything shown, and an unexplained discrepancy between adjacent slides
reads as carelessness whichever number is bigger.

---

## 10 · What it looks like

### The instrument, running.

Four states from one session, left to right.

| | |
|---|---|
| `05-session-warming.png` | **Measuring, not yet crediting.** Five clean windows required before anything accrues. |
| `06-session-active-crediting.png` | **Crediting.** Confidence, effort, and the iteration budget climbing. |
| `08-verification-shake-rejected.png` | **Shaken instead of walked.** Confidence 33, rotation coupling collapsed to 0.064, no longer crediting. |
| `11-reward-minted-on-devnet.png` | **Paid.** 12.80 LODE and a devnet signature. |

**Visual:** the four screens in a row at equal height, uppercase mono
caption beneath each. No device frames, no drop shadows, no angles — the
screens are already the right shape.

**Note:** these are the numbers on slide 9, which is why that slide uses
this session rather than a larger one from a different run. The full set
of twelve screens is in `docs/screenshots/`.

---

## 11 · What it does not verify

### The chain can't check the walking. We're not going to pretend it can.

The program verifies the hash and the signature. It cannot verify the
classification, because on-chain verification of sensor data isn't
possible. That runs on the device, and the program trusts it.

Hardware attestation — proving the binary is unmodified — closes that gap.
It's the next thing we build, and a device with a secure element is exactly
where it belongs.

**Visual:** plain. No figure, no chart. Let it be a sentence a judge reads.

**Note:** keep this slide. A judge who finds this themselves has caught
you; a judge who reads it here has been handed the most interesting
question in the deck, and you answered it first.

---

## 12 · Why this is a mobile project

### It could not exist anywhere else.

The input is motion hardware. There is no web version of this, and no
desktop version — the sensors are the product.

Effort claims are signed through Mobile Wallet Adapter, which on a Seeker
routes to the Seed Vault Wallet with no Lode-specific code path.

Seeker is also where the open problem closes: attestation needs a secure
element, and that's the one piece of hardware that has it.

**Visual:** three short lines, generous space. No device mockup.

---

## 13 · The reframe

### The mining is the demo. The gate is the product.

Proof that a human did something physical is a primitive. Mining is simply
the first thing we put behind it.

Anything that needs to reach people who actually showed up — rewards that
can't be farmed from a server rack, incentives tied to real movement — runs
into the same wall we just built a door in.

**Visual:** headline alone, centred, large. Possibly the only slide with
one line on it.

---

## 14 · Why anyone comes back

### We're not asking anyone to start walking.

Most consumer crypto has to manufacture a behaviour before it can reward
one. Lode attaches to something people already do daily, without
intending to, for reasons that have nothing to do with us.

That changes the retention question. It isn't *will they keep doing this* —
they will walk tomorrow either way. It's only *will they open the app
first*. That's a far smaller ask than "will they keep playing".

Three things make opening it worth the tap:

**It costs nothing extra.** A session runs during a walk that was already
happening — the commute, the dog, the shop. No set-aside time, no
competing with anything.

**Progress is legible and cumulative.** Streak, total effort, best
difficulty. Figures that only move by showing up, and that are visibly
yours rather than bought.

**You are not competing with capital.** Everyone has the same twenty-four
hours. Nobody can buy a thousand times your throughput, which is exactly
what makes most token distributions pointless to participate in after
week one.

**Visual:** two mono figures with uppercase labels, side by side. Use
exactly these — both are verifiable on devnet, which is the entire reason
to put a number on a slide:

```
BEST DIFFICULTY          LODE MINED
22                       2,069.60
```

**Do not show a streak, and do not show total effort.** The app is three
days old, so the true streak is one day, and a one-day streak printed on a
slide arguing for retention argues against it. Inventing a larger one is
worse: a judge who checks finds fabricated usage data, and everything else
on the slide becomes suspect.

The point of the slide is that progress is *legible and cumulative*, which
is made by showing what accumulates, not by claiming to have accumulated
it. Two real figures do that. If the layout demands a third, use
`SESSIONS` with the honest count.

**Note:** this is a thesis about behaviour, not an observed retention
curve, and that is worth saying aloud if asked. The app shipped three days
ago and there is no cohort data. The argument stands on the behaviour
being pre-existing — people walk tomorrow regardless — rather than on
numbers we do not have.

---

---

## 15 · What the token is for

### Supply is capped by human hours, not by capital.

*Total issued to date: 2,069.60 LODE, every token of it mined by a verified
session. Mint `8vRrdq81gjZVcCFFCrZcjd2AKrkenKmSw5ndhYcUmdrN` on devnet.*

That constraint is the whole economic argument, and it cuts two ways.

**It bounds issuance.** You cannot buy more throughput. A thousand dollars
of hardware mints nothing extra, because the gate is time spent moving,
and time is the one input that doesn't scale with money.

**It bounds the attacker.** A motorised rig reproducing gait has to run
continuously to earn meaningfully, competing against difficulty scaling
the whole time. That doesn't make it impossible — our
[threat model](../docs/threat-model.md) says plainly that it doesn't — but
it means abuse costs real sustained resource rather than a one-off spend.

### Where demand comes from

Mining is the demonstration. The asset is the gate.

Proof that a specific human did something physical is a primitive nothing
on Solana currently provides, and several things need it:

| Who needs it | What breaks without it |
|---|---|
| Airdrops and quests | Farmed by one operator with a thousand wallets |
| Local and retail rewards | No way to show someone actually turned up |
| DAO and governance weighting | One person, many votes |
| Health and insurance incentives | Self-reported, unverifiable |

Each of those is an integration that pays to consume verified effort. That
is the direction of travel, and it is the reason to care about the gate
rather than the coin.

**Visual:** the table in mono with `rule` hairlines. The headline figure is
the sentence, not a number — resist adding one.

**Note, and say it before a judge asks:** none of those integrations
exists. No partner, no pilot, no letter of intent. What exists is the gate,
working, on devnet. Presenting the table as demand we have would be the one
claim in this deck that doesn't survive a question.

---

---

## 16 · Scope, and what's next

### What we deliberately left out.

Background sessions with the screen off · hardware attestation ·
multi-device accounts · leaderboards · anything social · iOS

Three days, one builder. A short deliberate scope is a decision. A long
apologetic one is a list of things you ran out of time for.

**Next:** attestation on Seeker, then calibration against a wider range of
gaits and carry positions.

```
REPO    github.com/Lideeyah/lode
APK     github.com/Lideeyah/lode/releases/latest
DEMO    youtube.com/shorts/PFBdXa-BeTs
```

**Visual:** out-of-scope list as mono, `muted`, separated by middots. Links
in mono at the base.

---

---

## Claims discipline — read before you present

Three things to be careful about, because a judge may press on them.

**The gait bands are not yet calibrated against real walking.** They are
reasoned starting points, validated against synthetic signals that confirm
walking must outscore shaking must outscore stillness. The separation is
real; the specific thresholds are not yet measured on a human. If asked:
say exactly that, and that calibration is a device-day, not a redesign.

**The demo video's motion is simulated.** The classifier, the scoring, the
mining and the on-chain transaction are all real — the accelerometer stream
is generated, because it was recorded through the web build. The numbers on
slide 9 are genuine outputs of a real session and a real devnet mint.

**Slide 12 is positioning, not product.** Everything before it describes
code that exists and runs. Nothing beyond the mining is built. Frame it as
what this unlocks, never as what you have.

Being the team that volunteers these three things is worth more than the
slide you'd gain by hiding them.
