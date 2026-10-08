/**
 * Feature row. The single most persuasive component in the app, so it gets
 * more attention than its size suggests.
 *
 * Name left, value right, and a bar showing where that value sits inside
 * its accepted band. Fill is credit when inside the band and muted when
 * outside; the band edges carry rule ticks.
 */
import { View, Text, StyleSheet } from 'react-native';
import { color, space, stroke, type as t } from '../theme/tokens';
import { FEATURE_LABELS, FEATURE_UNITS } from '../sensing/types';
import type { FeatureScore } from '../sensing/confidence';

const BAR_HEIGHT = 6;
/** Fraction of the bar's width given over to out-of-band margin, each side. */
const MARGIN = 0.18;

function formatValue(score: FeatureScore): string {
  const v = score.value;
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  if (abs >= 1) return v.toFixed(2);
  return v.toFixed(3);
}

export function FeatureRow({ score }: { score: FeatureScore }) {
  const unit = FEATURE_UNITS[score.key];

  // The band occupies the middle of the bar, with margin either side so an
  // out-of-band value has somewhere to be drawn rather than clamping to the
  // edge and looking identical to a value that is merely at the limit.
  const bandStart = MARGIN;
  const bandWidth = 1 - MARGIN * 2;

  let marker: number;
  if (score.inBand) {
    marker = bandStart + score.position * bandWidth;
  } else {
    const band = score.band;
    const span = Math.max(band.max - band.min, 1e-9);
    if (score.value < band.min) {
      const overshoot = Math.min(1, (band.min - score.value) / Math.max(band.softness, span * 0.5));
      marker = bandStart * (1 - overshoot);
    } else {
      const overshoot = Math.min(1, (score.value - band.max) / Math.max(band.softness, span * 0.5));
      marker = bandStart + bandWidth + MARGIN * overshoot;
    }
  }
  marker = Math.min(1, Math.max(0, marker));

  const fill = score.inBand ? color.credit : color.muted;

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={[t.dataRow, { color: color.ink }]}>{FEATURE_LABELS[score.key]}</Text>
        <Text style={[t.dataRow, { color: score.inBand ? color.creditText : color.muted }]}>
          {formatValue(score)}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>

      <View style={styles.track}>
        {/* The accepted band. */}
        <View
          style={[
            styles.band,
            { left: `${bandStart * 100}%`, width: `${bandWidth * 100}%` },
          ]}
        />
        {/* Band edges. */}
        <View style={[styles.tick, { left: `${bandStart * 100}%` }]} />
        <View style={[styles.tick, { left: `${(bandStart + bandWidth) * 100}%` }]} />
        {/* Where this value actually sits. */}
        <View style={[styles.marker, { left: `${marker * 100}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: {
    height: BAR_HEIGHT,
    backgroundColor: color.paper,
    borderColor: color.rule,
    borderWidth: stroke.hairline,
    justifyContent: 'center',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: color.rule,
    opacity: 0.55,
  },
  tick: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: stroke.hairline,
    backgroundColor: color.rule,
  },
  marker: {
    position: 'absolute',
    width: 3,
    top: -4,
    bottom: -4,
    marginLeft: -1.5,
  },
});
