/**
 * First run. Three cards, swipeable, skippable, then connect.
 *
 * A judge installs this cold with no context and it has about eight seconds
 * to land, so this copy is doing the job a landing page would do.
 */
import { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWallet } from '../src/wallet/useWallet';
import { PrimaryButton, Label } from '../src/components/primitives';
import { TracePanel } from '../src/components/TracePanel';
import { setOnboarded } from '../src/storage';
import { color, space, radius, stroke, type as t } from '../src/theme/tokens';

/** Two footfall impulses, the second slightly smaller. The mark, as a curve. */
function impulseTrace(points = 80): number[] {
  const amps = [1.0, 0.82];
  return Array.from({ length: points }, (_, i) => {
    const time = (i / (points - 1)) * 2.0;
    let v = 0;
    for (let k = 0; k < amps.length; k++) {
      const dt = time - (k * 1.0 + 0.12);
      if (dt >= 0 && dt < 0.85) v += amps[k] * Math.exp(-4.2 * dt) * Math.sin(7.4 * dt);
    }
    return v;
  });
}

/** A clean sine: what a shaken phone looks like. Too regular to be a person. */
const machineTrace = (points = 80) =>
  Array.from({ length: points }, (_, i) => Math.sin((i / points) * Math.PI * 6));

const CARDS = [
  {
    label: 'What this is',
    title: 'Mining, where the scarce input is you.',
    body: 'Most mining spends electricity. Lode spends effort. Your phone searches for a solution only while it can verify that a real person is walking — and the longer you keep walking, the harder it is allowed to search.',
    trace: impulseTrace(),
  },
  {
    label: 'How it verifies',
    title: 'It reads your gait, not your steps.',
    body: 'A step counter is fooled by shaking. Lode reads six signatures of human movement fifty times a second, including the way a stride repeats approximately rather than exactly, and the coupling between rotation and vertical motion that only a walking body produces. You can watch all six, live, on the Verification tab.',
    trace: machineTrace(),
  },
  {
    label: 'What you earn',
    title: 'The chain checks the work.',
    body: 'When a session ends you sign a claim and submit the best solution you found. The program recomputes the hash itself, counts the leading zero bits, and mints only if the work holds up. Nothing is taken on trust.',
    trace: impulseTrace(),
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { connect } = useWallet();
  const [page, setPage] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const scroller = useRef<ScrollView>(null);

  /**
   * Drives the pager from state as well as from the scroll position.
   * react-native-web never fires onMomentumScrollEnd, so relying on it
   * alone leaves the page index stuck at zero and the button dead.
   */
  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(CARDS.length - 1, i));
    setPage(next);
    scroller.current?.scrollTo({ x: width * next, animated: true });
  };

  const finish = async () => {
    await setOnboarded();
    router.replace('/(tabs)');
  };

  const onConnect = async () => {
    setConnecting(true);
    try {
      await connect();
      await finish();
    } catch (e) {
      Alert.alert(
        'Could not connect',
        'Check that your wallet is installed, unlocked, and switched to devnet — most wallets refuse a devnet app until Testnet Mode is enabled. In Phantom: Settings → Developer Settings → Testnet Mode → Solana Devnet.',
      );
    } finally {
      setConnecting(false);
    }
  };

  const last = page === CARDS.length - 1;
  const cardWidth = width - space.base * 2;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={finish} hitSlop={16} accessibilityRole="button">
          <Label>Skip</Label>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== page) setPage(i);
        }}
        style={styles.pager}
        contentContainerStyle={{ alignItems: 'stretch' }}
      >
        {CARDS.map((c) => (
          <View key={c.title} style={[styles.card, { width }]}>
            <View style={{ gap: space.lg }}>
              <Label>{c.label}</Label>
              <Text style={styles.title}>{c.title}</Text>
              <TracePanel values={c.trace} width={cardWidth} height={110} />
              <Text style={styles.body}>{c.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {CARDS.map((c, i) => (
            <View
              key={c.title}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        {last ? (
          <>
            {/* Shown before the attempt, not after it fails. Most wallets
                default to mainnet and will simply refuse a devnet app,
                which looks like the app is broken rather than like a
                setting that needs changing. */}
            <View style={styles.notice}>
              <Label>Set your wallet to devnet first</Label>
              <Text style={styles.noticeBody}>
                Lode runs on Solana devnet. Most wallets default to mainnet and
                will refuse to connect until you switch.
              </Text>
              <Text style={styles.noticeBody}>
                In Phantom: Settings → Developer Settings → turn on Testnet
                Mode, then choose Solana Devnet. Solflare is similar.
              </Text>
            </View>
            <PrimaryButton
              label={connecting ? 'Connecting…' : 'Connect wallet'}
              onPress={onConnect}
              disabled={connecting}
            />
          </>
        ) : (
          <PrimaryButton label="Next" onPress={() => goTo(page + 1)} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  topBar: { alignItems: 'flex-end', paddingHorizontal: space.base, paddingVertical: space.sm },
  pager: { flex: 1 },
  card: { paddingHorizontal: space.base, justifyContent: 'center' },
  title: { ...t.screenTitle, color: color.ink },
  body: { ...t.body, color: color.muted },
  footer: { padding: space.base, gap: space.lg },
  dots: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.rule },
  dotActive: { backgroundColor: color.ink },
  notice: {
    backgroundColor: color.raised,
    borderColor: color.rule,
    borderWidth: stroke.border,
    borderRadius: radius.card,
    padding: space.base,
    gap: space.sm,
  },
  noticeBody: { ...t.body, fontSize: 15, lineHeight: 22, color: color.muted },
});
