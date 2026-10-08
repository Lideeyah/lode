import Constants from 'expo-constants';

type Extra = { solanaCluster?: string; solanaRpcEndpoint?: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const CLUSTER = (extra.solanaCluster ?? 'devnet') as 'devnet' | 'mainnet-beta';
export const RPC_ENDPOINT = extra.solanaRpcEndpoint ?? 'https://api.devnet.solana.com';
export const CHAIN = `solana:${CLUSTER}` as const;

/**
 * Shown in the wallet's authorisation sheet. The URI must be reachable and
 * must match the app, or some wallets refuse the request outright.
 */
export const APP_IDENTITY = {
  name: 'Lode',
  uri: 'https://github.com/Lideeyah/lode',
  icon: 'favicon.png',
};
