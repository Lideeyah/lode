# Lode — demo voiceover

Timed to `lode-demo.mp4` (2:13). **224 spoken words**, about 101
words per minute — slow enough to sound unhurried and to leave the screen
room to do its own work.

Each section shows its window, its word budget, and the words. If you add a
sentence, cut one. The silences marked are deliberate; they are where the
numbers on screen are the argument.

---

### 0:00 – 0:14 · Onboarding — 28 words

> Bitcoin mining spends electricity.
>
> Lode spends effort.

*(let card two land)*

> Your phone only mines while it can prove a real person is walking. The
> hard part was never the mining. It's proving the movement.

---

### 0:14 – 0:18 · Connect — 4 words

> Connect a wallet.

---

### 0:18 – 0:24 · At rest — 9 words

> Nothing running. Flat line. The instrument is idle.

---

### 0:24 – 0:33 · Warming — 17 words

> Start a session and it listens before it pays. Five clean windows before
> anything accrues.

---

### 0:33 – 0:53 · Crediting — 42 words

> Now it's crediting.

*(2 second pause)*

> Confidence updates once a second. The trace is live accelerometer data.

*(2 second pause)*

> And the iteration budget — that climbing number — is how hard the phone
> is allowed to hash. Keep walking and it climbs.

---

### 0:53 – 1:02 · Verification — 17 words

> Six signals, live. Each one against the band it has to sit inside.

*(pause)*

> All six inside.

---

### 1:02 – 1:20 · The shake  ← **the moment** — 23 words

> Now watch a shake instead of a walk.

*(SILENCE — at least 6 seconds. Let the bars fall out on their own.)*

> The rotation signal collapses. Step variance goes out. It stops crediting.

---

### 1:20 – 1:34 · Recovery — 24 words

> Walk again and it recovers.

*(pause)*

> Decay ramps over a minute, so stopping at a traffic light doesn't destroy
> your session.

---

### 1:34 – 1:44 · Ending — 18 words

> End the session.

*(pause)*

> Sign the effort claim. Free, instant, no transaction.

---

### 1:44 – 1:50 · Submit — 15 words

> Then submit. The program recomputes the hash itself and counts the
> leading zeros.

---

### 1:50 – 1:58 · Reward — 13 words

> Difficulty twenty-two. Sixteen hundred tokens.

*(pause)*

> That number came off the chain.

---

### 1:58 – 2:13 · The honest note, and close — 39 words

> One honest note. The chain verifies the hash. It cannot verify the
> walking — the phone decides that, and the chain trusts it. Hardware
> attestation closes the gap. That's next.

*(pause)*

> Lode. Proof of work where the scarce input is you.

---

## If you need it shorter still

Cut these three in order. Each is self-contained and nothing downstream
depends on it:

1. **Recovery (1:20)** — 24 words. Nice, not essential.
2. **At rest (0:18)** — 9 words. The screen already says "instrument idle".
3. **The second half of Crediting** — the trace sentence. The budget line is
   the one that matters.

That takes you to 200 words, about 90wpm, which is very relaxed.

## Delivery notes

**Do not fill the silence at 1:02.** Six seconds of nothing while the bars
drop out of their bands is the most persuasive thing in the video. Talking
over it is the single easiest way to waste it.

**If you only get 30 seconds with a judge**, play 1:02 to 1:20 and say the
shake line. Nothing else.

**Keep the honest note.** Two of the seven judges are security researchers,
and the gap is visible to anyone who reads the program. Twenty-two words,
and it is the difference between being caught and being ahead of them.

The three-word signpost earns its place: without it the sentence sounds
like more description, and a listener may not register that you raised the
weakness yourself. That framing is the entire reason to say it.

**Never say "gait" out loud.** It is indistinguishable from "gate", and a
listener spends the next three seconds working out which you meant. Say
"the walking" everywhere, including in Q&A.

**Numbers are read as words**: "difficulty twenty-two", "sixteen hundred
tokens". Don't read 1,638.40 aloud — it's on screen, and saying it costs
four seconds you don't have.

## What this recording shows

- **Real:** the app, the classifier, the scoring, the mining, and the
  on-chain transaction. Difficulty 22 across 250,618 hashes, paid 1,638.40
  LODE on devnet. The signature on screen is verifiable.
- **Simulated:** the motion input. A browser has no accelerometer, so the
  sensor stream is generated. The classifier is not told which mode it is
  in; it reads numbers and reaches its own verdict.
