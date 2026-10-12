# Retention and token utility — two slides to add

Insert after slide 12 ("The mining is the demo. The gate is the product"),
before the scope slide. Same design system as the rest of the deck.

The coach's suggestion was leaderboards, quests and staking sinks. Every
team told to improve retention will write that list, and a judge reading
the twentieth version of it discounts all of them. These two slides argue
something harder to dismiss, and say plainly which parts are built.

---

## Slide 13 · Why anyone comes back

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

**Visual:** three stacked mono figures with uppercase labels — `STREAK`,
`TOTAL EFFORT`, `BEST DIFFICULTY` — drawn from the History screen. Real
numbers from a real session, not placeholders.

**Note:** the honest weakness is that this is a thesis about behaviour and
not yet an observed retention curve. If asked, say that: the app shipped
three days ago, there is no cohort data, and the argument stands on the
behaviour being pre-existing rather than on numbers we don't have.

---

## Slide 14 · What the token is for

### Supply is capped by human hours, not by capital.

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

## If you only add one slide

Add **14**. Stickiness scored 62 against a median of 70, and the specific
criticism was that *token utility and abuse economics* are thesis-level.
Slide 14 answers both directly; slide 13 answers a question the judges did
not quite ask.

## Wording to avoid

**"Move to earn."** It invites comparison to StepN and the 2022 cohort,
all of which collapsed because supply scaled with capital — buy more
sneakers, earn more. Lode's entire economic argument is the opposite, and
borrowing the category name hands away the distinction.

**"Leaderboards and quests coming soon."** A roadmap of unbuilt consumer
features reads as a gap you know about, not a plan. The scope slide
already handles what's deliberately out.
