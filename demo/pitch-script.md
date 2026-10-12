# Lode — pitch script

A pitch is not a demo. The demo video shows the thing working; this one
argues why it should exist.

**Note on length.** The Clock In submission form has no pitch-video field —
it asks only for a deck, a demo video, a repo and an APK. So this is for a
live round or for narrating the deck, not a submission artifact. Unless a
format says otherwise, use the 60-second cut below; three minutes is longer
than most judging rounds give you, and nobody has ever complained that a
pitch ended early.

**Target: 3:00 at ~144wpm — this draft is 431 words.** A pitch to camera carries faster
than a voiceover, because there is no screen doing the work for you. Each
section below shows its budget. A 60-second cut is at the bottom.

Two places need your input, marked `[YOURS]`. I have left them blank rather
than invent them.

---

### 0:00 – 0:25 · The hook — 58 words

> Proof of work has exactly one input: electricity.
>
> Whoever buys the most power wins. That's why mining left bedrooms and
> ended up in warehouses next to power stations, and why ordinary people
> stopped being able to participate years ago.
>
> Lode changes the input. The scarce resource isn't electricity. It's
> physical human effort.

---

### 0:25 – 0:55 · The problem this actually solves — 68 words

> Here's a problem nobody has solved well: how do you distribute something
> to humans, rather than to capital or to bots?
>
> Airdrops get farmed by people running a thousand wallets. Captchas get
> solved by scripts for a tenth of a cent. Proof of personhood usually
> means handing over your passport or letting someone scan your eye.
>
> Walking is interesting because it costs time, and time doesn't scale
> with money. You cannot buy a thousand bodies walking for an hour.

---

### 0:55 – 1:40 · The hard part — 98 words

> Except a step counter is trivially faked. Shake your phone, earn forever.
> If that works, the whole thing is worthless.
>
> So the entire product is one question. Can a phone tell the difference
> between a person walking and a person pretending?
>
> We read six signatures of movement, fifty times a second. Cadence. How
> much your stride varies — because real walking repeats approximately,
> never exactly. And the decisive one: a walking body rotates as it steps.
> Shaking translates without rotating.
>
> Then we combine them so that any single one going missing collapses the
> score. You can't fake five signals and carry the sixth.

---

### 1:40 – 2:10 · What exists — 66 words

> This isn't a mockup. There's a working Android app and an Anchor program
> live on Solana devnet.
>
> Your verified effort sets how hard the phone is allowed to hash. The
> program then recomputes the hash itself, counts the leading zero bits,
> rejects reused nonces, and mints scaled to the difficulty you actually
> achieved.
>
> Nothing is taken on the client's word. If you didn't do the work, you
> don't get paid.

---

### 2:10 – 2:30 · The limit, before they ask — 48 words

> One thing I'll say before anyone asks it.
>
> The chain verifies the hash. It cannot verify the walking — that runs on
> the device, and the program trusts it. On-chain verification of sensor
> data isn't possible.
>
> Hardware attestation closes that gap. It's the next thing we build.

---

### 2:30 – 2:50 · Why it's bigger than mining — 54 words

> The mining is the demo. The gate is the product.
>
> Anything that wants to reach humans who physically show up needs this —
> rewards that can't be farmed from a server rack, incentives tied to real
> movement, distribution that reaches people instead of capital.
>
> We built the hard part. Mining is just the first thing to put behind it.

---

### 2:50 – 3:00 · Close — 28 words

> `[YOURS]` — one line on why you're the person building this.
>
> Lode. Proof of work where the scarce input is you.

---

## The 60-second cut

For a pitch round with a hard minute. **138 words.**

> Proof of work has one input: electricity. Whoever buys the most power
> wins.
>
> Lode changes the input to physical human effort. Your phone only mines
> while it can verify a real person is walking.
>
> The hard part isn't the mining — it's that a step counter is trivially
> faked. Shake your phone and earn forever.
>
> So we read six signatures of movement fifty times a second. The decisive
> one: a walking body rotates as it steps, and shaking doesn't. They're
> combined so any one going missing collapses the score.
>
> There's a working Android app and a program live on devnet that
> recomputes the hash itself before it pays.
>
> The mining is the demo. The gate — proving a human did something
> physical — is the product.

---

## Delivery notes

**The hook has to land in fifteen seconds.** "Proof of work has exactly one
input: electricity" is the whole pitch compressed. If someone stops
listening after that sentence, they still got the idea.

**Slow down at 0:55.** The shake objection is the thing every technical
person in the room is already thinking. Naming it before they do is what
buys you the next ninety seconds of attention.

**Don't rush the limit at 2:10.** It reads as confidence, not weakness —
but only if you deliver it unhurried. Rushing it sounds like you're hoping
nobody noticed.

**Never say "gait" out loud** — it's indistinguishable from "gate". Say
"the walking". Same for "listens": the app reads motion sensors, not a
microphone.

## What I did not write for you

**`[YOURS]` at 2:50 — why you.** Judges fund people. One honest line about
why you're the one building this beats any claim I could invent.

**No market sizing, no traction, no revenue model.** I have no basis for
any of it, and a made-up number is the fastest way to lose a room. If the
format demands them, they have to come from you.

**The 2:30 section is positioning, not product.** Everything before it
describes something that exists and runs. That section describes what the
gate could be used for, and nothing beyond the mining is built. Keep it
framed as "this is what it unlocks", never as "this is what we have".
