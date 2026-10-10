/**
 * Wallet access point. Native builds go straight to Mobile Wallet Adapter;
 * the web build substitutes useWallet.web.ts.
 */
export { useMobileWallet as useWallet } from '@wallet-ui/react-native-web3js';
