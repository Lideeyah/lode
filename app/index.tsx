import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, type as t } from '../src/theme/tokens';

/**
 * Placeholder home. Exists so the first native build is verifiable end to
 * end: fonts resolve, tokens apply, router mounts. The real surfaces land
 * on top of this.
 */
export default function Home() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.block}>
        <Text style={t.label}>Instrument</Text>
        <Text style={styles.title}>Lode</Text>
        <Text style={styles.body}>
          Mining where the scarce input is physical effort rather than
          electricity.
        </Text>
      </View>
      <View style={styles.block}>
        <Text style={t.label}>Build</Text>
        <Text style={styles.readout}>0.1.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.paper,
    paddingHorizontal: space.base,
    justifyContent: 'center',
    gap: space.xxl,
  },
  block: { gap: space.sm },
  title: { ...t.screenTitle, color: color.ink },
  body: { ...t.body, color: color.muted },
  readout: { ...t.displayNumber, color: color.ink },
});
