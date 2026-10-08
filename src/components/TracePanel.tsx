/**
 * The instrument window. Rectangular, recessed onto paper even inside a
 * raised card, with the waveform in signal red.
 *
 * Newest sample at the right edge, scrolling left at a constant rate. It
 * never pauses and never eases, because the sensor never stops.
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { color, space, stroke, type as t } from '../theme/tokens';

const GRIDLINES = 5;

export function TracePanel({
  values,
  height = 140,
  width,
  idleMessage,
}: {
  /** Newest last. Any numeric range; scaled to fit. */
  values: number[];
  height?: number;
  width: number;
  /** Shown instead of a waveform when there is nothing to draw. */
  idleMessage?: string;
}) {
  const inner = { w: Math.max(1, width), h: height };
  const hasSignal = values.length >= 2;

  // Scale to the observed range rather than a fixed one, so a quiet signal
  // is still legible instead of a flat line at the bottom.
  const min = hasSignal ? Math.min(...values) : 0;
  const max = hasSignal ? Math.max(...values) : 1;
  const span = Math.max(max - min, 1e-6);

  const path = hasSignal
    ? values
        .map((v, i) => {
          const x = (i / (values.length - 1)) * inner.w;
          const y = inner.h - ((v - min) / span) * (inner.h * 0.78) - inner.h * 0.11;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ')
    : '';

  return (
    <View style={[styles.panel, { height }]}>
      <Svg width={inner.w} height={inner.h}>
        <Rect x={0} y={0} width={inner.w} height={inner.h} fill={color.paper} />
        {Array.from({ length: GRIDLINES }, (_, i) => {
          const x = ((i + 1) / (GRIDLINES + 1)) * inner.w;
          return (
            <Line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={inner.h}
              stroke={color.rule}
              strokeWidth={stroke.hairline}
            />
          );
        })}
        {hasSignal ? (
          <Path
            d={path}
            stroke={color.signal}
            strokeWidth={stroke.trace}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <Line
            x1={0}
            y1={inner.h / 2}
            x2={inner.w}
            y2={inner.h / 2}
            stroke={color.signal}
            strokeWidth={stroke.trace}
            strokeLinecap="round"
          />
        )}
      </Svg>
      {!hasSignal && idleMessage ? (
        <View style={styles.idle} pointerEvents="none">
          <Text style={t.label}>{idleMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** 24pt sparkline for a history row. Stops the list reading as a spreadsheet. */
export function Sparkline({
  values,
  width = 56,
  height = 24,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * (height * 0.8) - height * 0.1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Path
        d={d}
        stroke={color.signal}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: color.paper,
    borderColor: color.rule,
    borderWidth: stroke.border,
    // An instrument window is rectangular.
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  idle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
