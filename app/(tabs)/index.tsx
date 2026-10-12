/**
 * Session screen. At rest it is home; running, it is the screen the demo
 * lives on.
 *
 * The hero confidence figure updates once a second and simply changes. No
 * tween, no easing, no counting up.
 */
import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWallet } from '../../src/wallet/useWallet';
import {
  PrimaryButton,
  SecondaryButton,
  Readout,
  StatPair,
  Label,
  Card,
  StatePill,
} from '../../src/components/primitives';
import { TracePanel } from '../../src/components/TracePanel';
import { useSessionContext } from '../../src/session/context';
import { TRACE_POINTS, TRACE_RANGE } from '../../src/session/useSession';
import { useChain } from '../../src/chain/context';
import { STATE_LABELS } from '../../src/session/machine';
import { WARMING_WINDOWS } from '../../src/sensing/bands';
import { color, space, type as t } from '../../src/theme/tokens';

const two = (n: number) => String(n).padStart(2, '0');

function duration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${two(m)}:${two(s)}`;
}

export default function SessionScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { account, connect } = useWallet();
  const { adapter, authority, balances, challenge, programReady, loading, refresh } = useChain();
  const [airdropping, setAirdropping] = useState(false);
  const session = useSessionContext();

  const { snapshot, confidence, budget, best, running, readTrace } = session;
  const panelWidth = width - space.base * 2;

  const confidenceText = useMemo(
    () => (confidence ? String(Math.round(confidence.score * 100)) : '—'),
    [confidence],
  );

  const start = async () => {
    if (!account) {
      try {
        await connect();
      } catch {
        Alert.alert('Wallet needed', 'Connect a wallet before starting a session.');
        return;
      }
    }
    // No modal when the program is unreachable: the card above already
    // says so, a session still records real effort, and react-native-web
    // does not implement Alert — which silently dead-ended the button.
    await session.start();
  };

  /**
   * Devnet faucets rate-limit constantly, so this reports plainly rather
   * than retrying. Submitting costs a fee, and a wallet with no SOL fails
   * at the last step of the demo.
   */
  const airdrop = async () => {
    if (!adapter || !authority) return;
    setAirdropping(true);
    try {
      const sig = await adapter.requestAirdrop(authority, 1);
      if (!sig) {
        Alert.alert(
          'Faucet declined',
          'The devnet faucet is rate-limiting. Try again shortly, or fund this address from faucet.solana.com.',
        );
      } else {
        await adapter.confirm(sig);
        await refresh();
      }
    } finally {
      setAirdropping(false);
    }
  };

  const end = () => {
    session.stop();
    router.push('/summary');
  };

  if (!running) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={color.muted} />
          }
        >
          <View style={{ gap: space.xs }}>
            <Label>Instrument</Label>
            <Text style={styles.title}>Lode</Text>
          </View>

          {/* The empty state is the second thing a judge sees, so it is
              designed rather than left blank. */}
          <TracePanel values={[]} width={panelWidth} height={140} idleMessage="Instrument idle" />

          <StatPair
            items={[
              { label: 'Lode balance', value: balances.lode.toFixed(2) },
              { label: 'Devnet SOL', value: balances.sol.toFixed(3) },
            ]}
          />

          {!account ? (
            <Card>
              <Label>Not connected</Label>
              <Text style={styles.body}>
                Connect a wallet to record effort and submit work.
              </Text>
            </Card>
          ) : null}

          {account && balances.sol < 0.01 ? (
            <Card>
              <Label>No devnet SOL</Label>
              <Text style={styles.body}>
                Submitting a solution costs a transaction fee. Fund this wallet
                before ending a session.
              </Text>
              <SecondaryButton
                label={airdropping ? 'Requesting…' : 'Request 1 devnet SOL'}
                onPress={airdrop}
                disabled={airdropping}
              />
            </Card>
          ) : null}

          {!programReady ? (
            <Card>
              <Label>Program not reachable</Label>
              <Text style={styles.body}>
                Sessions run and record effort locally, but nothing can be submitted
                until the Lode program is deployed to devnet.
              </Text>
            </Card>
          ) : null}

          <PrimaryButton label="Start session" onPress={start} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const warming = snapshot.state === 'warming';

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <StatePill state={snapshot.state} label={STATE_LABELS[snapshot.state]} />
          <Text style={[t.dataRow, { color: color.muted }]}>
            {duration(snapshot.elapsedSeconds)}
          </Text>
        </View>

        <Readout value={confidenceText} label="Confidence" />

        <TracePanel
          source={readTrace}
          capacity={TRACE_POINTS}
          range={TRACE_RANGE}
          width={panelWidth}
          height={140}
        />

        {warming ? (
          <Card>
            <Label>Measuring, not yet crediting</Label>
            <Text style={styles.body}>
              {snapshot.warmingProgress} of {WARMING_WINDOWS} consecutive windows have
              met the threshold. Nothing accrues until the instrument is sure, which
              is what stops a burst of shaking paying out.
            </Text>
          </Card>
        ) : null}

        {/* Fixed height: the sentence changes once a second and its
            length varies, which shunted every figure below it. */}
        <View style={styles.explanation}>
          {confidence && !warming ? (
            <Text style={styles.body}>{confidence.explanation}</Text>
          ) : null}
        </View>

        <StatPair
          items={[
            { label: 'Effort', value: snapshot.effort.toFixed(1) },
            { label: 'Iteration budget', value: budget.toLocaleString() },
          ]}
        />

        <StatPair
          items={[
            { label: 'Best difficulty', value: best ? String(best.difficulty) : '—' },
            { label: 'Hashes', value: session.hashesThisSession.toLocaleString() },
          ]}
        />

        <View style={{ gap: space.sm }}>
          <Label>Sensor rate</Label>
          <Text style={[t.dataRow, { color: color.muted }]}>
            {session.measuredRate.toFixed(1)} Hz measured
            {challenge ? ` · challenge slot ${challenge.slot}` : ''}
          </Text>
        </View>

        {/* Ending a session is destructive, so it is secondary. */}
        <SecondaryButton label="End session" onPress={end} />
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
  explanation: { minHeight: 75, justifyContent: 'flex-start' },
});
