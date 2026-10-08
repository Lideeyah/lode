import '../wallet/polyfills';
import type { ReactNode } from 'react';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { APP_IDENTITY, CHAIN, RPC_ENDPOINT } from './config';

export function LodeWalletProvider({ children }: { children: ReactNode }) {
  return (
    <MobileWalletProvider
      chain={CHAIN}
      endpoint={RPC_ENDPOINT}
      identity={APP_IDENTITY}
      commitmentOrConfig="confirmed"
    >
      {children}
    </MobileWalletProvider>
  );
}
