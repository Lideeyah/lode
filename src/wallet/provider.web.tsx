import '../wallet/polyfills';
import type { ReactNode } from 'react';

/**
 * No provider needed on web: useWallet.web.ts owns its own connection and
 * keypair, so there is no adapter context to establish.
 */
export function LodeWalletProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
