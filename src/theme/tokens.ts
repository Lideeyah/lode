/**
 * Lode design tokens. System of record: lode-design-system-08-oct.md.
 *
 * Two rules this file cannot enforce, so enforce them in review:
 *  - `signal` belongs to the waveform trace and the logo mark. Never a
 *    button, heading or state. The eye must go straight to the evidence.
 *  - `action` carries no meaning. Not good, not confirmed, not safe. It
 *    means "this is the thing you press".
 */

export const color = {
  // Surfaces and text
  paper: '#F2EEE4',
  raised: '#FBF9F4',
  ink: '#1C1A17',
  muted: '#6B655C',
  rule: '#DAD3C5',

  // Accents
  signal: '#D6442A',
  signalText: '#B8341C',
  action: '#2B4A8B',
  credit: '#6B7A3F',
  creditText: '#5A6733',
  warning: '#B08440',
  warningText: '#7E5A20',
  error: '#9C4A3C',

  onAction: '#FFFFFF',
} as const;

/** Points. 16 is the default screen gutter, 24 between major blocks. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  button: 14,
  card: 16,
  tile: 28,
  /** An instrument window is rectangular. */
  panel: 0,
} as const;

export const stroke = {
  hairline: 1,
  border: 2,
  trace: 3,
} as const;

/** Floor for anything tappable, whatever its visual size. */
export const MIN_TOUCH = 48;

export const font = {
  /** The human voice: headings, prose, the wordmark. */
  serif: 'Newsreader_600SemiBold',
  serifRegular: 'Newsreader_400Regular',
  /** The instrument: every number, label, unit, state word. */
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

/**
 * Never set a long sentence in mono and never set a number in the serif.
 */
export const type = {
  heroReadout: { fontFamily: font.monoMedium, fontSize: 80 },
  displayNumber: { fontFamily: font.monoMedium, fontSize: 34 },
  screenTitle: { fontFamily: font.serif, fontSize: 30 },
  sectionHeading: { fontFamily: font.serif, fontSize: 21 },
  body: { fontFamily: font.serifRegular, fontSize: 17, lineHeight: 25 },
  dataRow: { fontFamily: font.mono, fontSize: 15 },
  label: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: color.muted,
  },
  button: {
    fontFamily: font.monoMedium,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
} as const;
