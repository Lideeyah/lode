import Constants from 'expo-constants';

type Extra = { solanaCluster?: string; solanaRpcEndpoint?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const CLUSTER = (extra.solanaCluster ?? 'devnet') as 'devnet' | 'mainnet-beta';
/**
 * EXPO_PUBLIC_RPC_ENDPOINT wins when set, so a keyed provider can be
 * supplied from .env.local without the endpoint living in app.json.
 * Solana's public devnet RPC rate-limits an active session into
 * uselessness, so a demo or a judge's run wants a real provider.
 */
export const RPC_ENDPOINT =
  process.env.EXPO_PUBLIC_RPC_ENDPOINT ||
  extra.solanaRpcEndpoint ||
  'https://api.devnet.solana.com';
export const CHAIN = `solana:${CLUSTER}` as const;

/**
 * Shown in the wallet's authorisation sheet, and verified against it.
 *
 * Mobile Wallet Adapter checks the identity by resolving the *origin* of
 * this URI and reading its Digital Asset Links file, which must name this
 * app's Android package and signing certificate. Pointing at
 * github.com/Lideeyah/lode meant wallets looked for
 * https://github.com/.well-known/assetlinks.json — GitHub's own, which
 * says nothing about us. Phantom therefore displayed "github.com" as the
 * app name and warned that it could not verify the identity and might be
 * impersonating another app.
 *
 * https://lideeyah.github.io publishes the association:
 *   package  com.lideeyah.lode
 *   sha256   16:8B:15:5C:9F:AD:69:F4:D8:24:79:5E:CE:EE:07:4A:
 *            DF:9F:BE:D7:9C:C9:A9:A0:17:AB:73:38:E0:C8:81:F6
 *
 * The fingerprint is the EAS-managed upload certificate. If the signing
 * key is ever rotated, that file has to be updated with it or every
 * wallet will show the warning again.
 *
 * No `icon`: it resolves relative to `uri`, and a 404 there fails the
 * whole authorization on wallets that validate it.
 */
export const APP_IDENTITY = {
  name: 'Lode',
  uri: 'https://lideeyah.github.io',
};
