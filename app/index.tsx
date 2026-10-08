/** Entry gate: straight past onboarding once it has been seen. */
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { isOnboarded } from '../src/storage';
import { color } from '../src/theme/tokens';

export default function Index() {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    isOnboarded().then(setSeen).catch(() => setSeen(false));
  }, []);

  // No spinner: if data is loading, say so in mono or show nothing.
  if (seen === null) return <View style={{ flex: 1, backgroundColor: color.paper }} />;
  return <Redirect href={seen ? '/(tabs)' : '/onboarding'} />;
}
