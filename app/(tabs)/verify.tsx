/**
 * Verification. A real tab, not a debug drawer.
 *
 * This is the answer to the only hard question anyone asks about this
 * product, which is how you stop someone shaking the phone. Film it.
 */
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Readout, Label, Card, StatePill, Divider } from '../../src/components/primitives';
import { FeatureRow } from '../../src/components/FeatureRow';
import { useSessionContext } from '../../src/session/context';
import { STATE_LABELS } from '../../src/session/machine';
import { CONFIDENCE_THRESHOLD } from '../../src/sensing/bands';
import { color, space, type as t } from '../../src/theme/tokens';

export default function VerifyScreen() {
  const { width } = useWindowDimensions();
  const { confidence, snapshot, running } = useSessionContext();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: space.xs }}>
          <Label>Verification</Label>
          <Text style={styles.title}>What the instrument sees</Text>
        </View>

        {!running ? (
          <Card>
            <Label>No session running</Label>
            <Text style={styles.body}>
              Start a session to watch the six signals update once a second. Shake the
              phone instead of walking and watch them fall out of their bands.
            </Text>
          </Card>
        ) : null}

        {confidence ? (
          <>
            <View style={styles.headerRow}>
              <StatePill state={snapshot.state} label={STATE_LABELS[snapshot.state]} />
              <Text style={[t.dataRow, { color: color.muted }]}>
                threshold {Math.round(CONFIDENCE_THRESHOLD * 100)}
              </Text>
            </View>

            <Readout
              value={String(Math.round(confidence.score * 100))}
              label="Combined confidence"
              size={64}
            />

            <Divider />

            <View style={{ gap: space.xs }}>
              {confidence.features.map((f) => (
                <FeatureRow key={f.key} score={f} />
              ))}
            </View>

            <Divider />

            <Text style={styles.body}>{confidence.explanation}</Text>

            <Card>
              <Label>What the chain can and cannot check</Label>
              <Text style={styles.body}>
                The program recomputes the hash and verifies the signature. It cannot
                verify this classification, because on-chain verification of sensor
                data is not possible. The classifier runs here, on the device, and the
                program trusts it. Hardware attestation is the next step that would
                close that gap.
              </Text>
            </Card>
          </>
        ) : running ? (
          <Text style={[t.dataRow, { color: color.muted }]}>
            Waiting for the first window…
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.base, gap: space.lg, paddingBottom: space.xxl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...t.screenTitle, color: color.ink },
  body: { ...t.body, color: color.muted },
});
