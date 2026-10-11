/**
 * The instrument window. Rectangular, recessed onto paper even inside a
 * raised card, with the waveform in signal red.
 *
 * Newest sample at the right edge, scrolling left at a constant rate. It
 * never pauses and never eases, because the sensor never stops.
 *
 * Three things keep it still enough to read:
 *
 *  - Sample spacing is fixed against the buffer's capacity, not divided
 *    across however many samples have arrived. Dividing by the current
 *    length makes the whole waveform stretch and squeeze as the buffer
 *    fills, which reads as the trace writhing rather than scrolling.
 *
 *  - The vertical scale is supplied by the caller for live data. Deriving
 *    it from each frame's own min and max means one new peak rescales
 *    everything drawn, so the entire trace jumps every time the signal
 *    changes. Autoscaling is kept only for static illustrations, where
 *    there is no next frame to be inconsistent with.
 *
 *  - In live mode the panel polls its own source and holds its own state,
 *    so the waveform advances smoothly without re-rendering the screen
 *    around it once per sample.
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { color, space, stroke, type as t } from '../theme/tokens';

const GRIDLINES = 5;

/** How often the live trace redraws. ~16fps reads as motion, not steps. */
const FRAME_MS = 60;

export type TraceRange = { min: number; max: number };

type Props = {
  /** Static values. Ignored when `source` is given. */
  values?: number[];
  /** Live feed, polled internally so the parent does not re-render. */
  source?: () => number[];
  /** Points the x-axis is laid out against. Fixes the sample spacing. */
  capacity?: number;
  /** Fixed vertical range. Omit only for static illustrations. */
  range?: TraceRange;
  /**
   * Where a partially filled buffer sits. Live data is right-aligned so
   * the newest sample holds the right edge and older samples scroll off
   * to the left. The reward reveal is left-aligned so the trace draws
   * itself across the panel from left to right.
   */
  align?: 'left' | 'right';
  height?: number;
  width: number;
  idleMessage?: string;
};

export function TracePanel({
  values,
  source,
  capacity,
  range,
  align = 'right',
  height = 140,
  width,
  idleMessage,
}: Props) {
  const [live, setLive] = useState<number[]>([]);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!source) return;
    const id = setInterval(() => setLive(sourceRef.current?.() ?? []), FRAME_MS);
    return () => clearInterval(id);
  }, [source]);

  const data = source ? live : (values ?? []);
  const w = Math.max(1, width);
  const hasSignal = data.length >= 2;

  // Lay out against capacity so spacing never changes as the buffer fills.
  const slots = Math.max(capacity ?? data.length, 2);
  const step = w / (slots - 1);

  let lo: number;
  let hi: number;
  if (range) {
    lo = range.min;
    hi = range.max;
  } else {
    lo = hasSignal ? Math.min(...data) : 0;
    hi = hasSignal ? Math.max(...data) : 1;
  }
  const span = Math.max(hi - lo, 1e-6);

  const plot = (v: number, i: number) => {
    const x = align === 'right' ? w - (data.length - 1 - i) * step : i * step;
    const clamped = Math.min(1, Math.max(0, (v - lo) / span));
    const y = height - clamped * (height * 0.78) - height * 0.11;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const path = hasSignal
    ? data.map((v, i) => `${i === 0 ? 'M' : 'L'}${plot(v, i)}`).join(' ')
    : '';

  return (
    <View style={[styles.panel, { height }]}>
      <Svg width={w} height={height}>
        <Rect x={0} y={0} width={w} height={height} fill={color.paper} />
        {Array.from({ length: GRIDLINES }, (_, i) => {
          const x = ((i + 1) / (GRIDLINES + 1)) * w;
          return (
            <Line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={height}
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
            y1={height / 2}
            x2={w}
            y2={height / 2}
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
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  idle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
