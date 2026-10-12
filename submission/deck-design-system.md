# Deck design system

Feed this to Claude Design with the content document.

The deck uses the product's own design language. A deck that looks like the
app is doing free work: by slide three a judge recognises the typeface and
the red trace, and the product feels considered rather than assembled.

## Colour

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F2EEE4` | Every slide background. Warm, not white. |
| `ink` | `#1C1A17` | All headlines and body text. |
| `muted` | `#6B655C` | Labels, captions, secondary lines. |
| `rule` | `#DAD3C5` | Hairlines, table borders, dividers. |
| `signal` | `#D6442A` | **Reserved.** Waveforms and the logo mark only. |
| `action` | `#2B4A8B` | One accent per deck, for a single emphasis. |
| `credit` | `#6B7A3F` | A value inside its accepted band. |
| `error` | `#9C4A3C` | A value outside its band. Dulled on purpose. |

**The one rule that matters:** signal red belongs to the waveform and the
mark. The moment it appears on a heading or a box, the eye stops going
straight to the evidence and the system stops working. If a slide needs
emphasis, use weight, scale or space — not red.

No gradients. No shadows. No glass. No dark slides except the title, if you
want one inversion for impact.

## Type

Two families, two jobs, no exceptions.

**Newsreader** (serif) — the human voice. Every headline and every sentence
written to be read.

**DM Mono** — the instrument. Every number, unit, label, feature name, hex
address and state word. Monospaced digits don't shift as values change,
which is most of what makes this feel like a measuring device.

| Role | Family | Size | Weight |
|---|---|---|---|
| Slide headline | Newsreader | 44–54 | SemiBold |
| Deck title | Newsreader | 64–72 | SemiBold |
| Body | Newsreader | 20–24 | Regular |
| Big figure | DM Mono | 72–96 | Medium |
| Data row | DM Mono | 16–18 | Regular |
| Label | DM Mono | 12–13, uppercase, +8 tracking | Regular. Always `muted`. |

Never set a long sentence in mono. Never set a number in the serif.
Uppercase tracked mono labels above sections carry most of the instrument
feel — use them consistently.

## Layout

- 16:9. Generous margins, roughly 8% a side.
- One idea per slide. If a slide needs two headlines, it's two slides.
- Left-align everything except the title and the closing slide.
- Big figures get their own space with an uppercase mono label beneath.
- Waveforms are drawn in a rectangular panel on `paper` with a 2px `rule`
  border and faint vertical gridlines. Radius 0 — an instrument window is
  rectangular, never rounded.

## Motion

None. If the deck is presented live, no builds, no transitions beyond a cut.
A measuring instrument shows the reading; it doesn't perform the reading.

## Using the logo

Upload these alongside this document and tell the tool, in these words:

> Use `lode-lockup-horizontal.png` as the logo. Place it bottom-left on
> every slide at roughly 110px wide, in the margin, never over content. On
> the title slide use `lode-icon.png` large and centred instead. Do not
> recolour, outline, rotate or add effects to either.

| File | Where it goes |
|---|---|
| `lode-lockup-horizontal.png` | Footer on every content slide |
| `lode-lockup-stacked.png` | Alternative for the closing slide |
| `lode-icon.png` | Title slide — paper mark on an ink tile |
| `lode-mark.png` | The waveform alone, for decorative use |

SVG versions of the lockups and the mark are included for any tool that
accepts them; they scale without softening.

A word of warning worth passing to the tool: the mark is two footfall
impulses, and the second is deliberately smaller than the first. If a
rendering ever makes them look equal, or flips the order, the mark has lost
its meaning — human gait repeats approximately, never exactly, and that
asymmetry is the entire idea.

## Assets in the repo

`brand/mark.svg` · `brand/lockup-horizontal.svg` · `brand/lockup-stacked.svg`
· `brand/icon.svg`

The mark is two footfall impulses, the second at 82% of the first, generated
from a damped-sine function rather than drawn. The asymmetry is the whole
meaning: human gait repeats approximately, never exactly. If a rendering
ever makes the two impulses look equal, it has lost the point.
