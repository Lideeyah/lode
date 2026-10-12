# X profile kit

Images are in `brand/social/`.

| File | Where | Size |
|---|---|---|
| `x-avatar.png` | Profile picture | 1000×1000, paper, red mark. Checked at 48px, 72px and 133px — the two impulses stay readable at timeline size. |
| `x-header.png` | Header banner | 1500×500, ink, lockup and tagline held in the upper two thirds so the avatar never covers them. |
| `x-post-card.png` | Attach to the launch post | 1200×675, paper. |

---

## Bio

**Use this one.**

```
Mining where the scarce input is physical effort, not electricity. Your phone mines only while it can prove a real person is walking. Solana Mobile.
```

Alternatives, if you want a different emphasis:

```
Proof of work where the scarce input is you. Six signals of human gait, read 50x a second, on-device. Shake the phone and it stops paying. Solana Mobile.
```

```
Your phone mines only while it can prove you're walking. Not a step counter — six gait signals at 50Hz, verified on-chain. Solana Mobile.
```

## Link

```
https://github.com/Lideeyah/lode
```

The repo rather than the APK directly. It carries the APK, the demo video,
the screenshots and the docs, so one link covers everything — and a raw
60MB download is a hostile thing to put behind a profile link.

---

## The post

**Use this one.**

```
Most mining spends electricity. Lode spends effort.

Your phone mines only while it can prove a real person is walking — six
gait signals, read on-device 50x a second.

Shake it instead and it stops paying.

Clock In · a Solana Mobile hackathon

github.com/Lideeyah/lode
```

Attach `x-post-card.png`, or the demo video itself if you'd rather lead
with motion.

### A thread, if you want to go longer

**1/**
```
Most mining spends electricity. Whoever buys the most power wins.

Lode changes the input. The scarce resource is physical human effort.

Your phone only mines while it can prove a real person is walking.
```

**2/**
```
The hard part was never the mining.

A step counter is trivially faked — shake your phone, earn forever.

So the whole product is one question: can a phone tell a person walking
from a person pretending?
```

**3/**
```
Six signals, 50 times a second. Cadence. How much your stride varies.
And the decisive one — a walking body rotates as it steps, and a shaken
phone doesn't.

Combined so that any one going missing collapses the score. You can't
fake five and carry the sixth.
```

**4/**
```
We found this the hard way. A shaken phone scored 0.74 and credited.

The fix wasn't a new signal — it was weighting the one that can't be
faked. Same shake now scores 0.21 and is refused.

0 false positives, 0 false negatives across 12 movement scenarios.
```

**5/**
```
An Anchor program on devnet recomputes the hash itself, counts the
leading zero bits, and mints only if the work holds up.

It cannot verify the walking — that runs on the device. Hardware
attestation closes that gap and it's what we build next.
```

**6/**
```
Android app, Anchor program, all of it open.

github.com/Lideeyah/lode
```

---

## Notes

**Don't say "move to earn".** It invites the StepN comparison, and that
whole category collapsed because supply scaled with capital — buy more
sneakers, earn more. Lode's argument is the opposite: supply is capped by
human hours, which is the one input money cannot buy more of. Borrowing
the category name gives away the distinction the project is built on.

**Post 4 is the one that travels.** Admitting your own classifier failed
and showing the number is more credible than any claim that it works, and
technical readers reward it.

**Keep the limitation in the thread.** Saying the chain cannot verify the
walking, before anyone asks, is what makes the rest believable.
