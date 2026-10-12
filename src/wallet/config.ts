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
 * Shown in the wallet's authorisation sheet.
 *
 * No `icon`: it is resolved as a path relative to `uri`, so 'favicon.png'
 * asked the wallet to fetch https://github.com/favicon.png, which 404s.
 * A wallet that validates the icon during authorization fails the whole
 * request over it. The field is optional, and a name and a reachable URI
 * are enough.
 */
export const APP_IDENTITY = {
  name: 'Lode',
  uri: 'https://github.com/Lideeyah/lode',
};
