import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, font } from '../../src/theme/tokens';

/** Labels are uppercase mono and tracked, like every other label in the app. */
function TabLabel({ children, focused }: { children: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: focused ? font.monoMedium : font.mono,
        fontSize: 11,
        letterSpacing: 1.4,
        color: focused ? color.ink : color.muted,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

export default function TabsLayout() {
  /**
   * The bar has to sit above the system gesture area, not under it.
   *
   * A fixed height with fixed padding put the labels directly on the
   * gesture bar on a tall phone, which reads as the app running off the
   * bottom of the screen. The inset varies by device, so it has to be
   * measured rather than guessed.
   */
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // No icons: the app speaks in mono labels, not glyphs.
        tabBarIcon: () => null,
        tabBarStyle: {
          backgroundColor: color.raised,
          borderTopColor: color.rule,
          borderTopWidth: 2,
          height: 60 + insets.bottom,
          paddingTop: 14,
          paddingBottom: insets.bottom + 12,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        sceneStyle: { backgroundColor: color.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Session</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="verify"
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Verify</TabLabel>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>History</TabLabel>,
        }}
      />
    </Tabs>
  );
}
