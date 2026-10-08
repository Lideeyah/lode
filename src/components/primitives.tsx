/**
 * Design system primitives. See lode-design-system-08-oct.md.
 *
 * Two rules to hold on every screen:
 *   signal red belongs to the trace and the mark, nothing else;
 *   numbers never animate.
 */
import type { ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { color, space, radius, stroke, type as t, MIN_TOUCH } from '../theme/tokens';

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Text style={[t.label, style as never]}>{children}</Text>;
}

/**
 * A large mono number with a label beneath. No count-up, ever: a measuring
 * device shows the reading, it does not perform the reading.
 */
export function Readout({
  value,
  label,
  tone = color.ink,
  size = 80,
}: {
  value: string;
  label: string;
  tone?: string;
  size?: number;
}) {
  return (
    <View style={{ alignItems: 'center', gap: space.xs }}>
      <Text style={[t.heroReadout, { fontSize: size, color: tone }]}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

export function StatPair({
  items,
}: {
  items: { label: string; value: string; tone?: string }[];
}) {
  return (
    <View style={styles.statRow}>
      {items.map((it) => (
        <View key={it.label} style={styles.statCell}>
          <Label>{it.label}</Label>
          <Text style={[t.displayNumber, { color: it.tone ?? color.ink }]}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** One per screen. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[t.button, { color: color.onAction }]}>{label}</Text>
    </Pressable>
  );
}

/** Stop, cancel, and anything destructive. Ending a session is secondary. */
export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[t.button, { color: color.ink }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * State is always carried by the word as well as the colour, because the
 * accent colours are deliberately low chroma and must never signal alone.
 */
export function StatePill({ state, label }: { state: string; label: string }) {
  const tone =
    state === 'active'
      ? color.creditText
      : state === 'decaying'
        ? color.warningText
        : state === 'rejected' || state === 'ended'
          ? color.error
          : color.muted;

  return (
    <View style={[styles.pill, { borderColor: tone }]}>
      <Text style={[t.label, { color: tone }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: space.lg },
  statCell: { flex: 1, gap: space.xs },
  card: {
    backgroundColor: color.raised,
    borderColor: color.rule,
    borderWidth: stroke.border,
    borderRadius: radius.card,
    padding: space.base,
    gap: space.md,
  },
  primary: {
    backgroundColor: color.action,
    borderRadius: radius.button,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: color.rule,
    borderWidth: stroke.border,
    borderRadius: radius.button,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: stroke.hairline,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  divider: { height: stroke.hairline, backgroundColor: color.rule },
});
