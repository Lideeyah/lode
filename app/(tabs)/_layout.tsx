import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { color, font, space } from '../../src/theme/tokens';

/** Labels are uppercase mono and tracked, like every other label in the app. */
function TabLabel({ children, focused }: { children: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: font.mono,
        fontSize: 11,
        letterSpacing: 1.2,
        color: focused ? color.ink : color.muted,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

export default function TabsLayout() {
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
          height: 64,
          paddingTop: space.sm,
          paddingBottom: space.sm,
        },
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
